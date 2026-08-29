import { COMMON_BASE_URL, ENDPOINTS } from '@/constants/api';
import { getAccessToken, refreshAccessToken } from '@/lib/auth';

// Shape the Orders screen renders (mapped from the raw API order).
export type UiOrder = {
  id: string;
  orderNo: string;
  sampleLabel: string | null; // "Sample No.: X" or "Inquiry No.: X"
  product: string;
  extraProducts: number;
  qty: string | null;
  orderDate: string;
  completionDate: string;
  orderAmount: string;
  advanceReceived: string;
  status: string;
  manufacturingComplete: boolean; // all 4 manufacturing steps have media
};

export type StatusKey = 'ongoing' | 'shipped' | 'delivered' | 'upcoming';

export type OrdersResult =
  | { ok: true; orders: UiOrder[] }
  | { ok: false; error: string; unauthorized?: boolean };

const norm = (s?: string | null) => (s ?? '').toString().trim().toLowerCase();

// Same grouping the vendor website uses (Orders.tsx tabFilters).
export const TAB_FILTERS: Record<StatusKey, (status: string) => boolean> = {
  ongoing: (s) =>
    !!s && !['ready_to_ship', 'shipped', 'delivered', 'completed', 'cancelled'].includes(s),
  upcoming: (s) =>
    ['pending_confirmation', 'confirmed', 'contract_created', 'payment_pending'].includes(s),
  shipped: (s) => ['ready_to_ship', 'shipped'].includes(s),
  delivered: (s) => ['delivered', 'completed'].includes(s),
};

function firstProduct(order: any): any {
  const list = order?.inquiryId?.inquiries;
  return Array.isArray(list) && list.length ? list[0] : null;
}

function productCount(order: any): number {
  const list = order?.inquiryId?.inquiries;
  return Array.isArray(list) ? list.length : 0;
}

function fmtDate(v: any): string {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Simple grouped money string; ₹ for INR, otherwise the currency code.
function formatMoney(amount: number, currency?: string): string | null {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  const cur = (currency || 'INR').toUpperCase();
  const [intPart, decPart] = n.toFixed(2).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return cur === 'INR' ? `₹ ${grouped}.${decPart}` : `${cur} ${grouped}.${decPart}`;
}

function orderAmount(order: any): string {
  const total = order?.totalOrderValue;
  if (total?.amount > 0) return formatMoney(total.amount, total.currency) ?? '—';

  const p = firstProduct(order);
  const qty = Number(p?.orderQuantity || p?.quantity || 0);
  const unit = p?.unitPrice;
  let price = 0;
  if (typeof unit === 'object' && unit) price = Number(unit.price || unit.amount || 0);
  else if (typeof unit === 'number') price = unit;
  const currency = p?.maxBudget?.currency || 'USD';
  if (qty > 0 && price > 0) return formatMoney(price * qty, currency) ?? '—';
  return '—';
}

function advanceReceived(order: any): string {
  const list = Array.isArray(order?.advancePayment) ? order.advancePayment : [];
  const sum = list.reduce((s: number, a: any) => s + (Number(a?.amount) || 0), 0);
  if (sum > 0) {
    const currency = order?.totalOrderValue?.currency || 'INR';
    return formatMoney(sum, currency) ?? '—';
  }
  return '—';
}

function productName(order: any): string {
  const p = firstProduct(order);
  return (
    p?.name ||
    p?.title ||
    p?.productName ||
    p?.categoryId?.name ||
    order?.productName ||
    'Product'
  );
}

function sampleLabel(order: any): string | null {
  if (order?.sampleNo) return `Sample No.: ${order.sampleNo}`;
  const inq =
    typeof order?.inquiryId === 'object' ? order?.inquiryId?.inquiryNumber : order?.inquiryId;
  return inq ? `Inquiry No.: ${inq}` : null;
}

function mapOrder(order: any): UiOrder {
  const p = firstProduct(order);
  const q = p?.orderQuantity || p?.quantity;
  const count = productCount(order);
  const sm = order?.startManufacturing || {};
  const manufacturingComplete = ['rawMaterial', 'manufacturing', 'packing', 'documentation'].every(
    (k) => Array.isArray(sm[k]) && sm[k].length > 0,
  );
  return {
    id: String(order?._id || order?.id || Math.random()),
    orderNo: order?.orderNo || '—',
    sampleLabel: sampleLabel(order),
    product: productName(order),
    extraProducts: count > 1 ? count - 1 : 0,
    qty: q ? `${q}` : null,
    orderDate: fmtDate(order?.createdAt || order?.orderDate),
    completionDate: fmtDate(order?.manufacturing?.completionDate),
    orderAmount: orderAmount(order),
    advanceReceived: advanceReceived(order),
    status: norm(order?.status || order?.orderStatus),
    manufacturingComplete,
  };
}

type FetchOnce = { status: number; json: any } | { networkError: string };

async function fetchOrdersOnce(token: string): Promise<FetchOnce> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${COMMON_BASE_URL}${ENDPOINTS.ORDERS}?page=1&limit=50`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // non-JSON
    }
    return { status: res.status, json };
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return { networkError: 'Loading orders timed out. Please check your connection.' };
    }
    return { networkError: 'Network error. Please check your connection and try again.' };
  } finally {
    clearTimeout(timeout);
  }
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// A 403 whose code points at the account-directory being briefly unavailable
// (flaky DB) is worth retrying; a real account/permission denial is not.
const isTransientDirectory = (json: any): boolean =>
  /DIRECTORY_UNAVAILABLE|DIRECTORY_STATUS|SIGNING_KEY_UNAVAILABLE|directory-error/i.test(
    String(json?.error || json?.message || ''),
  );

/**
 * Fetch the logged-in vendor's orders. The Bearer token identifies the vendor,
 * so the API returns only their orders. On a 401 we refresh the token once and
 * retry; a transient directory 403 is retried a few times before giving up.
 */
export async function getOrders(): Promise<OrdersResult> {
  let token = await getAccessToken();
  if (!token) {
    return { ok: false, error: 'Please log in again.', unauthorized: true };
  }

  let result = await fetchOrdersOnce(token);
  if ('networkError' in result) return { ok: false, error: result.networkError };

  // 401 → refresh the access token once, then retry.
  if (result.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      token = newToken;
      result = await fetchOrdersOnce(token);
      if ('networkError' in result) return { ok: false, error: result.networkError };
    }
  }

  // A 403 caused by a TRANSIENT backend directory hiccup (the account-directory
  // DB was briefly slow/unreachable) is retriable — a real account problem
  // (ACCOUNT_NOT_FOUND / ROLE-MISMATCH / CAPABILITY_NOT_HELD) is not.
  let tries = 0;
  while (result.status === 403 && isTransientDirectory(result.json) && tries < 3) {
    tries += 1;
    await delay(1200);
    result = await fetchOrdersOnce(token);
    if ('networkError' in result) return { ok: false, error: result.networkError };
  }

  if (result.status === 401 || result.status === 403) {
    // Surface the server's own message AND reason code so the real cause is visible.
    const serverMsg = result.json?.message;
    const serverCode = result.json?.error;
    const detail = [serverCode, serverMsg].filter(Boolean).join(' — ');
    return {
      ok: false,
      error: detail
        ? `Access denied (${result.status}): ${detail}`
        : 'Your session has expired. Please log in again.',
      unauthorized: true,
    };
  }

  if (result.status < 200 || result.status >= 300) {
    return {
      ok: false,
      error: result.json?.message || `Could not load orders (HTTP ${result.status}).`,
    };
  }

  const arr: any[] =
    result.json?.data || result.json?.orders || (Array.isArray(result.json) ? result.json : []);
  return { ok: true, orders: arr.map(mapOrder) };
}
