#!/usr/bin/env node

/**
 * Prayogshala Academy Production Smoke Test Script
 * Verifies key security, SEO, route handling, and anti-leak protections against a running instance.
 *
 * Usage:
 *   BASE_URL=http://localhost:3001 node scripts/smoke.mjs
 *   npm run smoke
 */

const rawBaseUrl = process.env.BASE_URL || 'http://localhost:3001';
const BASE_URL = rawBaseUrl.replace(/\/+$/, '');
const baseOrigin = new URL(BASE_URL).origin;

let passes = 0;
let failures = 0;
let warnings = 0;

function pass(msg) {
  passes++;
  console.log(`[PASS] ${msg}`);
}

function fail(msg) {
  failures++;
  console.error(`[FAIL] ${msg}`);
}

function warn(msg) {
  warnings++;
  console.warn(`[WARN] ${msg}`);
}

async function run() {
  console.log(`Running Prayogshala Academy smoke tests against: ${BASE_URL}\n`);

  // 1. GET /api/health returns 200 and JSON with status "ok"
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (res.status !== 200) {
      fail(`GET /api/health returned status ${res.status} (expected 200)`);
    } else {
      const data = await res.json().catch(() => null);
      if (data && data.status === 'ok') {
        pass(`GET /api/health returns 200 with status "ok"`);
      } else {
        fail(`GET /api/health JSON status is not "ok": ${JSON.stringify(data)}`);
      }
    }
  } catch (err) {
    fail(`GET /api/health network error: ${err.message}`);
  }

  // 2. GET / returns 200 HTML with security headers
  try {
    const res = await fetch(`${BASE_URL}/`);
    const ctype = res.headers.get('content-type') || '';
    const bodyText = await res.text();

    if (res.status === 200 && ctype.includes('text/html')) {
      pass(`GET / returns 200 HTML`);
    } else {
      fail(`GET / returned status ${res.status} with Content-Type "${ctype}" (expected 200 text/html)`);
    }

    // No X-Powered-By
    if (res.headers.get('x-powered-by')) {
      fail(`GET / leaks X-Powered-By header: ${res.headers.get('x-powered-by')}`);
    } else {
      pass(`GET / does not include X-Powered-By header`);
    }

    // Strict-Transport-Security when BASE_URL is https
    if (new URL(BASE_URL).protocol === 'https:') {
      if (res.headers.get('strict-transport-security')) {
        pass(`GET / includes Strict-Transport-Security header`);
      } else {
        fail(`GET / is missing Strict-Transport-Security header on HTTPS`);
      }
    } else {
      pass(`GET / Strict-Transport-Security check skipped (HTTP scheme)`);
    }

    // CSP or CSP-Report-Only
    const csp = res.headers.get('content-security-policy');
    const cspReportOnly = res.headers.get('content-security-policy-report-only');
    if (csp || cspReportOnly) {
      pass(`GET / includes CSP header (${csp ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only'})`);
    } else {
      fail(`GET / missing Content-Security-Policy or Content-Security-Policy-Report-Only header`);
    }

    // X-Content-Type-Options
    if (res.headers.get('x-content-type-options')?.toLowerCase().includes('nosniff')) {
      pass(`GET / includes X-Content-Type-Options: nosniff`);
    } else {
      fail(`GET / missing or invalid X-Content-Type-Options header: ${res.headers.get('x-content-type-options')}`);
    }

    // Check placeholder warnings in homepage HTML
    const placeholders = ['[CONTACT_EMAIL]', '[OPERATOR_NAME]', '[OPERATOR_COUNTRY]', 'example.com'];
    const foundPlaceholders = placeholders.filter((p) => bodyText.includes(p));
    if (foundPlaceholders.length > 0) {
      warn(`Homepage HTML contains unresolved configuration placeholder(s): ${foundPlaceholders.join(', ')}`);
    } else {
      pass(`Homepage HTML contains no placeholder strings`);
    }
  } catch (err) {
    fail(`GET / test failed: ${err.message}`);
  }

  // 3. GET /robots.txt and /sitemap.xml return 200 and sitemap <loc> URLs match origin
  try {
    const robotsRes = await fetch(`${BASE_URL}/robots.txt`);
    if (robotsRes.status === 200) {
      pass(`GET /robots.txt returns 200`);
    } else {
      fail(`GET /robots.txt returned status ${robotsRes.status} (expected 200)`);
    }

    const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
    if (sitemapRes.status === 200) {
      const sitemapXml = await sitemapRes.text();
      const locMatches = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
      if (locMatches.length === 0) {
        fail(`GET /sitemap.xml contains no <loc> entries`);
      } else {
        const mismatches = locMatches.filter((loc) => !loc.startsWith(baseOrigin));
        if (mismatches.length > 0) {
          fail(`Sitemap contains <loc> URLs that do not start with BASE_URL origin "${baseOrigin}": ${mismatches.slice(0, 3).join(', ')}`);
        } else {
          pass(`GET /sitemap.xml returns 200 and all ${locMatches.length} <loc> URLs match origin "${baseOrigin}"`);
        }
      }
    } else {
      fail(`GET /sitemap.xml returned status ${sitemapRes.status} (expected 200)`);
    }
  } catch (err) {
    fail(`Robots/Sitemap test failed: ${err.message}`);
  }

  // 4. GET /definitely-not-a-page returns 404
  try {
    const res = await fetch(`${BASE_URL}/definitely-not-a-page`);
    if (res.status === 404) {
      pass(`GET /definitely-not-a-page returns 404`);
    } else {
      fail(`GET /definitely-not-a-page returned status ${res.status} (expected 404)`);
    }
  } catch (err) {
    fail(`404 route test failed: ${err.message}`);
  }

  // 5. Protected server files check: do not return sqlite header, env text, or TS source
  const sensitivePaths = [
    '/data/prayogshala_academy.sqlite',
    '/.env',
    '/server.ts',
    '/src/App.tsx',
  ];
  for (const path of sensitivePaths) {
    try {
      const res = await fetch(`${BASE_URL}${path}`);
      const ctype = res.headers.get('content-type') || '';
      const text = await res.text();

      const isSqliteHeader = text.startsWith('SQLite format 3');
      const isEnvText = text.includes('INITIAL_ADMIN_') || text.includes('PORT=') || text.includes('SUPABASE_');
      const isTsSource = text.includes('export default function') || text.includes('import express');
      const isHtmlOr404 = res.status === 404 || ctype.includes('text/html');

      if (!isSqliteHeader && !isEnvText && !isTsSource && isHtmlOr404) {
        pass(`GET ${path} is properly protected (status: ${res.status}, content-type: ${ctype || 'none'})`);
      } else {
        fail(`GET ${path} leaked file content! (status: ${res.status}, content-type: ${ctype})`);
      }
    } catch (err) {
      fail(`Protected file check for ${path} failed: ${err.message}`);
    }
  }

  // 6. GET /api/bootstrap and /api/questions contain none of the secret field names
  const leakTargets = [
    { name: '/api/bootstrap', path: '/api/bootstrap' },
    { name: '/api/questions', path: '/api/questions' },
  ];
  const forbiddenFieldRegex = /"(correctAnswer|explanation|reference|versionHistory|sourceDocument)"\s*:/;

  for (const target of leakTargets) {
    try {
      const res = await fetch(`${BASE_URL}${target.path}`);
      const text = await res.text();
      const match = text.match(forbiddenFieldRegex);
      if (match) {
        fail(`GET ${target.name} leaked forbidden field "${match[1]}" in JSON payload`);
      } else {
        pass(`GET ${target.name} contains no reveal-only or admin field names`);
      }
    } catch (err) {
      fail(`Leak check for ${target.name} failed: ${err.message}`);
    }
  }

  // 7. GET /api/admin/users, /api/reports, /api/backup/export without token return 401 or 403
  const protectedApiRoutes = ['/api/admin/users', '/api/reports', '/api/backup/export'];
  for (const path of protectedApiRoutes) {
    try {
      const res = await fetch(`${BASE_URL}${path}`);
      if (res.status === 401 || res.status === 403) {
        pass(`GET ${path} without token returned ${res.status}`);
      } else {
        fail(`GET ${path} without token returned status ${res.status} (expected 401 or 403)`);
      }
    } catch (err) {
      fail(`Protected API check for ${path} failed: ${err.message}`);
    }
  }

  // 8. POST /api/auth/login with 2MB body returns 413
  try {
    const largeBody = JSON.stringify({
      identifier: 'test@example.com',
      password: 'Pass',
      padding: 'X'.repeat(2 * 1024 * 1024),
    });
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: largeBody,
    });
    if (res.status === 413) {
      pass(`POST /api/auth/login with 2MB body returns 413 Payload Too Large`);
    } else {
      fail(`POST /api/auth/login with 2MB body returned status ${res.status} (expected 413)`);
    }
  } catch (err) {
    fail(`2MB payload rejection check failed: ${err.message}`);
  }

  // Summary
  console.log(`\n========================================`);
  console.log(`Smoke Test Results:`);
  console.log(`  Passed:   ${passes}`);
  console.log(`  Failed:   ${failures}`);
  console.log(`  Warnings: ${warnings}`);
  console.log(`========================================\n`);

  if (failures > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
