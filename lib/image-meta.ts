import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Per-image capture metadata (date/time + GPS location) shown as a stamp on the
 * manufacturing photos. Stored locally, keyed first by the camera's local file
 * URI (known at capture time) and then copied onto the uploaded media URL after
 * a successful upload, so the stamp survives an app reload when the photo comes
 * back from the server as a plain URL.
 */
export type ImageMeta = {
  at: number; // capture time (ms since epoch)
  place?: string; // reverse-geocoded "City, Region"
  lat?: number;
  lng?: number;
};

const KEY = 'image_meta_v1';

export async function getMetaMap(): Promise<Record<string, ImageMeta>> {
  try {
    const s = await AsyncStorage.getItem(KEY);
    return s ? (JSON.parse(s) as Record<string, ImageMeta>) : {};
  } catch {
    return {};
  }
}

async function saveMap(m: Record<string, ImageMeta>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    // ignore
  }
}

export async function setMeta(key: string, meta: ImageMeta): Promise<void> {
  if (!key) return;
  const m = await getMetaMap();
  m[key] = meta;
  await saveMap(m);
}

export async function getMeta(key: string): Promise<ImageMeta | undefined> {
  if (!key) return undefined;
  return (await getMetaMap())[key];
}

/** After upload: attach the local capture's metadata to its final media URL. */
export async function copyMeta(fromKey: string, toKey: string): Promise<void> {
  if (!fromKey || !toKey) return;
  const m = await getMetaMap();
  if (m[fromKey]) {
    m[toKey] = m[fromKey];
    await saveMap(m);
  }
}

/** Format a stamp like "25 Aug 2026 · 1:45 PM". */
export function formatWhen(at: number): string {
  try {
    const d = new Date(at);
    const date = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${date} · ${time}`;
  } catch {
    return '';
  }
}
