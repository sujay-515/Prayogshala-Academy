import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  usageKeyFor,
  listPlans,
  getPlan,
  getPracticeQuota,
  consumePracticeAnswer,
  getMockQuota,
  consumeMockStart,
  grantSubscription,
  revokeSubscription,
  hasFullAccess,
  getActiveSubscription,
  createPayment,
  getPayment,
  updatePayment,
  findPaymentByGatewayRef,
  FREE_PRACTICE_PER_UNIT,
  FREE_MOCK_EXAMS,
} from '../../src/server/billing';
import { buildEsewaCheckout, decodeEsewaCallback, verifyEsewaCallbackSignature } from '../../src/server/payments';
import { db } from '../../src/server/db';

describe('Billing & Entitlement Core Suite', () => {
  it('generates deterministic usage keys for authenticated and guest users', () => {
    const userKey = usageKeyFor({ userId: 'usr-123' }, { ip: '192.168.1.1' });
    assert.equal(userKey, 'user:usr-123');

    const guestKey1 = usageKeyFor(null, { ip: '203.0.113.42' });
    const guestKey2 = usageKeyFor(null, { ip: '203.0.113.42' });
    assert.ok(guestKey1.startsWith('guest:'));
    assert.equal(guestKey1, guestKey2);

    const guestKeyDifferent = usageKeyFor(null, { ip: '198.51.100.5' });
    assert.notEqual(guestKey1, guestKeyDifferent);
  });

  it('lists seeded subscription plans correctly', () => {
    const plans = listPlans();
    assert.ok(plans.length >= 3, 'Should have at least 3 default plans');
    assert.ok(plans.some((p) => p.id === 'plan-1m' && p.durationDays === 30));
    assert.ok(plans.some((p) => p.id === 'plan-3m' && p.durationDays === 90));
    assert.ok(plans.some((p) => p.id === 'plan-6m' && p.durationDays === 180));

    const single = getPlan('plan-1m');
    assert.ok(single);
    assert.equal(single?.name, '1 Month Full Access');
  });

  it('tracks practice answer consumption and enforces per-unit quota', () => {
    const testUsageKey = `test-usage-${Date.now()}`;
    const testUnit = 'Hematology';

    const initial = getPracticeQuota(testUsageKey, testUnit);
    assert.equal(initial.used, 0);
    assert.equal(initial.limit, FREE_PRACTICE_PER_UNIT);
    assert.equal(initial.allowed, true);

    // Consume question 1
    const res1 = consumePracticeAnswer(testUsageKey, testUnit, 'q-1');
    assert.equal(res1.allowed, true);
    assert.equal(res1.quota.used, 1);

    // Answering the same question again should NOT increment used count
    const res1Repeat = consumePracticeAnswer(testUsageKey, testUnit, 'q-1');
    assert.equal(res1Repeat.allowed, true);
    assert.equal(res1Repeat.quota.used, 1);

    // Answer distinct questions up to the limit
    for (let i = 2; i <= FREE_PRACTICE_PER_UNIT; i++) {
      const r = consumePracticeAnswer(testUsageKey, testUnit, `q-${i}`);
      assert.equal(r.allowed, true);
    }

    const atLimit = getPracticeQuota(testUsageKey, testUnit);
    assert.equal(atLimit.used, FREE_PRACTICE_PER_UNIT);
    assert.equal(atLimit.allowed, false);

    // One more distinct question must be paywalled
    const blocked = consumePracticeAnswer(testUsageKey, testUnit, 'q-overflow');
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.quota.allowed, false);
  });

  it('tracks mock exam consumption and enforces mock quota', () => {
    const testUsageKey = `test-mock-usage-${Date.now()}`;

    const initial = getMockQuota(testUsageKey);
    assert.equal(initial.used, 0);
    assert.equal(initial.limit, FREE_MOCK_EXAMS);
    assert.equal(initial.allowed, true);

    // First mock start should be allowed
    const start1 = consumeMockStart(testUsageKey);
    assert.equal(start1.allowed, true);
    assert.equal(start1.quota.used, 1);
    assert.equal(start1.quota.allowed, false);

    // Next mock start must be paywalled
    const start2 = consumeMockStart(testUsageKey);
    assert.equal(start2.allowed, false);
    assert.equal(start2.quota.allowed, false);
  });

  it('manages staff access exemptions and student subscription grant/revoke lifecycle', () => {
    // Staff accounts always have full access
    assert.equal(hasFullAccess({ userId: 'staff-1', role: 'admin' }), true);
    assert.equal(hasFullAccess({ userId: 'head-1', role: 'superadmin' }), true);

    // Ensure dummy student exists in DB
    const studentId = `test-student-${Date.now()}`;
    db.prepare(
      `INSERT INTO users (id, username, password_hash, role, display_name, stats_json, created_at)
       VALUES (?, ?, 'hash', 'student', 'Test Student', '{}', datetime('now'))`
    ).run(studentId, `stud_${Date.now()}`);

    // Student without active subscription has no full access
    assert.equal(hasFullAccess({ userId: studentId, role: 'student' }), false);
    assert.equal(getActiveSubscription(studentId), null);

    // Admin grants 30 days subscription
    const sub = grantSubscription(studentId, 30, 'admin-1');
    assert.ok(sub.id);
    assert.equal(sub.userId, studentId);
    assert.equal(sub.status, 'active');
    assert.equal(sub.source, 'manual');

    // Student now has full access
    assert.equal(hasFullAccess({ userId: studentId, role: 'student' }), true);
    const activeSub = getActiveSubscription(studentId);
    assert.ok(activeSub);
    assert.equal(activeSub?.id, sub.id);

    // Revoke subscription
    const revokedCount = revokeSubscription(studentId);
    assert.ok(revokedCount >= 1);

    // Student returns to free tier
    assert.equal(hasFullAccess({ userId: studentId, role: 'student' }), false);
    assert.equal(getActiveSubscription(studentId), null);
  });

  it('records, updates and retrieves payment records', () => {
    const plan = getPlan('plan-1m')!;
    assert.ok(plan);

    const payment = createPayment('test-user-pay', plan, 'esewa');

    assert.ok(payment.id.startsWith('pay-'));
    assert.equal(payment.status, 'initiated');
    assert.equal(payment.amountNpr, 500);

    const fetched = getPayment(payment.id);
    assert.ok(fetched);
    assert.equal(fetched?.id, payment.id);

    // Update with gateway ref and completed status
    const ref = `esewa-ref-${Date.now()}`;
    updatePayment(payment.id, {
      status: 'completed',
      gatewayRef: ref,
      gatewayPayload: JSON.stringify({ code: '00' }),
    });

    const updated = getPayment(payment.id);
    assert.equal(updated?.status, 'completed');
    assert.equal(updated?.gatewayRef, ref);

    const byRef = findPaymentByGatewayRef('esewa', ref);
    assert.ok(byRef);
    assert.equal(byRef?.id, payment.id);
  });

  it('builds eSewa checkout form and verifies signature correctly', () => {
    const checkout = buildEsewaCheckout({
      paymentId: 'pay-test-sig-1',
      amountNpr: 500,
      successUrl: 'http://localhost:3001/api/billing/esewa/callback?pid=pay-test-sig-1',
      failureUrl: 'http://localhost:3001/payment/result?status=failure',
    });

    assert.equal(checkout.method, 'form');
    assert.ok(checkout.action.includes('esewa.com.np'));
    assert.equal(checkout.fields.total_amount, '500');
    assert.equal(checkout.fields.transaction_uuid, 'pay-test-sig-1');
    assert.ok(checkout.fields.signature, 'Signature must be computed');

    // Simulate callback payload matching signature
    const callbackData = {
      transaction_code: 'ESW123456',
      status: 'COMPLETE',
      total_amount: '500',
      transaction_uuid: 'pay-test-sig-1',
      product_code: checkout.fields.product_code,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature: checkout.fields.signature,
    };

    const rawBase64 = Buffer.from(JSON.stringify(callbackData)).toString('base64');
    const decoded = decodeEsewaCallback(rawBase64);
    assert.ok(decoded);
    assert.equal(decoded?.transaction_uuid, 'pay-test-sig-1');
    assert.equal(verifyEsewaCallbackSignature(decoded!), true);
  });
});
