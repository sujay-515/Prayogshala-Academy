import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from './emailService';

test('escapeHtml escapes <, >, &, and quotes to prevent HTML injection', () => {
  assert.equal(
    escapeHtml('<script>alert("xss") & alert(\'test\')</script>'),
    '&lt;script&gt;alert(&quot;xss&quot;) &amp; alert(&#39;test&#39;)&lt;/script&gt;'
  );

  assert.equal(escapeHtml('Normal text 123'), 'Normal text 123');
  assert.equal(escapeHtml('Tom & Jerry'), 'Tom &amp; Jerry');
  assert.equal(escapeHtml('"quoted"'), '&quot;quoted&quot;');
  assert.equal(escapeHtml("'single'"), '&#39;single&#39;');
  assert.equal(escapeHtml('<tag>'), '&lt;tag&gt;');
  assert.equal(escapeHtml(''), '');
  assert.equal(escapeHtml(null as any), '');
  assert.equal(escapeHtml(undefined as any), '');
});
