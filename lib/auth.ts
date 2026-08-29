import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL, ENDPOINTS } from '@/constants/api';

// AsyncStorage keys
const KEY_ACCESS = 'access_token';
const KEY_REFRESH = 'refresh_token';
const KEY_USER = 'user';

export type StoredUser = {
  id?: string;
  email?: string;
  name?: string;
  username?: string;
  phone?: string;
  role?: string;
  [k: string]: unknown;
};

export type LoginResult =
  | { ok: true; user: StoredUser }
  | { ok: false; error: string };

/**
 * Authenticate against the vendor login endpoint.
 * Body: { identifier, password } — identifier can be email, username or phone.
 * Success response: { success: true, data: { user, tokens: { accessToken, refreshToken } } }
 * On success the tokens + user are persisted in AsyncStorage.
 */
export async function login(identifier: string, password: string): Promise<LoginResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${API_BASE_URL}${ENDPOINTS.LOGIN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Identify this as the installed mobile app so the backend issues a
        // non-expiring token (the website omits this header and keeps its
        // normal 24h token). Also sent in the body as a fallback in case a
        // proxy strips custom headers.
        'X-Client-Type': 'mobile-app',
      },
      body: JSON.stringify({ identifier, password, client: 'mobile-app' }),
      signal: controller.signal,
    });

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // non-JSON response
    }

    if (json?.success && json?.data?.tokens) {
      const { user, tokens } = json.data;
      await AsyncStorage.multiSet([
        [KEY_ACCESS, tokens.accessToken ?? ''],
        [KEY_REFRESH, tokens.refreshToken ?? ''],
        [KEY_USER, JSON.stringify(user ?? {})],
      ]);
      return { ok: true, user: (user ?? {}) as StoredUser };
    }

    // Some vendor accounts require a 2FA OTP (handled on the website flow).
    if (json?.data?.requiresOtpVerification) {
      return {
        ok: false,
        error: 'This account needs OTP verification. Please log in on the Aaziko website first.',
      };
    }

    return {
      ok: false,
      error: json?.message || 'Login failed. Please check your credentials and try again.',
    };
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return { ok: false, error: 'Login timed out. Please check your internet connection.' };
    }
    return { ok: false, error: 'Network error. Please check your connection and try again.' };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getAccessToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY_ACCESS);
  } catch {
    return null;
  }
}

/**
 * Exchange the stored refresh token for a fresh access token (same flow the
 * vendor website uses on a 401). Stores and returns the new access token, or
 * null if it can't be refreshed.
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await AsyncStorage.getItem(KEY_REFRESH);
    if (!refreshToken) return null;

    const res = await fetch(`${API_BASE_URL}${ENDPOINTS.REFRESH_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Keep refreshed tokens non-expiring for the mobile app too.
        'X-Client-Type': 'mobile-app',
      },
      body: JSON.stringify({ refreshToken, client: 'mobile-app' }),
    });

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // non-JSON
    }

    const tokens = json?.data?.tokens;
    if (json?.success && tokens?.accessToken) {
      await AsyncStorage.multiSet([
        [KEY_ACCESS, tokens.accessToken],
        [KEY_REFRESH, tokens.refreshToken ?? refreshToken],
      ]);
      return tokens.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getStoredUser(): Promise<StoredUser | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_USER);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEY_ACCESS, KEY_REFRESH, KEY_USER]);
  } catch {
    // ignore
  }
}
