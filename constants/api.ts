/**
 * Aaziko seller/vendor API configuration.
 *
 * Production base is the same gateway the vendor website uses:
 *   https://api.aaziko.com/vendor-api  (→ /vendor-auth/login etc.)
 *
 * Note: api.aaziko.com's nginx UA-gates desktop curl/HeadlessChrome, but
 * React Native's networking (okhttp / NSURLSession) uses a normal UA, so
 * requests from the app are NOT blocked.
 */
// ── TEMPORARY LOCAL-DEV WORKAROUND ──────────────────────────────────────────
// Production (api.aaziko.com) order-service currently returns a 403
// ACCOUNT_DIRECTORY_STATUS_401 — its internal service token to the vendor
// account-directory is mismatched, so NO vendor can load orders there. That is
// a production backend config bug (fix: same COMMON_SERVICE_TOKEN on the prod
// order-service + vendor auth-service).
//
// Until prod is fixed, point the app at the LOCAL backend on this machine
// (192.168.1.21). It runs the same services, is internally consistent, and
// shares the SAME production database — so it serves your REAL orders. It only
// works while the phone is on the same Wi-Fi. Flip USE_LOCAL back to false to
// return to production once the prod service token is fixed.
const USE_LOCAL = false;
const LAN = 'http://192.168.1.21';

// Vendor login/auth gateway
export const API_BASE_URL = USE_LOCAL ? `${LAN}:3021` : 'https://api.aaziko.com/vendor-api';

// Orders (and other shared business data) live behind the COMMON gateway,
// not the vendor-auth gateway — same split the vendor website uses.
export const COMMON_BASE_URL = USE_LOCAL ? `${LAN}:3030` : 'https://api.aaziko.com/common-api';

export const ENDPOINTS = {
  LOGIN: '/vendor-auth/login',
  REFRESH_TOKEN: '/vendor-auth/auth/refresh-token',
  PROFILE: '/vendor-auth/profile',
  ORDERS: '/order-service/orders',
} as const;

/**
 * Make a stored media URL loadable on the phone.
 *
 * The media service builds public URLs from MINIO_PUBLIC_URL=http://localhost:9000,
 * so an uploaded photo comes back as `http://localhost:9000/...`. On a phone,
 * `localhost` is the phone itself → the image can't load and the preview is blank
 * (this is why an uploaded image "disappears" after you leave and re-open the
 * order — the in-session local preview is gone and only the unreachable URL
 * remains). minio is published on the LAN, so in local-dev we rewrite the host
 * (localhost / 127.0.0.1 / 0.0.0.0 / the internal `minio` alias) to the same LAN
 * IP the API uses. Display-only — no endpoint change. In production the URLs are
 * already public, so this is a no-op.
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (!USE_LOCAL) return url;
  const lanHost = LAN.replace(/^https?:\/\//, '');
  return url.replace(
    /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|minio)(:\d+)?/i,
    (_m, _host, port) => `http://${lanHost}${port || ':9000'}`,
  );
}
