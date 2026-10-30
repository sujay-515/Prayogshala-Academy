import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveClientIpKey, getRateLimitKey } from '../../src/server/rateLimit';

test('IPv6 and IPv4 rate limit key generation', async (t) => {
  await t.test('two addresses in the same IPv6 /64 map to one key', () => {
    const ip1 = '2001:db8:abcd:0012:0000:0000:0000:0001';
    const ip2 = '2001:db8:abcd:0012:ffff:ffff:ffff:ffff';

    const key1 = resolveClientIpKey(ip1);
    const key2 = resolveClientIpKey(ip2);

    assert.equal(key1, key2);
    assert.equal(key1, '2001:db8:abcd:12::/64');

    // Also via getRateLimitKey
    assert.equal(getRateLimitKey(ip1), getRateLimitKey(ip2));
    assert.equal(getRateLimitKey({ ip: ip1 } as any), getRateLimitKey({ ip: ip2 } as any));
  });

  await t.test('different /64s map to different keys', () => {
    const ip1 = '2001:db8:abcd:0012:0000:0000:0000:0001';
    const ip2 = '2001:db8:abcd:0013:0000:0000:0000:0001';

    const key1 = resolveClientIpKey(ip1);
    const key2 = resolveClientIpKey(ip2);

    assert.notEqual(key1, key2);
    assert.equal(key1, '2001:db8:abcd:12::/64');
    assert.equal(key2, '2001:db8:abcd:13::/64');

    assert.notEqual(getRateLimitKey(ip1), getRateLimitKey(ip2));
  });

  await t.test('IPv4-mapped IPv6 addresses map to the IPv4 key', () => {
    const mappedIp = '::ffff:192.0.2.128';
    const standardIpv4 = '192.0.2.128';

    const mappedKey = resolveClientIpKey(mappedIp);
    const standardKey = resolveClientIpKey(standardIpv4);

    assert.equal(mappedKey, standardKey);
    assert.equal(mappedKey, '192.0.2.128');

    assert.equal(getRateLimitKey(mappedIp), getRateLimitKey(standardIpv4));
    assert.equal(getRateLimitKey({ ip: mappedIp } as any), '192.0.2.128');
  });

  await t.test('logged-in users use the user ID', () => {
    const req = { ip: '2001:db8:abcd:0012:0000:0000:0000:0001' } as any;
    const keyWithResolver = getRateLimitKey(req, () => ({ userId: 'usr-student-42' }));
    assert.equal(keyWithResolver, 'usr-student-42');

    const keyWithAttachedSession = getRateLimitKey({
      ip: '192.168.1.1',
      _sessionUser: { userId: 'usr-admin-101' },
    } as any);
    assert.equal(keyWithAttachedSession, 'usr-admin-101');
  });
});
