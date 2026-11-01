import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTrustProxy } from './trustProxy';

test('resolveTrustProxy: when unset, defaults to 1 in production and 0 (false) otherwise', () => {
  // Production
  assert.equal(resolveTrustProxy(undefined, 'production'), 1);
  assert.equal(resolveTrustProxy('', 'production'), 1);
  assert.equal(resolveTrustProxy('   ', 'production'), 1);

  // Non-production (development, test, unset)
  assert.equal(resolveTrustProxy(undefined, 'development'), false);
  assert.equal(resolveTrustProxy('', 'development'), false);
  assert.equal(resolveTrustProxy(undefined, 'test'), false);
  assert.equal(resolveTrustProxy(undefined, undefined), false);
});

test('resolveTrustProxy: accepts valid non-negative integer hop counts', () => {
  assert.equal(resolveTrustProxy('1', 'production'), 1);
  assert.equal(resolveTrustProxy('2', 'production'), 2);
  assert.equal(resolveTrustProxy('0', 'production'), 0);
  assert.equal(resolveTrustProxy('3', 'development'), 3);
});

test('resolveTrustProxy: when set to invalid value, logs warning and uses the environment default', () => {
  const originalWarn = console.warn;
  let warnMessages: string[] = [];
  console.warn = (msg: string) => {
    warnMessages.push(msg);
  };

  try {
    // In production: invalid value falls back to default 1 (NOT 0)
    const prodResult = resolveTrustProxy('invalid_proxy', 'production');
    assert.equal(prodResult, 1);
    assert.ok(warnMessages.some((m) => m.includes('Invalid TRUST_PROXY')));

    // In development: invalid value falls back to default 0 (false)
    warnMessages = [];
    const devResult = resolveTrustProxy('true', 'development');
    assert.equal(devResult, false);
    assert.ok(warnMessages.some((m) => m.includes('Invalid TRUST_PROXY')));

    // Negative numbers
    warnMessages = [];
    const negResult = resolveTrustProxy('-1', 'production');
    assert.equal(negResult, 1);
    assert.ok(warnMessages.some((m) => m.includes('Invalid TRUST_PROXY')));
  } finally {
    console.warn = originalWarn;
  }
});
