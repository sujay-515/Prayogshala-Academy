import test from 'node:test';
import assert from 'node:assert/strict';
import { minimizeIp, minimizeUserAgent } from '../../src/server/rateLimit';

test('minimizeIp: truncates IPv4 addresses to /24 subnets', () => {
  assert.equal(minimizeIp('192.168.1.42'), '192.168.1.0/24');
  assert.equal(minimizeIp('127.0.0.1'), '127.0.0.0/24');
  assert.equal(minimizeIp('203.0.113.195'), '203.0.113.0/24');
  assert.equal(minimizeIp('10.250.33.7'), '10.250.33.0/24');
});

test('minimizeIp: handles IPv4-mapped IPv6 addresses as IPv4 /24', () => {
  assert.equal(minimizeIp('::ffff:192.168.1.100'), '192.168.1.0/24');
  assert.equal(minimizeIp('::ffff:10.0.5.21'), '10.0.5.0/24');
});

test('minimizeIp: truncates IPv6 addresses to /48 prefixes (first 3 hextets)', () => {
  assert.equal(
    minimizeIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334'),
    '2001:db8:85a3::/48'
  );
  assert.equal(minimizeIp('2001:db8:abcd::1'), '2001:db8:abcd::/48');
  assert.equal(minimizeIp('2001:db8:abcd:1234::5678'), '2001:db8:abcd::/48');
  assert.equal(minimizeIp('fe80::1'), 'fe80::/48');
  assert.equal(minimizeIp('::1'), '::/48');
  assert.equal(minimizeIp('fe80::1ff:fe00:1%eth0'), 'fe80::/48');
});

test('minimizeIp: handles empty and malformed inputs safely', () => {
  assert.equal(minimizeIp(undefined), '');
  assert.equal(minimizeIp(null), '');
  assert.equal(minimizeIp(''), '');
  assert.equal(minimizeIp('   '), '');
});

test('minimizeUserAgent: trims user agent strings to <= 200 characters', () => {
  assert.equal(minimizeUserAgent(undefined), '');
  assert.equal(minimizeUserAgent(null), '');
  assert.equal(minimizeUserAgent(''), '');

  const standardUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
  assert.equal(minimizeUserAgent(standardUa), standardUa);

  const longUa = 'A'.repeat(350);
  const trimmed = minimizeUserAgent(longUa);
  assert.equal(trimmed.length, 200);
  assert.equal(trimmed, 'A'.repeat(200));
});
