import { COMMON_BASE_URL } from '@/constants/api';
import { getAccessToken, refreshAccessToken } from '@/lib/auth';

export type UploadResult = { ok: true; url: string } | { ok: false; error: string; unauthorized?: boolean };

/**
 * Pull the stored file URL out of the media-library create response.
 *
 * The real (multipart file) upload path returns this exact shape — the URL is
 * nested THREE levels deep, not at `uploaded[0].url`:
 *   { success, data: { uploaded: [ { fileName, result: { success, data: { url, cdnUrl } } } ],
 *                      failed: [...], summary } }
 * (See medialibrary-service: mediaController.uploadMultipleWithCompression →
 *  mediaService.uploadMedia responseData.) The old parser read `uploaded[0].url`,
 *  which is undefined, so every successful upload looked like a failure and the
 *  offline queue retried it forever (stuck on "waiting" + duplicate uploads).
 *
 * Kept tolerant of the other shapes this service can return (existing-URL path,
 * single-object responses) so it survives a backend change.
 */
function extractUrl(json: any): string | null {
  const up = json?.data?.uploaded?.[0] || json?.uploaded?.[0] || json?.data?.[0];
  // The per-file result may be at up.result.data (file path), up.result (some
  // paths), up.data, or flattened onto up itself.
  const inner = up?.result?.data || up?.result || up?.data || up;
  return (
    inner?.url ||
    inner?.cdnUrl ||
    inner?.fileUrl ||
    inner?.location ||
    up?.url ||
    up?.cdnUrl ||
    json?.data?.url ||
    json?.data?.cdnUrl ||
    json?.url ||
    null
  );
}

function firstFailureMessage(json: any): string | null {
  const failed = json?.data?.failed;
  if (Array.isArray(failed) && failed.length) {
    const f = failed[0];
    // The content-validation reject shape is { fileName, error: 'content rejected: <reason>' };
    // the per-file upload-failure shape nests under result. Surface whichever exists.
    const msg = f?.error || f?.result?.message || f?.message || null;
    if (msg) {
      console.warn('[media] file rejected:', JSON.stringify(failed));
      return msg;
    }
  }
  return null;
}

// Images go to the general media-library create route (byte-content validated,
// accepts JPEG/PNG/WebP/GIF). VIDEOS must go to the dedicated video route: the
// create route's content validator has NO video signatures, so every mp4 there
// is rejected as "unrecognised file signature". The video route is multer
// `.single('file')` and validates by mime type, so it accepts video/mp4.
const IMAGE_ENDPOINT = `${COMMON_BASE_URL}/medialibrary-service/mediaLibrary/create`;
const VIDEO_ENDPOINT = `${COMMON_BASE_URL}/medialibrary-service/upload/video`;

async function postUpload(
  token: string,
  uri: string,
  name: string,
  mimeType: string,
): Promise<Response> {
  const isVideo = (mimeType || '').startsWith('video/');
  const form = new FormData();
  // Field name MUST match the route's multer config: 'file' (single) for video,
  // 'files' (array) for the image create route — otherwise the server sees no
  // file at all.
  form.append(isVideo ? 'file' : 'files', { uri, name, type: mimeType } as any);
  form.append('isPublic', 'true');
  if (!isVideo) form.append('allowDuplicates', 'true');

  const controller = new AbortController();
  // Videos are larger and get transcoded server-side — give them more time.
  const timeout = setTimeout(() => controller.abort(), isVideo ? 120000 : 60000);
  try {
    return await fetch(isVideo ? VIDEO_ENDPOINT : IMAGE_ENDPOINT, {
      method: 'POST',
      // NOTE: do not set Content-Type — RN adds the multipart boundary itself.
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      body: form,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Upload one photo/video to the media library and return its public URL.
 * Same endpoint the vendor website uses: POST /medialibrary-service/mediaLibrary/create
 * (multipart, field `files`). Refreshes the access token once on 401/403 so a
 * queued upload that runs after the token's 1h expiry recovers by itself.
 */
export async function uploadMedia(uri: string, name: string, mimeType: string): Promise<UploadResult> {
  let token = await getAccessToken();
  if (!token) return { ok: false, error: 'Please log in again.', unauthorized: true };

  try {
    let res = await postUpload(token, uri, name, mimeType);

    // Token expired mid-queue → refresh once and retry, like the orders/manufacturing calls.
    if (res.status === 401 || res.status === 403) {
      const fresh = await refreshAccessToken();
      if (fresh) {
        token = fresh;
        res = await postUpload(token, uri, name, mimeType);
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: 'Your session has expired. Please log in again.', unauthorized: true };
      }
    }

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // non-JSON
    }

    // The media service rejects a file whose name+size already exists for this
    // user as a DUPLICATE (HTTP 400) — but the content IS already stored, so
    // reuse the existing file's URL instead of failing. (Shape differs by route:
    // image route nests it under data.failed[].result, video route at data.)
    const dupFail = json?.data?.failed?.[0];
    const dupUrl =
      json?.data?.existingFile?.url ||
      json?.data?.existingFile?.cdnUrl ||
      dupFail?.existingFile?.url ||
      dupFail?.existingFile?.cdnUrl ||
      dupFail?.result?.data?.existingFile?.url ||
      dupFail?.result?.data?.existingFile?.cdnUrl;
    if (dupUrl) return { ok: true, url: dupUrl };

    // The content validator rejects with 400 + { message, data.failed[] }. Surface the SPECIFIC
    // per-file reason ("content rejected: empty file" / "...: unrecognised file signature"),
    // not just the generic outer message.
    const failMsg = firstFailureMessage(json);

    // 200 = all ok, 207 = partial (fetch res.ok covers both). Anything else is a real error.
    if (!res.ok) {
      return { ok: false, error: failMsg || json?.message || `Upload failed (HTTP ${res.status}).` };
    }

    const url = extractUrl(json);
    if (!url) {
      return { ok: false, error: failMsg || 'Upload succeeded but no file URL was returned.' };
    }
    return { ok: true, url };
  } catch (e: any) {
    if (e?.name === 'AbortError') return { ok: false, error: 'Upload timed out. Please try again.' };
    return { ok: false, error: 'Upload network error. Please try again.' };
  }
}
