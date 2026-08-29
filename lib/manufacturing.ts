import { COMMON_BASE_URL } from '@/constants/api';
import { getAccessToken } from '@/lib/auth';

/**
 * Manufacturing-status data for an order. Mirrors the vendor website's
 * `order.startManufacturing` shape:
 *   GET  /order-service/orders/:id            → data.startManufacturing
 *   PUT  /order-service/orders/:id/manufacturing (body = this data)
 * Each stage (raw material / manufacturing / packing / documentation) keeps its
 * own image list; quantity + notes are shared for the manufacturing.
 */
export type BoxDetails = {
  length: number;
  width: number;
  height: number;
  weight: number;
  quantity: number;
};

export type ManufacturingData = {
  quantity: number;
  notes: string;
  rawMaterial: string[];
  manufacturing: string[];
  packing: string[];
  documentation: string[];
  // Packing details
  packingQuantity: number;
  cargoType: string;
  boxDetails: BoxDetails;
};

export const EMPTY_BOX: BoxDetails = { length: 100, width: 100, height: 100, weight: 1, quantity: 1 };

export const EMPTY_MANUFACTURING: ManufacturingData = {
  quantity: 1,
  notes: '',
  rawMaterial: [],
  manufacturing: [],
  packing: [],
  documentation: [],
  packingQuantity: 25,
  cargoType: 'Box',
  boxDetails: EMPTY_BOX,
};

export type GetManufacturingResult =
  | { ok: true; data: ManufacturingData; status?: string }
  | { ok: false; error: string; unauthorized?: boolean };

export async function getManufacturing(orderId: string): Promise<GetManufacturingResult> {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: 'Please log in again.', unauthorized: true };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${COMMON_BASE_URL}/order-service/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: 'Your session has expired. Please log in again.', unauthorized: true };
    }
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // non-JSON
    }
    if (!res.ok) {
      return { ok: false, error: json?.message || `Could not load this order (HTTP ${res.status}).` };
    }
    const order = json?.data || json;
    const m = order?.startManufacturing || {};
    return {
      ok: true,
      status: order?.status,
      data: {
        quantity: typeof m.quantity === 'number' ? m.quantity : 1,
        notes: typeof m.notes === 'string' ? m.notes : '',
        rawMaterial: Array.isArray(m.rawMaterial) ? m.rawMaterial : [],
        manufacturing: Array.isArray(m.manufacturing) ? m.manufacturing : [],
        packing: Array.isArray(m.packing) ? m.packing : [],
        documentation: Array.isArray(m.documentation) ? m.documentation : [],
        packingQuantity: typeof m.packingQuantity === 'number' ? m.packingQuantity : 25,
        cargoType: typeof m.cargoType === 'string' ? m.cargoType : 'Box',
        boxDetails: {
          length: Number(m.boxDetails?.length) || 100,
          width: Number(m.boxDetails?.width) || 100,
          height: Number(m.boxDetails?.height) || 100,
          weight: Number(m.boxDetails?.weight) || 1,
          quantity: Number(m.boxDetails?.quantity) || 1,
        },
      },
    };
  } catch (e: any) {
    if (e?.name === 'AbortError') return { ok: false, error: 'Loading timed out. Check your connection.' };
    return { ok: false, error: 'Network error. Please try again.' };
  } finally {
    clearTimeout(timeout);
  }
}

export async function saveManufacturing(
  orderId: string,
  data: ManufacturingData,
): Promise<{ ok: boolean; error?: string }> {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: 'Please log in again.' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const body = {
      date: new Date().toISOString(),
      rawMaterial: data.rawMaterial,
      manufacturing: data.manufacturing,
      packing: data.packing,
      documentation: data.documentation,
      // website also mirrors these two
      sampleImage: data.rawMaterial,
      firstProduct: data.manufacturing,
      quantity: data.quantity,
      notes: data.notes,
      packingQuantity: data.packingQuantity,
      cargoType: data.cargoType,
      boxDetails: data.boxDetails,
    };
    const res = await fetch(`${COMMON_BASE_URL}/order-service/orders/${orderId}/manufacturing`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: 'Your session has expired. Please log in again.' };
    }
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // non-JSON
    }
    if (res.ok && json?.success !== false) return { ok: true };
    return { ok: false, error: json?.message || `Save failed (HTTP ${res.status}).` };
  } catch (e: any) {
    if (e?.name === 'AbortError') return { ok: false, error: 'Saving timed out. Check your connection.' };
    return { ok: false, error: 'Network error. Please try again.' };
  } finally {
    clearTimeout(timeout);
  }
}
