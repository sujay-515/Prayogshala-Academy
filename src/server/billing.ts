/**
 * Billing & entitlement core.
 *
 * Free tier policy:
 * - Practice: FREE_PRACTICE_PER_UNIT distinct questions per unit per usage key
 *   (authenticated user id, or guest:<ip> for anonymous visitors).
 * - Mock exams: FREE_MOCK_EXAMS full mock start(s) per usage key, then paywall.
 * - Any active subscription unlocks the entire question bank and unlimited mocks.
 * - Staff accounts (admin/superadmin) always have full access.
 */
import crypto from 'crypto';
import { db } from './db';

export const FREE_PRACTICE_PER_UNIT = Math.max(
  0,
  parseInt(process.env.FREE_PRACTICE_PER_UNIT || '20', 10) || 20
);
export const FREE_MOCK_EXAMS = Math.max(
  0,
  parseInt(process.env.FREE_MOCK_EXAMS || '1', 10) || 1
);

export interface Plan {
  id: string;
  name: string;
  durationDays: number;
  priceNpr: number;
  currency: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string | null;
  status: 'active' | 'expired' | 'cancelled';
  source: 'esewa' | 'khalti' | 'manual' | 'simulate';
  startsAt: string;
  expiresAt: string;
  createdAt: string;
}

export type UsageKey = string;

/** Stable identity for quota tracking: user id when signed in, else client IP. */
export function usageKeyFor(session: { userId: string } | null, req: { ip?: string }): UsageKey {
  if (session?.userId) return `user:${session.userId}`;
  const ip = String(req.ip || 'unknown').slice(0, 60);
  return `guest:${crypto.createHash('sha256').update(ip).digest('hex').slice(0, 24)}`;
}

export function listPlans(includeInactive = false): Plan[] {
  const rows = db
    .prepare(
      `SELECT id, name, duration_days, price_npr, currency FROM plans
       ${includeInactive ? '' : 'WHERE is_active = 1'} ORDER BY sort_order ASC`
    )
    .all() as any[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    durationDays: r.duration_days,
    priceNpr: r.price_npr,
    currency: r.currency,
  }));
}

export function getPlan(planId: string): Plan | null {
  const r = db
    .prepare('SELECT id, name, duration_days, price_npr, currency FROM plans WHERE id = ? AND is_active = 1')
    .get(planId) as any;
  if (!r) return null;
  return { id: r.id, name: r.name, durationDays: r.duration_days, priceNpr: r.price_npr, currency: r.currency };
}

/** Lookup including deactivated plans — needed to honour payments already in flight. */
export function getPlanAny(planId: string): Plan | null {
  const r = db
    .prepare('SELECT id, name, duration_days, price_npr, currency FROM plans WHERE id = ?')
    .get(planId) as any;
  if (!r) return null;
  return { id: r.id, name: r.name, durationDays: r.duration_days, priceNpr: r.price_npr, currency: r.currency };
}

function mapSubscription(r: any): Subscription {
  return {
    id: r.id,
    userId: r.user_id,
    planId: r.plan_id,
    status: r.status,
    source: r.source,
    startsAt: r.starts_at,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  };
}

export function getActiveSubscription(userId: string): Subscription | null {
  const now = new Date().toISOString();
  const row = db
    .prepare(
      `SELECT * FROM subscriptions
       WHERE user_id = ? AND status = 'active' AND expires_at > ?
       ORDER BY expires_at DESC LIMIT 1`
    )
    .get(userId, now) as any;
  return row ? mapSubscription(row) : null;
}

/** Staff always pass; students need an unexpired active subscription. */
export function hasFullAccess(session: { userId: string; role: string } | null): boolean {
  if (!session) return false;
  if (session.role === 'admin' || session.role === 'superadmin') return true;
  if (session.role !== 'student') return false;
  return getActiveSubscription(session.userId) !== null;
}

/**
 * Activates a subscription for a user. Any currently active subscriptions are
 * ended at the new one's start so exactly one active row exists per user.
 * Idempotent by payment id: callers must check payment status before calling.
 */
export function activateSubscription(
  userId: string,
  plan: Plan,
  source: Subscription['source'],
  createdBy: string | null
): Subscription {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  const id = `sub-${crypto.randomBytes(12).toString('hex')}`;

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `UPDATE subscriptions SET status = 'expired'
       WHERE user_id = ? AND status = 'active' AND expires_at <= ?`
    ).run(userId, now.toISOString());
    db.prepare(
      `INSERT INTO subscriptions (id, user_id, plan_id, status, source, starts_at, expires_at, created_at, created_by)
       VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      plan.id,
      source,
      now.toISOString(),
      expiresAt.toISOString(),
      now.toISOString(),
      createdBy
    );
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return {
    id,
    userId,
    planId: plan.id,
    status: 'active',
    source,
    startsAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  };
}

/** Admin manual grant without a payment record (bank transfer / promo). */
export function grantSubscription(userId: string, durationDays: number, adminId: string): Subscription {
  const plan: Plan = {
    id: 'manual-grant',
    name: `Manual Grant (${durationDays} days)`,
    durationDays,
    priceNpr: 0,
    currency: 'NPR',
  };
  return activateSubscription(userId, plan, 'manual', adminId);
}

export function revokeSubscription(userId: string): number {
  const result = db
    .prepare(`UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'`)
    .run(userId);
  return Number(result.changes || 0);
}

// ---------------------------------------------------------------------------
// Free-tier usage tracking
// ---------------------------------------------------------------------------

export interface PracticeQuota {
  unit: string;
  used: number;
  limit: number;
  allowed: boolean;
}

/** Counts distinct questions already answered by this key within a unit. */
export function getPracticeQuota(usageKey: UsageKey, unit: string): PracticeQuota {
  const row = db
    .prepare('SELECT COUNT(*) AS cnt FROM practice_usage WHERE usage_key = ? AND unit = ?')
    .get(usageKey, unit) as { cnt: number };
  const used = row.cnt;
  return { unit, used, limit: FREE_PRACTICE_PER_UNIT, allowed: used < FREE_PRACTICE_PER_UNIT };
}

/**
 * Attempts to consume one practice answer. Re-answering an already-counted
 * question never consumes additional quota. Returns the resulting quota and
 * whether this answer is allowed.
 */
export function consumePracticeAnswer(
  usageKey: UsageKey,
  unit: string,
  questionId: string
): { allowed: boolean; quota: PracticeQuota } {
  const existing = db
    .prepare('SELECT 1 FROM practice_usage WHERE usage_key = ? AND unit = ? AND question_id = ?')
    .get(usageKey, unit, questionId);
  if (existing) {
    return { allowed: true, quota: getPracticeQuota(usageKey, unit) };
  }
  const quota = getPracticeQuota(usageKey, unit);
  if (!quota.allowed) {
    return { allowed: false, quota };
  }
  db.prepare(
    'INSERT OR IGNORE INTO practice_usage (usage_key, unit, question_id, first_answered_at) VALUES (?, ?, ?, ?)'
  ).run(usageKey, unit, questionId, new Date().toISOString());
  return { allowed: true, quota: getPracticeQuota(usageKey, unit) };
}

export interface MockQuota {
  used: number;
  limit: number;
  allowed: boolean;
}

export function getMockQuota(usageKey: UsageKey): MockQuota {
  const row = db
    .prepare('SELECT free_mock_used FROM exam_usage WHERE usage_key = ?')
    .get(usageKey) as { free_mock_used: number } | undefined;
  const used = row?.free_mock_used || 0;
  return { used, limit: FREE_MOCK_EXAMS, allowed: used < FREE_MOCK_EXAMS };
}

/** Consumes one free mock start. Caller must re-check quota immediately before. */
export function consumeMockStart(usageKey: UsageKey): { allowed: boolean; quota: MockQuota } {
  const quota = getMockQuota(usageKey);
  if (!quota.allowed) {
    return { allowed: false, quota };
  }
  db.prepare(
    `INSERT INTO exam_usage (usage_key, free_mock_used, updated_at) VALUES (?, 1, ?)
     ON CONFLICT(usage_key) DO UPDATE SET free_mock_used = free_mock_used + 1, updated_at = excluded.updated_at`
  ).run(usageKey, new Date().toISOString());
  return { allowed: true, quota: getMockQuota(usageKey) };
}

export function listPracticeUsage(usageKey: UsageKey): { unit: string; used: number; limit: number }[] {
  const rows = db
    .prepare('SELECT unit, COUNT(*) AS cnt FROM practice_usage WHERE usage_key = ? GROUP BY unit ORDER BY unit ASC')
    .all(usageKey) as any[];
  return rows.map((r) => ({ unit: r.unit, used: r.cnt, limit: FREE_PRACTICE_PER_UNIT }));
}

// ---------------------------------------------------------------------------
// Payments records
// ---------------------------------------------------------------------------

export interface PaymentRecord {
  id: string;
  userId: string;
  planId: string;
  gateway: 'esewa' | 'khalti' | 'manual' | 'simulate';
  amountNpr: number;
  status: 'initiated' | 'completed' | 'failed' | 'cancelled';
  gatewayRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export function createPayment(
  userId: string,
  plan: Plan,
  gateway: PaymentRecord['gateway']
): PaymentRecord {
  const id = `pay-${crypto.randomBytes(12).toString('hex')}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO payments (id, user_id, plan_id, gateway, amount_npr, status, gateway_ref, gateway_payload, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'initiated', NULL, NULL, ?, ?)`
  ).run(id, userId, plan.id, gateway, plan.priceNpr, now, now);
  return { id, userId, planId: plan.id, gateway, amountNpr: plan.priceNpr, status: 'initiated', gatewayRef: null, createdAt: now, updatedAt: now };
}

export function getPayment(id: string): (PaymentRecord & { gatewayPayload?: string | null }) | null {
  const r = db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as any;
  if (!r) return null;
  return {
    id: r.id,
    userId: r.user_id,
    planId: r.plan_id,
    gateway: r.gateway,
    amountNpr: r.amount_npr,
    status: r.status,
    gatewayRef: r.gateway_ref,
    gatewayPayload: r.gateway_payload,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function updatePayment(
  id: string,
  patch: { status?: PaymentRecord['status']; gatewayRef?: string | null; gatewayPayload?: string | null }
): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE payments SET
       status = COALESCE(?, status),
       gateway_ref = COALESCE(?, gateway_ref),
       gateway_payload = COALESCE(?, gateway_payload),
       updated_at = ?
     WHERE id = ?`
  ).run(patch.status ?? null, patch.gatewayRef ?? null, patch.gatewayPayload ?? null, now, id);
}

export function findPaymentByGatewayRef(gateway: string, gatewayRef: string): PaymentRecord | null {
  const r = db
    .prepare('SELECT * FROM payments WHERE gateway = ? AND gateway_ref = ? ORDER BY created_at DESC LIMIT 1')
    .get(gateway, gatewayRef) as any;
  if (!r) return null;
  return {
    id: r.id,
    userId: r.user_id,
    planId: r.plan_id,
    gateway: r.gateway,
    amountNpr: r.amount_npr,
    status: r.status,
    gatewayRef: r.gateway_ref,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listSubscriptionsForAdmin(): (Subscription & { username: string; displayName: string })[] {
  const rows = db
    .prepare(
      `SELECT s.*, u.username, u.display_name FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       ORDER BY s.created_at DESC LIMIT 500`
    )
    .all() as any[];
  return rows.map((r) => ({ ...mapSubscription(r), username: r.username, displayName: r.display_name }));
}
