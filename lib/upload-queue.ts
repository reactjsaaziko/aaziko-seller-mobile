import AsyncStorage from '@react-native-async-storage/async-storage';

import { copyMeta } from '@/lib/image-meta';
import { getManufacturing, saveManufacturing, type ManufacturingData } from '@/lib/manufacturing';
import { uploadMedia } from '@/lib/media';

const KEY = 'upload_queue_v1';

export type StageKey = 'rawMaterial' | 'manufacturing' | 'packing' | 'documentation';

export type QueueItem = {
  id: string;
  orderId: string;
  stage: StageKey;
  localUri: string;
  name: string;
  type: string;
  createdAt: number;
};

export async function getQueue(): Promise<QueueItem[]> {
  try {
    const s = await AsyncStorage.getItem(KEY);
    return s ? (JSON.parse(s) as QueueItem[]) : [];
  } catch {
    return [];
  }
}

async function setQueue(q: QueueItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    // ignore
  }
}

export async function enqueue(item: QueueItem): Promise<void> {
  const q = await getQueue();
  q.push(item);
  await setQueue(q);
}

export async function removeFromQueue(id: string): Promise<void> {
  const q = await getQueue();
  await setQueue(q.filter((i) => i.id !== id));
}

export async function getQueueForOrder(orderId: string): Promise<QueueItem[]> {
  return (await getQueue()).filter((i) => i.orderId === orderId);
}

let processing = false;

// Why the last upload attempt stopped, so the UI can show the REAL reason
// instead of a permanent silent "waiting" (e.g. "session expired", "HTTP 500").
let lastError: string | null = null;
export function getUploadError(): string | null {
  return lastError;
}

export type ProcessResult = { uploaded: number; remaining: number; error: string | null };

/**
 * Upload every queued capture and merge it into its order's manufacturing
 * (get → append the new URL to the right stage → save). Stops at the first
 * failure and keeps the rest queued to retry later. Records WHY it stopped in
 * `lastError` so the screen can surface it. Safe to call repeatedly; guarded so
 * it never runs twice at once.
 */
export async function processQueue(): Promise<ProcessResult> {
  if (processing) return { uploaded: 0, remaining: (await getQueue()).length, error: lastError };
  processing = true;
  let uploaded = 0;
  try {
    const q = await getQueue();
    for (const item of q) {
      const up = await uploadMedia(item.localUri, item.name, item.type);
      if (!up.ok) {
        lastError = up.error || 'Upload failed.';
        console.warn('[upload-queue] upload failed:', lastError);
        break; // offline or server error → retry on the next trigger
      }

      const cur = await getManufacturing(item.orderId);
      if (!cur.ok) {
        lastError = cur.error || 'Could not load the order to save.';
        console.warn('[upload-queue] get manufacturing failed:', lastError);
        break;
      }

      // Carry the capture's date/time/location stamp over to the final URL so it
      // still shows after the photo comes back from the server on reload.
      await copyMeta(item.localUri, up.url);

      const data: ManufacturingData = { ...cur.data };
      data[item.stage] = [...data[item.stage], up.url];

      const saved = await saveManufacturing(item.orderId, data);
      if (!saved.ok) {
        lastError = saved.error || 'Could not save the photo to the order.';
        console.warn('[upload-queue] save manufacturing failed:', lastError);
        break;
      }

      await removeFromQueue(item.id);
      lastError = null;
      uploaded += 1;
      console.log('[upload-queue] uploaded OK:', item.stage, item.type, item.name);
    }
  } finally {
    processing = false;
  }
  return { uploaded, remaining: (await getQueue()).length, error: lastError };
}
