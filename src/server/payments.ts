/**
 * Payment gateway providers: eSewa ePay v2 and Khalti KPG-2 (epayment).
 *
 * Both gateways run in their sandbox environments by default; set the
 * production base URLs and live credentials via environment variables.
 *
 * eSewa flow (server-signed form):
 *   1. buildEsewaCheckout() returns a form the browser auto-submits to eSewa.
 *   2. eSewa redirects to our success URL with a base64 `data` payload.
 *   3. verifyEsewaCallback() validates the HMAC signature and confirms the
 *      transaction via the server-to-server status API before activation.
 *
 * Khalti flow (server-initiated):
 *   1. createKhaltiCheckout() POSTs /epayment/initiate/ and returns the
 *      hosted payment_url the browser is redirected to.
 *   2. Khalti returns the user to our return_url with a pidx.
 *   3. verifyKhaltiPayment() confirms via /epayment/lookup/ before activation.
 */
import crypto from 'crypto';

export interface EsewaCheckout {
  method: 'form';
  action: string;
  fields: Record<string, string>;
}

export interface KhaltiCheckout {
  method: 'redirect';
  url: string;
  pidx: string;
}

export type CheckoutResult = EsewaCheckout | KhaltiCheckout;

// ---------------------------------------------------------------------------
// eSewa ePay v2
// ---------------------------------------------------------------------------

const ESEWA_BASE_URL = (process.env.ESEWA_BASE_URL || 'https://rc-epay.esewa.com.np').replace(/\/+$/, '');
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST';
// Sandbox default from eSewa's public docs; override with the live secret in production.
const ESEWA_SECRET = process.env.ESEWA_SECRET || '8gBm/:&EnhH.1/q';

export function isEsewaConfigured(): boolean {
  return Boolean(ESEWA_PRODUCT_CODE && ESEWA_SECRET);
}

function esewaSignature(message: string): string {
  return crypto.createHmac('sha256', ESEWA_SECRET).update(message).digest('base64');
}

export function buildEsewaCheckout(params: {
  paymentId: string;
  amountNpr: number;
  successUrl: string;
  failureUrl: string;
}): EsewaCheckout {
  const totalAmount = String(params.amountNpr);
  const signedFieldNames = 'total_amount,transaction_uuid,product_code';
  const signature = esewaSignature(
    `total_amount=${totalAmount},transaction_uuid=${params.paymentId},product_code=${ESEWA_PRODUCT_CODE}`
  );

  return {
    method: 'form',
    action: `${ESEWA_BASE_URL}/api/epay/main/v2/form`,
    fields: {
      amount: totalAmount,
      tax_amount: '0',
      total_amount: totalAmount,
      transaction_uuid: params.paymentId,
      product_code: ESEWA_PRODUCT_CODE,
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: params.successUrl,
      failure_url: params.failureUrl,
      signed_field_names: signedFieldNames,
      signature,
    },
  };
}

export interface EsewaCallbackData {
  transaction_code?: string;
  status?: string;
  total_amount?: string;
  transaction_uuid?: string;
  product_code?: string;
  signed_field_names?: string;
  signature?: string;
}

export function decodeEsewaCallback(raw: string): EsewaCallbackData | null {
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

/** Verifies the callback signature over whichever fields eSewa signed. */
export function verifyEsewaCallbackSignature(data: EsewaCallbackData): boolean {
  if (!data.signature || !data.signed_field_names) return false;
  const message = data.signed_field_names
    .split(',')
    .map((name) => `${name.trim()}=${(data as Record<string, string | undefined>)[name.trim()] ?? ''}`)
    .join(',');
  const expected = esewaSignature(message);
  const a = Buffer.from(expected);
  const b = Buffer.from(data.signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Server-to-server confirmation of an eSewa transaction. Returns the gateway
 * status string (e.g. COMPLETE, PENDING, CANCELED) or null on network failure.
 */
export async function checkEsewaStatus(params: {
  paymentId: string;
  amountNpr: number;
}): Promise<{ status: string; refId?: string } | null> {
  const url =
    `${ESEWA_BASE_URL}/api/epay/transaction/status/` +
    `?product_code=${encodeURIComponent(ESEWA_PRODUCT_CODE)}` +
    `&total_amount=${encodeURIComponent(String(params.amountNpr))}` +
    `&transaction_uuid=${encodeURIComponent(params.paymentId)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: string; ref_id?: string };
    return { status: String(data.status || ''), refId: data.ref_id };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Khalti KPG-2 (epayment)
// ---------------------------------------------------------------------------

const KHALTI_BASE_URL = (process.env.KHALTI_BASE_URL || 'https://dev.khalti.com/api/v2').replace(/\/+$/, '');
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || '';

export function isKhaltiConfigured(): boolean {
  return Boolean(KHALTI_SECRET_KEY);
}

export async function createKhaltiCheckout(params: {
  paymentId: string;
  amountNpr: number;
  planName: string;
  returnUrl: string;
  websiteUrl: string;
  customer?: { name?: string; email?: string };
}): Promise<KhaltiCheckout> {
  const res = await fetch(`${KHALTI_BASE_URL}/epayment/initiate/`, {
    method: 'POST',
    headers: {
      Authorization: `key ${KHALTI_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      return_url: params.returnUrl,
      website_url: params.websiteUrl,
      amount: Math.round(params.amountNpr * 100), // Khalti charges in paisa
      purchase_order_id: params.paymentId,
      purchase_order_name: params.planName,
      ...(params.customer?.name || params.customer?.email
        ? {
            customer_info: {
              ...(params.customer.name ? { name: params.customer.name } : {}),
              ...(params.customer.email ? { email: params.customer.email } : {}),
            },
          }
        : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const data = (await res.json().catch(() => null)) as any;
  if (!res.ok || !data?.payment_url || !data?.pidx) {
    throw new Error(data?.detail || `Khalti initiate failed (HTTP ${res.status})`);
  }
  return { method: 'redirect', url: data.payment_url, pidx: data.pidx };
}

export async function verifyKhaltiPayment(pidx: string): Promise<{
  status: string;
  transactionId?: string;
  totalAmountPaisa?: number;
} | null> {
  try {
    const res = await fetch(`${KHALTI_BASE_URL}/epayment/lookup/`, {
      method: 'POST',
      headers: {
        Authorization: `key ${KHALTI_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pidx }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return {
      status: String(data?.status || ''),
      transactionId: data?.transaction_id,
      totalAmountPaisa: typeof data?.total_amount === 'number' ? data.total_amount : undefined,
    };
  } catch {
    return null;
  }
}
