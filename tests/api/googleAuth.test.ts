import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, ChildProcess } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';

const TEST_CLIENT_ID = 'test-prayogshala-client-id.apps.googleusercontent.com';

function httpRequest(
  port: number,
  method: string,
  reqPath: string,
  options: {
    headers?: Record<string, string>;
    body?: any;
    token?: string;
    mockGoogle?: any;
  } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any; rawBody: string }> {
  return new Promise((resolve, reject) => {
    let payload = '';
    const headers: Record<string, string> = { ...(options.headers || {}) };

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    if (options.mockGoogle) {
      headers['x-test-google-mock'] = Buffer.from(JSON.stringify(options.mockGoogle)).toString('base64');
    }

    if (options.body !== undefined) {
      if (typeof options.body === 'string') {
        payload = options.body;
      } else {
        payload = JSON.stringify(options.body);
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
      headers['Content-Length'] = String(Buffer.byteLength(payload));
    }

    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: reqPath,
        method,
        headers,
      },
      (res) => {
        let rawBody = '';
        res.on('data', (chunk) => {
          rawBody += chunk;
        });
        res.on('end', () => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(rawBody);
          } catch {
            parsed = rawBody;
          }
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: parsed,
            rawBody,
          });
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

describe('Sign in with Google & Auth Hardening Suite', () => {
  let serverProcess: ChildProcess;
  let tempDir: string;
  const PORT = 5500 + Math.floor(Math.random() * 300);

  // Server without GOOGLE_CLIENT_ID for disabled-feature check
  let disabledServerProcess: ChildProcess;
  let disabledTempDir: string;
  const DISABLED_PORT = 5900 + Math.floor(Math.random() * 300);

  before(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'google-auth-test-'));
    disabledTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'google-auth-disabled-'));

    // 1. Boot main server with GOOGLE_CLIENT_ID
    serverProcess = spawn('npx', ['tsx', 'server.ts'], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: String(PORT),
        DATA_DIR: tempDir,
        GOOGLE_CLIENT_ID: TEST_CLIENT_ID,
        SUPABASE_URL: '',
        SUPABASE_SERVICE_ROLE_KEY: '',
        SUPABASE_ANON_KEY: '',
        GEMINI_API_KEY: '',
        INITIAL_ADMIN_EMAIL: 'bootstrap_superadmin@prayogshala.test',
        INITIAL_ADMIN_PASSWORD: 'BootstrapPassword123!',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // 2. Boot second server without GOOGLE_CLIENT_ID
    disabledServerProcess = spawn('npx', ['tsx', 'server.ts'], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: String(DISABLED_PORT),
        DATA_DIR: disabledTempDir,
        GOOGLE_CLIENT_ID: '', // unset
        SUPABASE_URL: '',
        SUPABASE_SERVICE_ROLE_KEY: '',
        SUPABASE_ANON_KEY: '',
        GEMINI_API_KEY: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Wait for both to be ready
    const waitForReady = async (port: number) => {
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 200));
        try {
          const res = await httpRequest(port, 'GET', '/api/health');
          if (res.status === 200) return;
        } catch {}
      }
      throw new Error(`Server failed to start on port ${port}`);
    };

    await Promise.all([waitForReady(PORT), waitForReady(DISABLED_PORT)]);
  });

  after(async () => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
    if (disabledServerProcess) {
      disabledServerProcess.kill('SIGTERM');
    }
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.rmSync(disabledTempDir, { recursive: true, force: true });
    } catch {}
  });

  it('feature disabled (404) when GOOGLE_CLIENT_ID is unset', async () => {
    const res = await httpRequest(DISABLED_PORT, 'POST', '/api/auth/google', {
      body: { credential: 'some-fake-token' },
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error?.includes('not enabled'));
  });

  it('rejects missing or invalid credential payload with 400', async () => {
    const res1 = await httpRequest(PORT, 'POST', '/api/auth/google', {
      body: {},
    });
    assert.equal(res1.status, 400);

    const res2 = await httpRequest(PORT, 'POST', '/api/auth/google', {
      body: { credential: '   ' },
    });
    assert.equal(res2.status, 400);

    const res3 = await httpRequest(PORT, 'POST', '/api/auth/google', {
      body: { credential: 'a'.repeat(9000) }, // exceeds sane maximum
    });
    assert.equal(res3.status, 400);
  });

  it('rejects invalid token signature / verifier error with 401 generic message', async () => {
    const res = await httpRequest(PORT, 'POST', '/api/auth/google', {
      body: { credential: 'invalid.jwt.token' },
      mockGoogle: { error: 'invalid_token' },
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'Invalid Google authentication credential.');
  });

  it('rejects token with wrong audience with 401', async () => {
    const res = await httpRequest(PORT, 'POST', '/api/auth/google', {
      body: { credential: 'token-with-wrong-aud' },
      mockGoogle: {
        sub: 'google-sub-wrong-aud',
        email: 'user@example.com',
        email_verified: true,
        aud: 'attacker-client-id.apps.googleusercontent.com',
      },
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'Invalid Google authentication credential.');
  });

  it('rejects token when email_verified is false with 401', async () => {
    const res = await httpRequest(PORT, 'POST', '/api/auth/google', {
      body: { credential: 'token-unverified-email' },
      mockGoogle: {
        sub: 'google-sub-unverified',
        email: 'unverified-gmail@example.com',
        email_verified: false,
        aud: TEST_CLIENT_ID,
      },
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'Invalid Google authentication credential.');
  });

  it('creates new user with student role, verified email, and no password on first Google sign-in', async () => {
    const googleSub = `sub-new-${Date.now()}`;
    const googleEmail = `newstudent_${Date.now()}@university.edu`;
    const googleName = 'Candidate Priya Sharma';

    const res = await httpRequest(PORT, 'POST', '/api/auth/google', {
      body: { credential: 'valid.token' },
      mockGoogle: {
        sub: googleSub,
        email: googleEmail,
        name: googleName,
        email_verified: true,
        aud: TEST_CLIENT_ID,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, googleEmail.toLowerCase());
    assert.equal(res.body.user.displayName, googleName);
    assert.equal(res.body.user.role, 'student');
    assert.equal(res.body.user.emailVerified, true);
    assert.equal(res.body.user.hasPassword, false);
    assert.equal(res.body.user.isGoogleLinked, true);
    assert.ok(res.body.stats); // Non-staff receives stats
    assert.equal(res.body.stats.totalAnswered, 0);

    // Verify /api/bootstrap preserves hasPassword and isGoogleLinked for Google users
    const bootstrapRes = await httpRequest(PORT, 'GET', '/api/bootstrap', { token: res.body.token });
    assert.equal(bootstrapRes.status, 200);
    assert.equal(bootstrapRes.body.user.hasPassword, false);
    assert.equal(bootstrapRes.body.user.isGoogleLinked, true);
    assert.equal(bootstrapRes.body.user.leaderboardHidden, false);

    // Verify in database: password_hash IS NULL and google_sub matches
    const dbPath = path.join(tempDir, 'prayogshala_academy.sqlite');
    const localDb = new DatabaseSync(dbPath);
    const row = localDb.prepare('SELECT * FROM users WHERE google_sub = ?').get(googleSub) as any;
    localDb.close();

    assert.ok(row);
    assert.equal(row.password_hash, null);
    assert.equal(row.role, 'student');
    assert.equal(row.email_verified, 1);
  });

  it('logs in existing user by google_sub even if Google email changes', async () => {
    const googleSub = `sub-emailchange-${Date.now()}`;
    const initialEmail = `initial_${Date.now()}@example.com`;

    // 1. Initial Google sign in
    const res1 = await httpRequest(PORT, 'POST', '/api/auth/google', {
      body: { credential: 'token.1' },
      mockGoogle: {
        sub: googleSub,
        email: initialEmail,
        name: 'Dr. Test Student',
        email_verified: true,
        aud: TEST_CLIENT_ID,
      },
    });
    assert.equal(res1.status, 200);
    const userId = res1.body.user.id;

    // 2. Second sign in with different email but same google_sub
    const updatedEmail = `changed_${Date.now()}@example.com`;
    const res2 = await httpRequest(PORT, 'POST', '/api/auth/google', {
      body: { credential: 'token.2' },
      mockGoogle: {
        sub: googleSub,
        email: updatedEmail,
        name: 'Dr. Test Student',
        email_verified: true,
        aud: TEST_CLIENT_ID,
      },
    });

    assert.equal(res2.status, 200);
    assert.equal(res2.body.user.id, userId); // Same user resolved
  });

  it('links to existing verified email account, keeping existing password, role, and sessions', async () => {
    const userEmail = `verified_user_${Date.now()}@example.com`;
    const username = `verified_user_${Date.now()}`;
    const password = 'StudentSecurePassword123!';

    // 1. Register with normal password
    const regRes = await httpRequest(PORT, 'POST', '/api/auth/register', {
      body: { username, email: userEmail, password, displayName: 'Verified Candidate' },
    });
    assert.equal(regRes.status, 200);
    const originalToken = regRes.body.token;

    // Mark verified in DB
    const dbPath = path.join(tempDir, 'prayogshala_academy.sqlite');
    const localDb = new DatabaseSync(dbPath);
    localDb.prepare('UPDATE users SET email_verified = 1 WHERE email = ?').run(userEmail);
    localDb.close();

    // 2. Sign in with Google using matching verified email
    const googleSub = `sub-link-verified-${Date.now()}`;
    const linkRes = await httpRequest(PORT, 'POST', '/api/auth/google', {
      body: { credential: 'token.link' },
      mockGoogle: {
        sub: googleSub,
        email: userEmail,
        name: 'Verified Candidate (Google)',
        email_verified: true,
        aud: TEST_CLIENT_ID,
      },
    });
    assert.equal(linkRes.status, 200);
    assert.equal(linkRes.body.user.id, regRes.body.user.id);
    assert.equal(linkRes.body.user.hasPassword, true);
    assert.equal(linkRes.body.user.isGoogleLinked, true);

    // 3. Verify original session is still valid
    const meRes = await httpRequest(PORT, 'GET', '/api/auth/me', { token: originalToken });
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.user.hasPassword, true);
    assert.equal(meRes.body.user.isGoogleLinked, true);

    // 4. Verify password login still works
    const pwLogin = await httpRequest(PORT, 'POST', '/api/auth/login', {
      body: { identifier: userEmail, password },
    });
    assert.equal(pwLogin.status, 200);
  });

  it('pre-hijack protection: linking to UNVERIFIED existing account clears password and revokes previous sessions', async () => {
    const targetEmail = `prehijack_target_${Date.now()}@example.com`;
    const targetUsername = `prehijack_target_${Date.now()}`;
    const hackerPassword = 'AttackerKnownPassword123!';

    // 1. Attacker registers account with victim email address
    const regRes = await httpRequest(PORT, 'POST', '/api/auth/register', {
      body: {
        username: targetUsername,
        email: targetEmail,
        password: hackerPassword,
        displayName: 'Unverified Victim',
      },
    });
    assert.equal(regRes.status, 200);
    const attackerSessionToken = regRes.body.token;

    // Verify it is unverified in DB
    const dbPath = path.join(tempDir, 'prayogshala_academy.sqlite');
    let localDb = new DatabaseSync(dbPath);
    const beforeRow = localDb.prepare('SELECT email_verified, password_hash FROM users WHERE email = ?').get(targetEmail) as any;
    assert.equal(beforeRow.email_verified, 0);
    assert.ok(beforeRow.password_hash);
    localDb.close();

    // 2. Legitimate email owner signs in with Google
    const googleSub = `sub-legit-owner-${Date.now()}`;
    const googleRes = await httpRequest(PORT, 'POST', '/api/auth/google', {
      body: { credential: 'token.legit' },
      mockGoogle: {
        sub: googleSub,
        email: targetEmail,
        name: 'Legit Email Owner',
        email_verified: true,
        aud: TEST_CLIENT_ID,
      },
    });
    assert.equal(googleRes.status, 200);
    assert.equal(googleRes.body.user.emailVerified, true);
    assert.equal(googleRes.body.user.hasPassword, false); // Password was cleared!
    assert.equal(googleRes.body.user.isGoogleLinked, true);

    // 3. Attacker's previous session must now be revoked (401)
    const attackerCheck = await httpRequest(PORT, 'GET', '/api/auth/me', { token: attackerSessionToken });
    assert.equal(attackerCheck.status, 401);

    // 4. Attacker password login must fail (constant-time scrypt rejection)
    const attackerLogin = await httpRequest(PORT, 'POST', '/api/auth/login', {
      body: { identifier: targetEmail, password: hackerPassword },
    });
    assert.equal(attackerLogin.status, 401);

    // 5. Database check: password_hash is NULL and email_verified is 1
    localDb = new DatabaseSync(dbPath);
    const afterRow = localDb.prepare('SELECT email_verified, password_hash, google_sub FROM users WHERE email = ?').get(targetEmail) as any;
    localDb.close();

    assert.equal(afterRow.email_verified, 1);
    assert.equal(afterRow.password_hash, null);
    assert.equal(afterRow.google_sub, googleSub);
  });

  it('linking Google to existing administrator account preserves admin role without demotion or promotion', async () => {
    // 1. Login as superadmin to invite an administrator
    const superLogin = await httpRequest(PORT, 'POST', '/api/auth/login', {
      body: { identifier: 'bootstrap_superadmin@prayogshala.test', password: 'BootstrapPassword123!' },
    });
    assert.equal(superLogin.status, 200);
    const superToken = superLogin.body.token;

    const adminEmail = `staff_admin_${Date.now()}@prayogshala.test`;
    const adminUsername = `staff_admin_${Date.now()}`;
    const inviteRes = await httpRequest(PORT, 'POST', '/api/admin/users', {
      token: superToken,
      body: {
        username: adminUsername,
        email: adminEmail,
        displayName: 'Staff Administrator',
        role: 'admin',
        password: 'AdminPassword123!',
      },
    });
    assert.equal(inviteRes.status, 200);

    // 2. Admin signs in with Google using the staff email
    const adminGoogleSub = `sub-admin-${Date.now()}`;
    const googleRes = await httpRequest(PORT, 'POST', '/api/auth/google', {
      body: { credential: 'token.admin' },
      mockGoogle: {
        sub: adminGoogleSub,
        email: adminEmail,
        name: 'Staff Administrator',
        email_verified: true,
        aud: TEST_CLIENT_ID,
      },
    });
    assert.equal(googleRes.status, 200);
    assert.equal(googleRes.body.user.role, 'admin'); // Role is strictly preserved!
    assert.equal(googleRes.body.stats, null); // Staff accounts never receive candidate study stats
  });

  it('Google-only account cannot log in via password and rejects change-password', async () => {
    const googleSub = `sub-pwdless-${Date.now()}`;
    const email = `pwdless_${Date.now()}@prayogshala.test`;

    const gRes = await httpRequest(PORT, 'POST', '/api/auth/google', {
      body: { credential: 'token.pwdless' },
      mockGoogle: {
        sub: googleSub,
        email,
        name: 'Passwordless User',
        email_verified: true,
        aud: TEST_CLIENT_ID,
      },
    });
    assert.equal(gRes.status, 200);
    const userToken = gRes.body.token;

    // 1. Password login must fail with generic 401 error
    const pwRes = await httpRequest(PORT, 'POST', '/api/auth/login', {
      body: { identifier: email, password: 'AnyPassword123!' },
    });
    assert.equal(pwRes.status, 401);
    assert.equal(pwRes.body.error, 'Invalid username/email or password.');

    // 2. Change password endpoint must reject with 400
    const cpRes = await httpRequest(PORT, 'POST', '/api/auth/change-password', {
      token: userToken,
      body: { currentPassword: 'Any', newPassword: 'NewPassword123!' },
    });
    assert.equal(cpRes.status, 400);
    assert.ok(cpRes.body.error?.toLowerCase().includes('forgot password'));
  });

  it('account deletion for Google-only account requires valid Google credential', async () => {
    const googleSub = `sub-del-${Date.now()}`;
    const email = `delete_google_${Date.now()}@prayogshala.test`;

    const gRes = await httpRequest(PORT, 'POST', '/api/auth/google', {
      body: { credential: 'token.del' },
      mockGoogle: {
        sub: googleSub,
        email,
        name: 'Delete Test User',
        email_verified: true,
        aud: TEST_CLIENT_ID,
      },
    });
    assert.equal(gRes.status, 200);
    const userToken = gRes.body.token;

    // 1. Attempt delete without credential returns 400
    const delNoCred = await httpRequest(PORT, 'DELETE', '/api/auth/account', {
      token: userToken,
      body: {},
    });
    assert.equal(delNoCred.status, 400);

    // 2. Attempt delete with credential belonging to another sub returns 401
    const delWrongSub = await httpRequest(PORT, 'DELETE', '/api/auth/account', {
      token: userToken,
      body: { credential: 'other.sub.token' },
      mockGoogle: {
        sub: 'completely-different-sub',
        email,
        email_verified: true,
      },
    });
    assert.equal(delWrongSub.status, 401);

    // 3. Attempt delete with matching credential succeeds (200)
    const delSuccess = await httpRequest(PORT, 'DELETE', '/api/auth/account', {
      token: userToken,
      body: { credential: 'matching.token' },
      mockGoogle: {
        sub: googleSub,
        email,
        email_verified: true,
      },
    });
    assert.equal(delSuccess.status, 200);
    assert.equal(delSuccess.body.success, true);

    // 4. Session is now revoked
    const checkRevoked = await httpRequest(PORT, 'GET', '/api/auth/me', { token: userToken });
    assert.equal(checkRevoked.status, 401);
  });

  it('account deletion for Google-linked password account accepts Google credential', async () => {
    const email = `hybrid_del_${Date.now()}@prayogshala.test`;
    const username = `hybrid_del_${Date.now()}`;
    const password = 'HybridPassword123!';

    // 1. Register password account and mark verified
    const regRes = await httpRequest(PORT, 'POST', '/api/auth/register', {
      body: { username, email, password, displayName: 'Hybrid User' },
    });
    assert.equal(regRes.status, 200);

    const dbPath = path.join(tempDir, 'prayogshala_academy.sqlite');
    const localDb = new DatabaseSync(dbPath);
    localDb.prepare('UPDATE users SET email_verified = 1 WHERE email = ?').run(email);
    localDb.close();

    // 2. Link Google account
    const googleSub = `sub-hybrid-del-${Date.now()}`;
    const linkRes = await httpRequest(PORT, 'POST', '/api/auth/google', {
      body: { credential: 'token.hybrid.link' },
      mockGoogle: {
        sub: googleSub,
        email,
        name: 'Hybrid User',
        email_verified: true,
        aud: TEST_CLIENT_ID,
      },
    });
    assert.equal(linkRes.status, 200);
    assert.equal(linkRes.body.user.hasPassword, true);
    assert.equal(linkRes.body.user.isGoogleLinked, true);

    const bootstrapRes = await httpRequest(PORT, 'GET', '/api/bootstrap', { token: linkRes.body.token });
    assert.equal(bootstrapRes.status, 200);
    assert.equal(bootstrapRes.body.user.hasPassword, true);
    assert.equal(bootstrapRes.body.user.isGoogleLinked, true);

    // 3. Wrong Google sub is rejected (401)
    const delWrongSub = await httpRequest(PORT, 'DELETE', '/api/auth/account', {
      token: linkRes.body.token,
      body: { credential: 'wrong.sub.token' },
      mockGoogle: {
        sub: 'wrong-sub',
        email,
        email_verified: true,
      },
    });
    assert.equal(delWrongSub.status, 401);

    // 4. Matching Google credential deletes the linked account (200)
    const delSuccess = await httpRequest(PORT, 'DELETE', '/api/auth/account', {
      token: linkRes.body.token,
      body: { credential: 'matching.hybrid.token' },
      mockGoogle: {
        sub: googleSub,
        email,
        email_verified: true,
      },
    });
    assert.equal(delSuccess.status, 200);
    assert.equal(delSuccess.body.success, true);

    const checkRevoked = await httpRequest(PORT, 'GET', '/api/auth/me', { token: linkRes.body.token });
    assert.equal(checkRevoked.status, 401);
  });

  it('rate limiting applies to POST /api/auth/google failed attempts', async () => {
    // loginLimiter allows up to 10 failed login attempts per window
    let hitRateLimit = false;
    for (let i = 0; i < 15; i++) {
      const res = await httpRequest(PORT, 'POST', '/api/auth/google', {
        body: { credential: `bad.token.${i}` },
        mockGoogle: { error: 'invalid_token' },
      });
      if (res.status === 429) {
        hitRateLimit = true;
        assert.equal(res.body.success, false);
        assert.ok(res.body.error?.toLowerCase().includes('too many'));
        break;
      }
    }
    assert.ok(hitRateLimit, 'Expected 429 Too Many Requests after consecutive failed attempts');
  });

  it('idempotent migrations run cleanly twice on database with existing users', () => {
    const memoryDb = new DatabaseSync(':memory:');

    // 1. Setup legacy schema where password_hash was TEXT NOT NULL
    memoryDb.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        display_name TEXT NOT NULL,
        stats_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // Insert existing users
    memoryDb.prepare(`
      INSERT INTO users (id, username, password_hash, role, display_name, stats_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('u-1', 'existing_user_1', 'salt:hash1', 'student', 'User 1', '{}', '2026-01-01');

    memoryDb.prepare(`
      INSERT INTO users (id, username, password_hash, role, display_name, stats_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('u-2', 'existing_user_2', 'salt:hash2', 'admin', 'User 2', '{}', '2026-01-02');

    // Migration logic function
    const runMigration = (db: DatabaseSync) => {
      try {
        db.prepare('ALTER TABLE users ADD COLUMN email TEXT').run();
      } catch {}
      try {
        db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL').run();
      } catch {}
      try {
        db.prepare('ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1').run();
      } catch {}
      try {
        db.prepare('ALTER TABLE users ADD COLUMN google_sub TEXT').run();
      } catch {}
      try {
        db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL').run();
      } catch {}

      const tableInfo = db.prepare('PRAGMA table_info(users)').all() as { name: string; notnull: number }[];
      const pwCol = tableInfo.find((c) => c.name === 'password_hash');
      if (pwCol && pwCol.notnull === 1) {
        db.exec('BEGIN IMMEDIATE');
        db.exec(`
          CREATE TABLE users_rebuild_temp (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            role TEXT NOT NULL,
            display_name TEXT NOT NULL,
            stats_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            email TEXT,
            email_verified INTEGER NOT NULL DEFAULT 1,
            email_verify_token_hash TEXT,
            email_verify_expires TEXT,
            google_sub TEXT
          );

          INSERT INTO users_rebuild_temp (
            id, username, password_hash, role, display_name, stats_json, created_at,
            email, email_verified, google_sub
          )
          SELECT
            id, username, password_hash, role, display_name, stats_json, created_at,
            email, email_verified, google_sub
          FROM users;

          DROP TABLE users;
          ALTER TABLE users_rebuild_temp RENAME TO users;

          CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
          CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL;
        `);
        db.exec('COMMIT');
      }
    };

    // First migration run
    runMigration(memoryDb);
    const colsRun1 = memoryDb.prepare('PRAGMA table_info(users)').all() as { name: string; notnull: number }[];
    const pwColRun1 = colsRun1.find((c) => c.name === 'password_hash');
    assert.equal(pwColRun1?.notnull, 0); // relaxed!

    // Second migration run (must not throw or damage anything)
    runMigration(memoryDb);
    const colsRun2 = memoryDb.prepare('PRAGMA table_info(users)').all() as { name: string; notnull: number }[];
    const pwColRun2 = colsRun2.find((c) => c.name === 'password_hash');
    assert.equal(pwColRun2?.notnull, 0);

    // Verify existing users retained
    const u1 = memoryDb.prepare('SELECT * FROM users WHERE id = ?').get('u-1') as any;
    assert.equal(u1.username, 'existing_user_1');
    assert.equal(u1.password_hash, 'salt:hash1');

    // Verify inserting a Google user without password succeeds
    memoryDb.prepare(`
      INSERT INTO users (id, username, password_hash, role, display_name, stats_json, created_at, email, email_verified, google_sub)
      VALUES (?, ?, NULL, 'student', 'Google User', '{}', '2026-01-03', 'google@example.com', 1, 'sub_12345')
    `).run('u-3', 'google_user_3');

    const u3 = memoryDb.prepare('SELECT * FROM users WHERE id = ?').get('u-3') as any;
    assert.equal(u3.password_hash, null);
    assert.equal(u3.google_sub, 'sub_12345');

    memoryDb.close();
  });
});
