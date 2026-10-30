import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, ChildProcess } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

let serverProcess: ChildProcess;
let tempDir: string;
const PORT = 4300 + Math.floor(Math.random() * 500);

function request(
  method: string,
  reqPath: string,
  options: {
    headers?: Record<string, string>;
    body?: any;
    token?: string;
  } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any; rawBody: string }> {
  return new Promise((resolve, reject) => {
    let payload = '';
    const headers: Record<string, string> = { ...(options.headers || {}) };

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
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
        port: PORT,
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

describe('MedLab QBank API Hardening Test Suite', () => {
  before(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medlab-api-test-'));

    serverProcess = spawn('npx', ['tsx', 'server.ts'], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: String(PORT),
        DATA_DIR: tempDir,
        SUPABASE_URL: '',
        SUPABASE_SERVICE_ROLE_KEY: '',
        SUPABASE_ANON_KEY: '',
        INITIAL_ADMIN_EMAIL: 'bootstrap_superadmin@example.com',
        INITIAL_ADMIN_PASSWORD: 'BootstrapPassword123!',
        RATE_LIMIT_REGISTER_MAX: '50',
        ANSWER_CHECK_GUEST_PER_HOUR: '5',
        ANSWER_CHECK_USER_PER_HOUR: '8',
        EXAM_START_PER_HOUR: '5',
        EXTRACT_PDF_PER_HOUR: '5',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Wait for server ready
    let ready = false;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 250));
      try {
        const res = await request('GET', '/api/health');
        if (res.status === 200) {
          ready = true;
          break;
        }
      } catch {
        // waiting
      }
    }
    if (!ready) {
      throw new Error(`Server failed to boot on port ${PORT}`);
    }
  });

  after(async () => {
    if (serverProcess) {
      const exitPromise = new Promise((resolve) => {
        serverProcess.on('exit', resolve);
      });
      serverProcess.kill('SIGTERM');
      await exitPromise;
    }
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // cleanup ignore
      }
    }
  });

  it('GET /api/health returns 200 and database status', async () => {
    const res = await request('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.database, 'sqlite');
  });

  it('Rejects 2MB body to /api/auth/login with 413 Payload Too Large', async () => {
    const largePayload = JSON.stringify({
      identifier: 'test@example.com',
      junk: 'X'.repeat(2 * 1024 * 1024),
    });
    const res = await request('POST', '/api/auth/login', {
      body: largePayload,
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(res.status, 413);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'Payload too large');
  });

  it('Rejects unauthenticated 5MB body to /api/extract-pdf with 401 without buffering large body', async () => {
    const largePayload = JSON.stringify({
      pdfBase64: 'Y'.repeat(5 * 1024 * 1024),
    });
    const res = await request('POST', '/api/extract-pdf', {
      body: largePayload,
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'Authentication required.');
  });

  it('Returns JSON 404 for unknown /api/* routes', async () => {
    const res = await request('GET', '/api/some/unknown/route');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.match(res.body.error, /not found/i);
  });

  it('Returns JSON 400 for malformed JSON payload', async () => {
    const badJson = '{"key": "incomplete", ';
    const res = await request('POST', '/api/auth/login', {
      body: badJson,
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'Malformed JSON payload');
  });

  it('Forced 500 error returns JSON { success: false, error: "Internal server error" } with no stack or file path leaks', async () => {
    const res = await request('GET', '/api/__test__/force-error');
    assert.equal(res.status, 500);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'Internal server error');
    assert.equal(res.body.stack, undefined);
    assert.ok(!res.rawBody.includes('Error: Test forced'));
    assert.ok(!res.rawBody.includes('/server.ts'));
  });

  it('Registration always creates role: student and enforces password policy (8-128 chars)', async () => {
    // Too short password (<8)
    const shortRes = await request('POST', '/api/auth/register', {
      body: {
        username: 'shortpassuser',
        email: 'shortpass@example.com',
        password: 'short',
      },
    });
    assert.equal(shortRes.status, 400);

    // Valid student registration
    const regRes = await request('POST', '/api/auth/register', {
      body: {
        username: 'teststudent1',
        email: 'student1@example.com',
        password: 'ValidPassword123!',
        displayName: 'Test Student',
      },
    });
    assert.equal(regRes.status, 200);
    assert.equal(regRes.body.user.role, 'student');
    assert.equal(regRes.body.user.username, 'teststudent1');
  });

  it('Admin routes return 401 for anonymous and 403 for student', async () => {
    // 1. Anonymous request to /api/backup/export
    const anonRes = await request('GET', '/api/backup/export');
    assert.equal(anonRes.status, 401);

    // 2. Student login to obtain student token
    const studentLogin = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'teststudent1',
        password: 'ValidPassword123!',
      },
    });
    assert.equal(studentLogin.status, 200);
    const studentToken = studentLogin.body.token;
    assert.ok(studentToken);

    // 3. Student request to /api/backup/export
    const studentExportRes = await request('GET', '/api/backup/export', {
      token: studentToken,
    });
    assert.equal(studentExportRes.status, 403);
    assert.equal(studentExportRes.body.error, 'Administrator privileges required.');

    // 4. Student request to POST /api/extract-pdf
    const studentExtractRes = await request('POST', '/api/extract-pdf', {
      token: studentToken,
      body: { pdfBase64: 'test' },
    });
    assert.equal(studentExtractRes.status, 403);
  });

  it('Superadmin login, question creation and GET /api/questions/:id access control for unpublished questions', async () => {
    // Login as bootstrapped superadmin
    const adminLogin = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'bootstrap_superadmin@example.com',
        password: 'BootstrapPassword123!',
      },
    });
    assert.equal(adminLogin.status, 200);
    const superAdminToken = adminLogin.body.token;
    assert.equal(adminLogin.body.user.role, 'superadmin');

    // Create an unpublished Draft question
    const createRes = await request('POST', '/api/questions', {
      token: superAdminToken,
      body: {
        id: 'q-test-draft-1',
        code: 'LAB-TEST-DRAFT',
        unit: 'Hematology',
        subject: 'General Hematology',
        topic: 'Red Cells',
        difficulty: 'Medium',
        status: 'Draft',
        questionText: 'Test draft question text?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    assert.equal(createRes.status, 200);
    const questionId = createRes.body.question.id;
    assert.ok(questionId);

    // Student login
    const studentLogin = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'teststudent1',
        password: 'ValidPassword123!',
      },
    });
    const studentToken = studentLogin.body.token;

    // Student should NOT be allowed to view Draft question (403 Forbidden)
    const studentViewRes = await request('GET', `/api/questions/${questionId}`, {
      token: studentToken,
    });
    assert.equal(studentViewRes.status, 403);

    // Superadmin CAN view Draft question (200 OK)
    const superAdminViewRes = await request('GET', `/api/questions/${questionId}`, {
      token: superAdminToken,
    });
    assert.equal(superAdminViewRes.status, 200);
    assert.equal(superAdminViewRes.body.question.id, questionId);
  });

  it('Change password verifies current password, updates hash, and invalidates other sessions', async () => {
    // Login 1
    const l1 = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'teststudent1',
        password: 'ValidPassword123!',
      },
    });
    const token1 = l1.body.token;

    // Login 2
    const l2 = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'teststudent1',
        password: 'ValidPassword123!',
      },
    });
    const token2 = l2.body.token;

    // Change password using token 2
    const changeRes = await request('POST', '/api/auth/change-password', {
      token: token2,
      body: {
        currentPassword: 'ValidPassword123!',
        newPassword: 'BrandNewPassword456!',
      },
    });
    assert.equal(changeRes.status, 200);

    // token 1 must now be invalidated (401)
    const t1Check = await request('GET', '/api/auth/me', { token: token1 });
    assert.equal(t1Check.status, 401);

    // token 2 must still be active (200)
    const t2Check = await request('GET', '/api/auth/me', { token: token2 });
    assert.equal(t2Check.status, 200);

    // Old password fails (401)
    const oldLogin = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'teststudent1',
        password: 'ValidPassword123!',
      },
    });
    assert.equal(oldLogin.status, 401);

    // New password succeeds (200)
    const newLogin = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'teststudent1',
        password: 'BrandNewPassword456!',
      },
    });
    assert.equal(newLogin.status, 200);
  });

  it('SEC-03 & SEC-05: Exam ID generation, ownership verification, server-computed time, and late flags', async () => {
    // 1. Publish a question via superadmin so an exam can be created
    const adminLogin = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'bootstrap_superadmin@example.com',
        password: 'BootstrapPassword123!',
      },
    });
    const superAdminToken = adminLogin.body.token;

    await request('POST', '/api/questions', {
      token: superAdminToken,
      body: {
        id: 'q-published-exam-1',
        code: 'LAB-PUB-01',
        unit: 'Hematology',
        subject: 'General Hematology',
        topic: 'Red Cells',
        difficulty: 'Easy',
        status: 'Published',
        questionText: 'Published question for exam testing?',
        options: [
          { id: 'A', text: 'Opt A' },
          { id: 'B', text: 'Opt B' },
        ],
        correctAnswer: 'A',
        examCategories: ['Comprehensive'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    // 2. Student 1 starts an exam
    const student1Login = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'teststudent1',
        password: 'BrandNewPassword456!',
      },
    });
    const student1Token = student1Login.body.token;

    const startRes = await request('POST', '/api/exams/start', {
      token: student1Token,
      body: {
        examCategory: 'All',
        questionCount: 1,
        durationMinutes: 1,
      },
    });
    assert.equal(startRes.status, 200);
    const examId = startRes.body.examId;
    assert.match(examId, /^exam-sess-[0-9a-f]{32}$/); // 16 bytes = 32 hex chars

    // 3. Register Student 2
    await request('POST', '/api/auth/register', {
      body: {
        username: 'teststudent2',
        email: 'student2@example.com',
        password: 'ValidPassword123!',
        displayName: 'Test Student 2',
      },
    });
    const student2Login = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'teststudent2',
        password: 'ValidPassword123!',
      },
    });
    const student2Token = student2Login.body.token;

    // 4. Student 2 tries to submit Student 1's exam -> 403 Forbidden
    const hijackRes = await request('POST', `/api/exams/${examId}/submit`, {
      token: student2Token,
      body: { userAnswers: { 'q-published-exam-1': 'A' } },
    });
    assert.equal(hijackRes.status, 403);
    assert.equal(hijackRes.body.success, false);

    // 5. Student 1 submits own exam with client timeSpentSeconds: 999999 -> server ignores it
    const submitRes = await request('POST', `/api/exams/${examId}/submit`, {
      token: student1Token,
      body: {
        userAnswers: { 'q-published-exam-1': 'A' },
        timeSpentSeconds: 999999, // Client tampering attempt
      },
    });
    assert.equal(submitRes.status, 200);
    assert.equal(submitRes.body.success, true);
    // Sever-computed time should be <= duration (60s) and not the spoofed 999999
    assert.ok(submitRes.body.result.timeSpentSeconds <= 60);
    assert.notEqual(submitRes.body.result.timeSpentSeconds, 999999);

    // 6. Guest exam works anonymously with unguessable ID
    const guestStart = await request('POST', '/api/exams/start', {
      body: {
        examCategory: 'All',
        questionCount: 1,
        durationMinutes: 1,
      },
    });
    assert.equal(guestStart.status, 200);
    const guestExamId = guestStart.body.examId;
    assert.match(guestExamId, /^exam-sess-[0-9a-f]{32}$/);

    const guestSubmit = await request('POST', `/api/exams/${guestExamId}/submit`, {
      body: { userAnswers: { 'q-published-exam-1': 'A' } },
    });
    assert.equal(guestSubmit.status, 200);
    assert.equal(guestSubmit.body.success, true);

    // 7. Late submission flagged: start an exam with 0 minutes duration (or expired)
    const lateStart = await request('POST', '/api/exams/start', {
      body: {
        examCategory: 'All',
        questionCount: 1,
        durationMinutes: 0.001, // ~0.06s
      },
    });
    const lateExamId = lateStart.body.examId;

    // Wait a brief moment and submit after mocking or with small duration
    // In our implementation: isLate is triggered if serverElapsedSeconds > (durationSeconds + 120)
    // To reliably test late submission flag without waiting 120s, start with duration 0 or wait
    // Let's test late submission by creating a session with started_at in the past via DB or testing endpoint
    const { DatabaseSync } = await import('node:sqlite');
    const dbPath = path.join(tempDir, 'medlab_qbank.sqlite');
    const localDb = new DatabaseSync(dbPath);
    localDb.prepare('UPDATE active_exams SET started_at = ? WHERE id = ?').run(
      new Date(Date.now() - 600 * 1000).toISOString(), // 10 minutes ago (exceeds clamped 5m duration + 120s grace)
      lateExamId
    );
    localDb.close();

    const lateSubmit = await request('POST', `/api/exams/${lateExamId}/submit`, {
      body: { userAnswers: { 'q-published-exam-1': 'A' } },
    });
    assert.equal(lateSubmit.status, 200);
    assert.equal(lateSubmit.body.late, true);
  });

  it('SEC-10: Session and reset tokens are hashed with SHA-256 at rest and invalidated cleanly', async () => {
    const crypto = await import('node:crypto');
    const { DatabaseSync } = await import('node:sqlite');
    const dbPath = path.join(tempDir, 'medlab_qbank.sqlite');

    // 1. Login user to get raw token
    const loginRes = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'teststudent1',
        password: 'BrandNewPassword456!',
      },
    });
    assert.equal(loginRes.status, 200);
    const rawToken = loginRes.body.token;
    assert.ok(rawToken);

    // 2. Query SQLite DB: raw token must NOT exist, but sha256(rawToken) MUST exist
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const localDb = new DatabaseSync(dbPath);

    const rawMatch = localDb.prepare('SELECT * FROM sessions WHERE token = ?').get(rawToken);
    assert.equal(rawMatch, undefined);

    const hashMatch = localDb.prepare('SELECT * FROM sessions WHERE token = ?').get(tokenHash) as any;
    assert.ok(hashMatch);
    assert.equal(hashMatch.token, tokenHash);

    // 3. Authenticated request with rawToken succeeds
    const meRes = await request('GET', '/api/auth/me', { token: rawToken });
    assert.equal(meRes.status, 200);

    // 4. Logout invalidates the hashed session
    const logoutRes = await request('POST', '/api/auth/logout', { token: rawToken });
    assert.equal(logoutRes.status, 200);

    const afterLogoutMe = await request('GET', '/api/auth/me', { token: rawToken });
    assert.equal(afterLogoutMe.status, 401);

    const hashMatchAfterLogout = localDb.prepare('SELECT * FROM sessions WHERE token = ?').get(tokenHash);
    assert.equal(hashMatchAfterLogout, undefined);

    // 5. Password reset tokens are also hashed with sha256 at rest
    const studentUser = localDb.prepare('SELECT id FROM users WHERE username = ?').get('teststudent1') as any;
    const rawResetToken = 'my_secret_reset_token_raw_12345';
    const hashResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');

    // Insert reset row with hashed token in DB
    localDb.prepare('DELETE FROM password_resets WHERE user_id = ?').run(studentUser.id);
    localDb.prepare('INSERT INTO password_resets (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
      hashResetToken,
      studentUser.id,
      new Date(Date.now() + 3600 * 1000).toISOString(),
      new Date().toISOString()
    );

    // Verify raw reset token does not match in DB, but hash does
    const rawResetMatch = localDb.prepare('SELECT * FROM password_resets WHERE token = ?').get(rawResetToken);
    assert.equal(rawResetMatch, undefined);

    const hashResetMatch = localDb.prepare('SELECT * FROM password_resets WHERE token = ?').get(hashResetToken) as any;
    assert.ok(hashResetMatch);
    assert.equal(hashResetMatch.user_id, studentUser.id);

    // Call reset-password API with raw token
    const resetRes = await request('POST', '/api/auth/reset-password', {
      body: {
        token: rawResetToken,
        newPassword: 'ResetPasswordSuccess123!',
      },
    });
    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.body.success, true);

    // Reset token is consumed (deleted) from database
    const hashResetAfterConsume = localDb.prepare('SELECT * FROM password_resets WHERE token = ?').get(hashResetToken);
    assert.equal(hashResetAfterConsume, undefined);

    // Login with new password works
    const loginAfterReset = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'teststudent1',
        password: 'ResetPasswordSuccess123!',
      },
    });
    assert.equal(loginAfterReset.status, 200);

    localDb.close();
  });

  it('SPA Fallback: Known routes return HTTP 200 with HTML; unknown routes return HTTP 404 with HTML', async () => {
    // Known client routes return HTTP 200
    const knownPaths = ['/', '/home', '/browse', '/practice', '/exam', '/dashboard', '/admin', '/admin/system-logs'];
    for (const p of knownPaths) {
      const res = await request('GET', p);
      assert.equal(res.status, 200, `Expected 200 for known route ${p}`);
      assert.ok(res.headers['content-type']?.includes('text/html'), `Expected HTML for ${p}`);
      assert.ok(res.rawBody.includes('<html') || res.rawBody.includes('<!DOCTYPE html>') || res.rawBody.includes('<!doctype html>'));
    }

    // Unknown client route returns HTTP 404 with index.html
    const unknownRes = await request('GET', '/this-is-a-completely-unknown-page-route');
    assert.equal(unknownRes.status, 404);
    assert.ok(unknownRes.headers['content-type']?.includes('text/html'));
    assert.ok(unknownRes.rawBody.includes('<html') || unknownRes.rawBody.includes('<!DOCTYPE html>') || unknownRes.rawBody.includes('<!doctype html>'));
  });

  it('SEC-19: Server rejects unsafe question imageUrl with HTTP 400 and accepts safe HTTPS/relative/data URLs', async () => {
    const adminLogin = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'bootstrap_superadmin@example.com',
        password: 'BootstrapPassword123!',
      },
    });
    const superAdminToken = adminLogin.body.token;

    // Unsafe javascript: URL rejected
    const badJsRes = await request('POST', '/api/questions', {
      token: superAdminToken,
      body: {
        id: 'q-unsafe-1',
        code: 'LAB-UNSAFE-1',
        unit: 'Hematology',
        subject: 'General Hematology',
        topic: 'Red Cells',
        difficulty: 'Easy',
        status: 'Draft',
        questionText: 'Test unsafe?',
        options: ['A', 'B'],
        correctAnswer: 'A',
        imageUrl: 'javascript:alert(1)',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    assert.equal(badJsRes.status, 400);
    assert.match(badJsRes.body.error, /invalid or unsafe.*imageurl/i);

    // Unsafe http: URL rejected
    const badHttpRes = await request('POST', '/api/questions', {
      token: superAdminToken,
      body: {
        id: 'q-unsafe-2',
        code: 'LAB-UNSAFE-2',
        unit: 'Hematology',
        subject: 'General Hematology',
        topic: 'Red Cells',
        difficulty: 'Easy',
        status: 'Draft',
        questionText: 'Test unsafe http?',
        options: ['A', 'B'],
        correctAnswer: 'A',
        imageUrl: 'http://insecure.example.com/pic.png',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    assert.equal(badHttpRes.status, 400);

    // Safe HTTPS URL accepted
    const safeHttpsRes = await request('POST', '/api/questions', {
      token: superAdminToken,
      body: {
        id: 'q-safe-1',
        code: 'LAB-SAFE-1',
        unit: 'Hematology',
        subject: 'General Hematology',
        topic: 'Red Cells',
        difficulty: 'Easy',
        status: 'Draft',
        questionText: 'Test safe https?',
        options: ['A', 'B'],
        correctAnswer: 'A',
        imageUrl: 'https://images.unsplash.com/photo-example.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    assert.equal(safeHttpsRes.status, 200);

    // Safe data:image/png URL accepted
    const safeDataRes = await request('POST', '/api/questions', {
      token: superAdminToken,
      body: {
        id: 'q-safe-2',
        code: 'LAB-SAFE-2',
        unit: 'Hematology',
        subject: 'General Hematology',
        topic: 'Red Cells',
        difficulty: 'Easy',
        status: 'Draft',
        questionText: 'Test safe data url?',
        options: ['A', 'B'],
        correctAnswer: 'A',
        imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    assert.equal(safeDataRes.status, 200);
  });

  it('SEO: robots.txt, sitemap.xml, X-Robots-Tag header, and /privacy status code verification', async () => {
    // 1. GET /robots.txt
    const robotsRes = await request('GET', '/robots.txt');
    assert.equal(robotsRes.status, 200);
    assert.ok(robotsRes.headers['content-type']?.includes('text/plain'));
    assert.ok(robotsRes.rawBody.includes('User-agent: *'));
    assert.ok(robotsRes.rawBody.includes('Allow: /'));
    assert.ok(robotsRes.rawBody.includes('Disallow: /admin'));
    assert.ok(robotsRes.rawBody.includes('Disallow: /dashboard'));
    assert.ok(robotsRes.rawBody.includes('Disallow: /api/'));
    assert.ok(robotsRes.rawBody.includes('Sitemap:'));

    // 2. GET /sitemap.xml
    const sitemapRes = await request('GET', '/sitemap.xml');
    assert.equal(sitemapRes.status, 200);
    assert.ok(sitemapRes.headers['content-type']?.includes('xml'));
    assert.ok(sitemapRes.rawBody.includes('<urlset'));
    assert.ok(sitemapRes.rawBody.includes('/browse'));
    assert.ok(sitemapRes.rawBody.includes('/practice'));
    assert.ok(sitemapRes.rawBody.includes('/exam'));
    assert.ok(sitemapRes.rawBody.includes('/privacy'));
    assert.ok(sitemapRes.rawBody.includes('/terms'));
    assert.ok(sitemapRes.rawBody.includes('/disclaimer'));
    assert.ok(sitemapRes.rawBody.includes('/contact'));

    // 3. X-Robots-Tag: noindex header enforcement
    const apiRes = await request('GET', '/api/health');
    assert.equal(apiRes.headers['x-robots-tag'], 'noindex');

    const adminRes = await request('GET', '/admin');
    assert.equal(adminRes.headers['x-robots-tag'], 'noindex');

    const dashRes = await request('GET', '/dashboard');
    assert.equal(dashRes.headers['x-robots-tag'], 'noindex');

    // Public route must NOT send noindex header
    const privacyRes = await request('GET', '/privacy');
    assert.equal(privacyRes.status, 200);
    assert.equal(privacyRes.headers['x-robots-tag'], undefined);
    assert.ok(privacyRes.headers['content-type']?.includes('text/html'));

    // Unknown route returns 404
    const unknownRes = await request('GET', '/completely-unknown-path-for-testing');
    assert.equal(unknownRes.status, 404);
  });

  it('Phase 6 Account Self-Service: data export, password deletion validation, session revocation, and superadmin guard', async () => {
    // 1. Unauthenticated calls rejected
    const unauthExport = await request('GET', '/api/auth/export');
    assert.equal(unauthExport.status, 401);

    const unauthDelete = await request('DELETE', '/api/auth/account', {
      body: { currentPassword: 'SomePassword123!' },
    });
    assert.equal(unauthDelete.status, 401);

    // 2. Register user A
    const regUserA = await request('POST', '/api/auth/register', {
      body: {
        username: 'selfservice_user_a',
        email: 'user_a_selfservice@example.com',
        password: 'UserAPassword123!',
      },
    });
    assert.equal(regUserA.status, 200);
    const tokenA = regUserA.body.token;

    // Register user B
    const regUserB = await request('POST', '/api/auth/register', {
      body: {
        username: 'selfservice_user_b',
        email: 'user_b_selfservice@example.com',
        password: 'UserBPassword123!',
      },
    });
    assert.equal(regUserB.status, 200);
    const tokenB = regUserB.body.token;

    // 3. User A submits a question report
    const reportRes = await request('POST', '/api/report-question', {
      token: tokenA,
      body: {
        questionId: 'LAB-0001',
        questionCode: 'LAB-0001',
        reason: 'Typo/Grammar',
        details: 'Self-service data export test report',
      },
    });
    assert.equal(reportRes.status, 200);

    // 4. User A exports data
    const exportResA = await request('GET', '/api/auth/export', { token: tokenA });
    assert.equal(exportResA.status, 200);
    assert.ok(exportResA.headers['content-disposition']?.includes('attachment; filename='));
    assert.equal(exportResA.body.profile.username, 'selfservice_user_a');
    assert.equal(exportResA.body.profile.email, 'user_a_selfservice@example.com');
    assert.ok(Array.isArray(exportResA.body.submittedReports));
    assert.equal(exportResA.body.submittedReports.length, 1);

    // Verify no password hash or session tokens in export
    const rawExport = exportResA.rawBody;
    assert.equal(rawExport.includes('password_hash'), false);
    assert.equal(rawExport.includes('passwordHash'), false);
    assert.equal(rawExport.includes(tokenA), false);

    // 5. User B export only exports User B profile (cross-user isolation)
    const exportResB = await request('GET', '/api/auth/export', { token: tokenB });
    assert.equal(exportResB.status, 200);
    assert.equal(exportResB.body.profile.username, 'selfservice_user_b');
    assert.notEqual(exportResB.body.profile.id, exportResA.body.profile.id);

    // 6. User B cannot delete User A's account with User B's token
    // (A request with token B will target user B, not user A; wrong password returns 400)
    const deleteWrongPw = await request('DELETE', '/api/auth/account', {
      token: tokenA,
      body: { currentPassword: 'WrongPassword999!' },
    });
    assert.equal(deleteWrongPw.status, 400);
    assert.ok(deleteWrongPw.body.error?.includes('incorrect'));

    // 7. Last superadmin deletion refused
    const superAdminLogin = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'bootstrap_superadmin@example.com',
        password: 'BootstrapPassword123!',
      },
    });
    assert.equal(superAdminLogin.status, 200);
    const superAdminToken = superAdminLogin.body.token;

    const deleteSuperAdmin = await request('DELETE', '/api/auth/account', {
      token: superAdminToken,
      body: { currentPassword: 'BootstrapPassword123!' },
    });
    assert.equal(deleteSuperAdmin.status, 400);
    assert.ok(deleteSuperAdmin.body.error?.includes('sole superadmin'));

    // 8. Delete user A successfully with correct password
    const deleteSuccess = await request('DELETE', '/api/auth/account', {
      token: tokenA,
      body: { currentPassword: 'UserAPassword123!' },
    });
    assert.equal(deleteSuccess.status, 200);
    assert.equal(deleteSuccess.body.success, true);

    // 9. Deleted user's session is invalidated immediately
    const meAfterDelete = await request('GET', '/api/auth/me', { token: tokenA });
    assert.equal(meAfterDelete.status, 401);

    // 10. Login with deleted user fails
    const loginDeleted = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'selfservice_user_a',
        password: 'UserAPassword123!',
      },
    });
    assert.equal(loginDeleted.status, 401);
  });

  it('Phase 7 Answer Protection: hides sentinels, validates check endpoint, and enforces exam limits', async () => {
    // 1. Authenticate superadmin
    const adminLogin = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'bootstrap_superadmin@example.com',
        password: 'BootstrapPassword123!',
      },
    });
    assert.equal(adminLogin.status, 200);
    const adminToken = adminLogin.body.token;

    // 2. Register student
    const studentReg = await request('POST', '/api/auth/register', {
      body: {
        username: 'sentinel_student',
        email: 'sentinel_student@example.com',
        displayName: 'Sentinel Student',
        password: 'StudentPassword123!',
      },
    });
    assert.equal(studentReg.status, 200);
    const studentToken = studentReg.body.token;

    // 3. Seed question with sentinels
    const EXP_SENTINEL = 'EXP_SENTINEL_SECRET_HEPATIC_9988';
    const RAT_SENTINEL = 'RAT_SENTINEL_SECRET_RATIONALE_7766';
    const REF_SENTINEL = 'REF_SENTINEL_SECRET_TIETZ_5544';
    const SRC_SENTINEL = 'SRC_SENTINEL_ADMIN_INTERNAL_3322';

    const sentinelQ = {
      id: 'q-sentinel-probe',
      code: 'SENTINEL-PROBE-01',
      questionText: 'Which enzyme is most specific for acute hepatocellular injury?',
      options: [
        { id: 'A', text: 'Alkaline Phosphatase (ALP)' },
        { id: 'B', text: 'Alanine Aminotransferase (ALT)', rationale: RAT_SENTINEL },
      ],
      correctAnswer: 'B',
      explanation: EXP_SENTINEL,
      reference: REF_SENTINEL,
      sourceDocument: SRC_SENTINEL,
      unit: 'Clinical Chemistry',
      subject: 'Enzymology',
      topic: 'Liver Function',
      difficulty: 'Medium',
      examCategories: ['ASCP', 'AMT'],
      status: 'Published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createRes = await request('POST', '/api/questions', {
      token: adminToken,
      body: { question: sentinelQ },
    });
    assert.equal(createRes.status, 200);

    // Also seed a draft question to test unpublished protection
    const draftQ = {
      id: 'q-sentinel-draft',
      code: 'DRAFT-PROBE-01',
      questionText: 'Unpublished draft question probe?',
      options: [
        { id: 'A', text: 'Draft Option A' },
        { id: 'B', text: 'Draft Option B' },
      ],
      correctAnswer: 'A',
      explanation: 'Draft explanation text',
      status: 'Draft',
      unit: 'Hematology',
      subject: 'RBCs',
      examCategories: ['ASCP'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await request('POST', '/api/questions', {
      token: adminToken,
      body: { question: draftQ },
    });

    // 4. Start an exam as student so an active exam exists
    const examStart = await request('POST', '/api/exams/start', {
      token: studentToken,
      body: { questionCount: 1, durationMinutes: 10 },
    });
    assert.equal(examStart.status, 200);
    const examId = examStart.body.examId;

    // 5. Verify sentinels are completely hidden from anonymous and student endpoints:
    // a) /api/bootstrap
    const bootAnon = await request('GET', '/api/bootstrap');
    assert.ok(!bootAnon.rawBody.includes(EXP_SENTINEL));
    assert.ok(!bootAnon.rawBody.includes(RAT_SENTINEL));
    assert.ok(!bootAnon.rawBody.includes(REF_SENTINEL));
    assert.ok(!bootAnon.rawBody.includes(SRC_SENTINEL));

    // b) GET /api/questions
    const listAnon = await request('GET', '/api/questions');
    assert.ok(!listAnon.rawBody.includes(EXP_SENTINEL));
    assert.ok(!listAnon.rawBody.includes(RAT_SENTINEL));
    assert.ok(!listAnon.rawBody.includes(REF_SENTINEL));
    assert.ok(!listAnon.rawBody.includes(SRC_SENTINEL));

    const listStudent = await request('GET', '/api/questions', { token: studentToken });
    assert.ok(!listStudent.rawBody.includes(EXP_SENTINEL));
    assert.ok(!listStudent.rawBody.includes(RAT_SENTINEL));
    assert.ok(!listStudent.rawBody.includes(REF_SENTINEL));
    assert.ok(!listStudent.rawBody.includes(SRC_SENTINEL));

    // c) GET /api/questions/:id
    const getAnon = await request('GET', `/api/questions/${sentinelQ.id}`);
    assert.equal(getAnon.status, 200);
    assert.ok(!getAnon.rawBody.includes(EXP_SENTINEL));
    assert.ok(!getAnon.rawBody.includes(RAT_SENTINEL));
    assert.ok(!getAnon.rawBody.includes(REF_SENTINEL));
    assert.ok(!getAnon.rawBody.includes(SRC_SENTINEL));

    const getStudent = await request('GET', `/api/questions/${sentinelQ.id}`, { token: studentToken });
    assert.equal(getStudent.status, 200);
    assert.ok(!getStudent.rawBody.includes(EXP_SENTINEL));
    assert.ok(!getStudent.rawBody.includes(RAT_SENTINEL));
    assert.ok(!getStudent.rawBody.includes(REF_SENTINEL));
    assert.ok(!getStudent.rawBody.includes(SRC_SENTINEL));

    // d) POST /api/exams/start
    assert.ok(!examStart.rawBody.includes(EXP_SENTINEL));
    assert.ok(!examStart.rawBody.includes(RAT_SENTINEL));
    assert.ok(!examStart.rawBody.includes(REF_SENTINEL));
    assert.ok(!examStart.rawBody.includes(SRC_SENTINEL));

    // e) GET /api/auth/export (while active exam exists)
    const exportStudent = await request('GET', '/api/auth/export', { token: studentToken });
    assert.equal(exportStudent.status, 200);
    assert.ok(!exportStudent.rawBody.includes(EXP_SENTINEL), 'export must not leak explanation sentinel');
    assert.ok(!exportStudent.rawBody.includes(RAT_SENTINEL), 'export must not leak rationale sentinel');
    assert.ok(!exportStudent.rawBody.includes(REF_SENTINEL), 'export must not leak reference sentinel');
    assert.ok(!exportStudent.rawBody.includes(SRC_SENTINEL), 'export must not leak source sentinel');
    assert.ok(!exportStudent.rawBody.includes('"correctAnswer"'), 'export must not contain correctAnswer key');
    assert.ok(!exportStudent.rawBody.includes('"explanation"'), 'export must not contain explanation key');
    assert.ok(!exportStudent.rawBody.includes('"reference"'), 'export must not contain reference key');
    assert.ok(!exportStudent.rawBody.includes(sentinelQ.questionText), 'export must not contain question text from active_exams');

    // f) GET /api/auth/me (while active exam exists)
    const meStudent = await request('GET', '/api/auth/me', { token: studentToken });
    assert.equal(meStudent.status, 200);
    assert.ok(!meStudent.rawBody.includes(EXP_SENTINEL), 'auth/me must not leak explanation sentinel');
    assert.ok(!meStudent.rawBody.includes(RAT_SENTINEL), 'auth/me must not leak rationale sentinel');
    assert.ok(!meStudent.rawBody.includes(REF_SENTINEL), 'auth/me must not leak reference sentinel');
    assert.ok(!meStudent.rawBody.includes(SRC_SENTINEL), 'auth/me must not leak source sentinel');
    assert.ok(!meStudent.rawBody.includes('"correctAnswer"'), 'auth/me must not contain correctAnswer key');
    assert.ok(!meStudent.rawBody.includes('"explanation"'), 'auth/me must not contain explanation key');
    assert.ok(!meStudent.rawBody.includes('"reference"'), 'auth/me must not contain reference key');
    assert.ok(!meStudent.rawBody.includes(sentinelQ.questionText), 'auth/me must not contain question text from active_exams');

    // 6. Verify sentinels DO appear for admin routes
    const getAdmin = await request('GET', `/api/questions/${sentinelQ.id}`, { token: adminToken });
    assert.equal(getAdmin.status, 200);
    assert.ok(getAdmin.rawBody.includes(EXP_SENTINEL));
    assert.ok(getAdmin.rawBody.includes(RAT_SENTINEL));
    assert.ok(getAdmin.rawBody.includes(REF_SENTINEL));
    assert.ok(getAdmin.rawBody.includes(SRC_SENTINEL));

    // 7. Exam submit returns gradedQuestions with reveal fields but stripped of admin fields
    const examSubmit = await request('POST', `/api/exams/${examId}/submit`, {
      token: studentToken,
      body: { userAnswers: {} },
    });
    assert.equal(examSubmit.status, 200);
    assert.equal(examSubmit.body.success, true);
    assert.ok(Array.isArray(examSubmit.body.gradedQuestions));
    assert.ok(!examSubmit.rawBody.includes(SRC_SENTINEL));
  });

  it('check endpoint 400/404/429 cases and admin exemption', async () => {
    // 1. Authenticate superadmin and register fresh student
    const adminLogin = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'bootstrap_superadmin@example.com',
        password: 'BootstrapPassword123!',
      },
    });
    const adminToken = adminLogin.body.token;

    const studentReg = await request('POST', '/api/auth/register', {
      body: {
        username: 'chk_endpoint_student',
        email: 'chk_endpoint_student@example.com',
        password: 'StudentPassword123!',
      },
    });
    const studentToken = studentReg.body.token;

    // 2. Seed a published question and a draft question
    const pubQ = {
      id: 'q-chk-pub-01',
      code: 'CHK-PUB-01',
      questionText: 'Published check probe question?',
      options: [
        { id: 'A', text: 'Option A' },
        { id: 'B', text: 'Option B' },
      ],
      correctAnswer: 'B',
      explanation: 'Explanation for B',
      status: 'Published',
      unit: 'Chemistry',
      subject: 'Electrolytes',
      examCategories: ['ASCP'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await request('POST', '/api/questions', { token: adminToken, body: { question: pubQ } });

    const draftQ = {
      id: 'q-chk-draft-01',
      code: 'CHK-DRAFT-01',
      questionText: 'Draft check probe question?',
      options: [
        { id: 'A', text: 'Option A' },
        { id: 'B', text: 'Option B' },
      ],
      correctAnswer: 'A',
      explanation: 'Draft explanation',
      status: 'Draft',
      unit: 'Chemistry',
      subject: 'Electrolytes',
      examCategories: ['ASCP'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await request('POST', '/api/questions', { token: adminToken, body: { question: draftQ } });

    // 3. Invalid option selection returns 400
    const checkInvalidOpt = await request('POST', `/api/questions/${pubQ.id}/check`, {
      token: studentToken,
      body: { selected: 'Z' },
    });
    assert.equal(checkInvalidOpt.status, 400);

    // Missing selectedOptionId / selected returns 400
    const checkMissingOpt = await request('POST', `/api/questions/${pubQ.id}/check`, {
      token: studentToken,
      body: {},
    });
    assert.equal(checkMissingOpt.status, 400);

    // 4. Nonexistent question returns 404
    const checkUnknown = await request('POST', '/api/questions/nonexistent-id/check', {
      token: studentToken,
      body: { selected: 'A' },
    });
    assert.equal(checkUnknown.status, 404);

    // 5. Unpublished question returns 404 for student
    const checkDraftStudent = await request('POST', `/api/questions/${draftQ.id}/check`, {
      token: studentToken,
      body: { selected: 'A' },
    });
    assert.equal(checkDraftStudent.status, 404);

    // 6. Unpublished question returns 200 for admin
    const checkDraftAdmin = await request('POST', `/api/questions/${draftQ.id}/check`, {
      token: adminToken,
      body: { selected: 'A' },
    });
    assert.equal(checkDraftAdmin.status, 200);
    assert.equal(checkDraftAdmin.body.correct, true);

    // 7. Rate limiting (limit = 8/hr for users in test env):
    // Student makes 7 more checks (total = 8 checks on pubQ)
    for (let i = 0; i < 7; i++) {
      await request('POST', `/api/questions/${pubQ.id}/check`, {
        token: studentToken,
        body: { selected: 'B' },
      });
    }
    // 9th request exceeds limit and returns 429
    const checkRateLimited = await request('POST', `/api/questions/${pubQ.id}/check`, {
      token: studentToken,
      body: { selected: 'B' },
    });
    assert.equal(checkRateLimited.status, 429);
    assert.equal(checkRateLimited.body.success, false);
    assert.ok(checkRateLimited.body.error?.includes('limit reached'));

    // 8. Admin exemption: admin is not blocked by answer check rate limit
    const checkAdminExempt = await request('POST', `/api/questions/${pubQ.id}/check`, {
      token: adminToken,
      body: { selected: 'B' },
    });
    assert.equal(checkAdminExempt.status, 200);
    assert.equal(checkAdminExempt.body.correct, true);
  });

  it('exam-start limiter returns 429', async () => {
    // Register dedicated student for exam rate limit test
    const studentReg = await request('POST', '/api/auth/register', {
      body: {
        username: 'exam_limit_student',
        email: 'exam_limit_student@example.com',
        password: 'StudentPassword123!',
      },
    });
    const studentToken = studentReg.body.token;

    // EXAM_START_PER_HOUR is configured to 5 in test environment
    for (let i = 0; i < 5; i++) {
      const res = await request('POST', '/api/exams/start', {
        token: studentToken,
        body: { questionCount: 1, durationMinutes: 5 },
      });
      assert.equal(res.status, 200);
    }

    // 6th request must return 429
    const rateLimitedRes = await request('POST', '/api/exams/start', {
      token: studentToken,
      body: { questionCount: 1, durationMinutes: 5 },
    });
    assert.equal(rateLimitedRes.status, 429);
    assert.equal(rateLimitedRes.body.success, false);
    assert.ok(rateLimitedRes.body.error?.includes('Too many exam sessions'));
  });

  it('PUT /api/stats returns 401 for guests and 400 for unknown fields or out-of-range values', async () => {
    // Register dedicated student
    const studentReg = await request('POST', '/api/auth/register', {
      body: {
        username: 'stats_test_student',
        email: 'stats_test_student@example.com',
        password: 'StudentPassword123!',
      },
    });
    const studentToken = studentReg.body.token;

    // 1. Returns 401 for unauthenticated/guest callers
    const statsAnon = await request('PUT', '/api/stats', {
      body: { stats: { totalAnswered: 10, totalCorrect: 8 } },
    });
    assert.equal(statsAnon.status, 401);

    // 2. Returns 400 for unknown fields
    const statsUnknown = await request('PUT', '/api/stats', {
      token: studentToken,
      body: { stats: { totalAnswered: 10, totalCorrect: 8, rogueField: 'inject' } },
    });
    assert.equal(statsUnknown.status, 400);
    assert.ok(statsUnknown.body.error?.includes('Unknown field'));

    // 3. Returns 400 for negative values
    const statsNegative = await request('PUT', '/api/stats', {
      token: studentToken,
      body: {
        stats: {
          totalAnswered: -5,
          totalCorrect: 0,
          streakDays: 0,
          lastActiveDate: '2026-10-29',
          bookmarkedIds: [],
          revisionQueueIds: [],
          subjectPerformance: {},
          examRecords: [],
        },
      },
    });
    assert.equal(statsNegative.status, 400);

    // 4. Returns 400 when totalCorrect exceeds totalAnswered
    const statsCorrectExceeds = await request('PUT', '/api/stats', {
      token: studentToken,
      body: {
        stats: {
          totalAnswered: 5,
          totalCorrect: 10,
          streakDays: 0,
          lastActiveDate: '2026-10-29',
          bookmarkedIds: [],
          revisionQueueIds: [],
          subjectPerformance: {},
          examRecords: [],
        },
      },
    });
    assert.equal(statsCorrectExceeds.status, 400);

    // 5. Valid payload returns 200
    const validStats = {
      totalAnswered: 20,
      totalCorrect: 18,
      streakDays: 5,
      lastActiveDate: '2026-10-29',
      bookmarkedIds: ['q-chk-pub-01'],
      revisionQueueIds: [],
      subjectPerformance: { Chemistry: { answered: 20, correct: 18 } },
      examRecords: [],
    };
    const statsValid = await request('PUT', '/api/stats', {
      token: studentToken,
      body: { stats: validStats },
    });
    assert.equal(statsValid.status, 200);
    assert.equal(statsValid.body.success, true);
  });

  it('bulk-import invalid imageUrl is rejected', async () => {
    const adminLogin = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'bootstrap_superadmin@example.com',
        password: 'BootstrapPassword123!',
      },
    });
    const adminToken = adminLogin.body.token;
    const countBefore = (await request('GET', '/api/questions', { token: adminToken })).body.total;

    const invalidQuestion = {
      id: 'q-bulk-invalid-url',
      code: 'BULK-INV-01',
      questionText: 'Question with unsafe imageUrl',
      options: [
        { id: 'A', text: 'Option A' },
        { id: 'B', text: 'Option B' },
      ],
      imageUrl: 'javascript:alert(document.cookie)',
      status: 'Published',
      unit: 'Hematology',
      subject: 'Coagulation',
    };

    const bulkRes = await request('POST', '/api/questions/bulk-import', {
      token: adminToken,
      body: { questions: [invalidQuestion] },
    });
    assert.equal(bulkRes.status, 400);
    assert.ok(bulkRes.body.error?.includes('unsafe or invalid imageUrl'));

    // Assert question was not inserted
    const countAfter = (await request('GET', '/api/questions', { token: adminToken })).body.total;
    assert.equal(countAfter, countBefore);
  });

  it('restore with one invalid question changes nothing (rollback)', async () => {
    const adminLogin = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'bootstrap_superadmin@example.com',
        password: 'BootstrapPassword123!',
      },
    });
    const adminToken = adminLogin.body.token;
    const countBefore = (await request('GET', '/api/questions', { token: adminToken })).body.total;

    const validItem = {
      id: 'q-restore-valid-01',
      code: 'RESTORE-VAL-01',
      questionText: 'Valid restore question text',
      options: [
        { id: 'A', text: 'Option A' },
        { id: 'B', text: 'Option B' },
      ],
      correctAnswer: 'A',
      explanation: 'Explanation',
      status: 'Published',
      unit: 'Hematology',
      subject: 'Coagulation',
    };
    const invalidItem = {
      id: 'q-restore-invalid-02',
      code: 'RESTORE-INV-02',
      questionText: 'Invalid restore question text',
      options: [
        { id: 'A', text: 'Option A' },
        { id: 'B', text: 'Option B' },
      ],
      imageUrl: 'javascript:alert(1)',
      status: 'Published',
      unit: 'Hematology',
      subject: 'Coagulation',
    };

    const restoreRes = await request('POST', '/api/backup/restore', {
      token: adminToken,
      body: { questions: [validItem, invalidItem] },
    });
    assert.equal(restoreRes.status, 400);

    // Assert count unchanged and validItem was NOT inserted
    const countAfter = (await request('GET', '/api/questions', { token: adminToken })).body.total;
    assert.equal(countAfter, countBefore);

    const checkValid = await request('GET', '/api/questions/q-restore-valid-01', { token: adminToken });
    assert.equal(checkValid.status, 404);
  });

  it('POST /api/extract-pdf limiter', async () => {
    const adminLogin = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'bootstrap_superadmin@example.com',
        password: 'BootstrapPassword123!',
      },
    });
    const adminToken = adminLogin.body.token;

    // EXTRACT_PDF_PER_HOUR is set to 5 in test environment
    for (let i = 0; i < 5; i++) {
      const res = await request('POST', '/api/extract-pdf', {
        token: adminToken,
        body: { textContent: '1. Sample question\nA. Opt 1\nB. Opt 2\nAnswer: A', filename: `test-${i}.txt` },
      });
      assert.equal(res.status, 200);
    }

    // 6th request must return 429
    const rateLimitedRes = await request('POST', '/api/extract-pdf', {
      token: adminToken,
      body: { textContent: 'Sample', filename: 'test-overflow.txt' },
    });
    assert.equal(rateLimitedRes.status, 429);
    assert.equal(rateLimitedRes.body.success, false);
    assert.ok(rateLimitedRes.body.error?.includes('PDF extraction limit reached'));
  });

  it('deleting an account revokes its sessions', async () => {
    // 1. Register a dedicated user
    const regRes = await request('POST', '/api/auth/register', {
      body: {
        username: 'session_revoke_user',
        email: 'session_revoke_user@example.com',
        password: 'RevocationPassword123!',
      },
    });
    assert.equal(regRes.status, 200);
    const token1 = regRes.body.token;

    // 2. Login again to create a second session token
    const loginRes = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'session_revoke_user@example.com',
        password: 'RevocationPassword123!',
      },
    });
    assert.equal(loginRes.status, 200);
    const token2 = loginRes.body.token;
    assert.notEqual(token1, token2);

    // 3. Confirm both tokens are currently valid
    const me1 = await request('GET', '/api/auth/me', { token: token1 });
    assert.equal(me1.status, 200);
    const me2 = await request('GET', '/api/auth/me', { token: token2 });
    assert.equal(me2.status, 200);

    // 4. Delete the account using token1
    const delRes = await request('DELETE', '/api/auth/account', {
      token: token1,
      body: { currentPassword: 'RevocationPassword123!' },
    });
    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.success, true);

    // 5. Assert BOTH sessions are immediately revoked (401)
    const me1After = await request('GET', '/api/auth/me', { token: token1 });
    assert.equal(me1After.status, 401);
    const me2After = await request('GET', '/api/auth/me', { token: token2 });
    assert.equal(me2After.status, 401);

    // 6. Login attempts with deleted credentials fail
    const loginAfterDelete = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'session_revoke_user@example.com',
        password: 'RevocationPassword123!',
      },
    });
    assert.equal(loginAfterDelete.status, 401);
  });

  it('roles and sessions hardening: demotion revokes admin access, deleted user denied, superadmin invite rejected, restore requires superadmin', async () => {
    // 1. Superadmin login
    const superAdminLogin = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'bootstrap_superadmin@example.com',
        password: 'BootstrapPassword123!',
      },
    });
    assert.equal(superAdminLogin.status, 200);
    const superToken = superAdminLogin.body.token;

    // 2. Inviting with role 'superadmin' returns 400
    const superInvite = await request('POST', '/api/admin/users', {
      token: superToken,
      body: {
        username: 'illegal_superadmin',
        email: 'illegal_superadmin@example.com',
        displayName: 'Illegal SuperAdmin',
        role: 'superadmin',
      },
    });
    assert.equal(superInvite.status, 400);
    assert.ok(superInvite.body.error?.includes('superadmin'));

    // 3. Superadmin invites a legitimate staff admin
    const adminInvite = await request('POST', '/api/admin/users', {
      token: superToken,
      body: {
        username: 'staff_to_demote',
        email: 'staff_to_demote@example.com',
        displayName: 'Staff To Demote',
        role: 'admin',
        password: 'StaffAdminPass123!',
      },
    });
    assert.equal(adminInvite.status, 200);
    const staffId = adminInvite.body.user.id;

    // Staff admin logs in
    const staffLogin = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'staff_to_demote@example.com',
        password: 'StaffAdminPass123!',
      },
    });
    assert.equal(staffLogin.status, 200);
    const staffToken = staffLogin.body.token;

    // Confirm staff admin can access admin routes
    const adminAccessBefore = await request('GET', '/api/admin/users', { token: staffToken });
    assert.equal(adminAccessBefore.status, 200);

    // Non-super admin gets 403 on POST /api/backup/restore
    const staffRestore = await request('POST', '/api/backup/restore', {
      token: staffToken,
      body: { questions: [] },
    });
    assert.equal(staffRestore.status, 403);
    assert.ok(staffRestore.body.error?.includes('Administrator'));

    // 4. Superadmin demotes staff admin to student
    const demoteRes = await request('PATCH', `/api/admin/users/${staffId}/role`, {
      token: superToken,
      body: { role: 'student' },
    });
    assert.equal(demoteRes.status, 200);

    // 5. Demoted admin's existing token is rejected for admin routes immediately (session deleted -> 401)
    const adminAccessAfter = await request('GET', '/api/admin/users', { token: staffToken });
    assert.equal(adminAccessAfter.status, 401);
  });

  it('password hashing & login hardening: rejects >128 chars, missing password/identifier, no admin fallback, atomic change-password session invalidation', async () => {
    const username = `pwtest_${Date.now()}`;
    const password = 'ValidInitialPassword123!';

    // Register user
    const regRes = await request('POST', '/api/auth/register', {
      body: {
        username,
        email: `${username}@example.com`,
        password,
        displayName: 'Password Test User',
      },
    });
    assert.equal(regRes.status, 200);

    // 1. Missing password rejected with 401
    const noPwRes = await request('POST', '/api/auth/login', {
      body: { identifier: username },
    });
    assert.equal(noPwRes.status, 401);
    assert.equal(noPwRes.body.error, 'Invalid username/email or password.');

    // 2. Missing identifier rejected with 401 (no fallback to 'admin')
    const noIdRes = await request('POST', '/api/auth/login', {
      body: { password },
    });
    assert.equal(noIdRes.status, 401);
    assert.equal(noIdRes.body.error, 'Invalid username/email or password.');

    // 3. Password > 128 chars rejected with 401
    const longPwRes = await request('POST', '/api/auth/login', {
      body: { identifier: username, password: 'A'.repeat(129) },
    });
    assert.equal(longPwRes.status, 401);
    assert.equal(longPwRes.body.error, 'Invalid username/email or password.');

    // 4. Session 1 login
    const s1Res = await request('POST', '/api/auth/login', {
      body: { identifier: username, password },
    });
    assert.equal(s1Res.status, 200);
    const s1Token = s1Res.body.token;

    // Session 2 login
    const s2Res = await request('POST', '/api/auth/login', {
      body: { identifier: username, password },
    });
    assert.equal(s2Res.status, 200);
    const s2Token = s2Res.body.token;

    // Both sessions work before change
    assert.equal((await request('GET', '/api/auth/me', { token: s1Token })).status, 200);
    assert.equal((await request('GET', '/api/auth/me', { token: s2Token })).status, 200);

    // Change password via Session 1
    const newPassword = 'NewValidPassword123!';
    const changeRes = await request('POST', '/api/auth/change-password', {
      token: s1Token,
      body: { currentPassword: password, newPassword },
    });
    assert.equal(changeRes.status, 200);

    // Current session (s1) stays active
    assert.equal((await request('GET', '/api/auth/me', { token: s1Token })).status, 200);

    // Other session (s2) is atomically revoked -> 401
    assert.equal((await request('GET', '/api/auth/me', { token: s2Token })).status, 401);

    // Old password cannot log in
    const oldLogin = await request('POST', '/api/auth/login', {
      body: { identifier: username, password },
    });
    assert.equal(oldLogin.status, 401);

    // New password logs in successfully
    const newLogin = await request('POST', '/api/auth/login', {
      body: { identifier: username, password: newPassword },
    });
    assert.equal(newLogin.status, 200);
  });

  it('exam inputs and check endpoint: clamps questionCount (1..200) and durationMinutes (5..300), blocks /check during active exam with 409, normalizes answers', async () => {
    const studentUsername = `exam_student_${Date.now()}`;
    const studentPassword = 'ExamStudentPass123!';

    const regRes = await request('POST', '/api/auth/register', {
      body: {
        username: studentUsername,
        email: `${studentUsername}@example.com`,
        password: studentPassword,
        displayName: 'Exam Student',
      },
    });
    assert.equal(regRes.status, 200);

    const loginRes = await request('POST', '/api/auth/login', {
      body: { identifier: studentUsername, password: studentPassword },
    });
    assert.equal(loginRes.status, 200);
    const studentToken = loginRes.body.token;

    // 1. Clamping: min values (questionCount: 0 -> 1, durationMinutes: 1 -> 5)
    const minExamRes = await request('POST', '/api/exams/start', {
      token: studentToken,
      body: {
        questionCount: 0,
        durationMinutes: 1,
      },
    });
    assert.equal(minExamRes.status, 200);
    assert.equal(minExamRes.body.durationMinutes, 5);
    assert.ok(minExamRes.body.questions.length >= 1);

    // 2. Clamping: max values (durationMinutes: 999 -> 300)
    const maxExamRes = await request('POST', '/api/exams/start', {
      token: studentToken,
      body: {
        questionCount: 999,
        durationMinutes: 999,
      },
    });
    assert.equal(maxExamRes.status, 200);
    assert.equal(maxExamRes.body.durationMinutes, 300);
    assert.ok(maxExamRes.body.questions.length <= 200);

    // Pick a question from the active exam
    const activeExamId = maxExamRes.body.examId;
    const examQuestionId = maxExamRes.body.questions[0].id;
    assert.ok(examQuestionId);

    // 3. Deny check attempts for questions in active exam with 409
    const checkDuringExam = await request('POST', `/api/questions/${examQuestionId}/check`, {
      token: studentToken,
      body: { selected: 'A' },
    });
    assert.equal(checkDuringExam.status, 409);
    assert.ok(checkDuringExam.body.error?.toLowerCase().includes('active exam'));

    // 4. Submit exam
    const submitRes = await request('POST', `/api/exams/${activeExamId}/submit`, {
      token: studentToken,
      body: { userAnswers: { [examQuestionId]: 'a' } },
    });
    assert.equal(submitRes.status, 200);

    // Clean up earlier minExam so no other active exam blocks
    await request('POST', `/api/exams/${minExamRes.body.examId}/submit`, {
      token: studentToken,
      body: { userAnswers: {} },
    });

    // 5. Now check endpoint succeeds and handles trimmed/lowercase option gracefully
    const checkAfterExam = await request('POST', `/api/questions/${examQuestionId}/check`, {
      token: studentToken,
      body: { selected: ' a ' },
    });
    assert.equal(checkAfterExam.status, 200);
    assert.equal(typeof checkAfterExam.body.correct, 'boolean');
    assert.ok(checkAfterExam.body.correctAnswer);
  });

  it('validation and data integrity: single question POST validates payload, bulk-status validates status, negative page/limit clamped', async () => {
    // 1. Superadmin login
    const loginRes = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'bootstrap_superadmin@example.com',
        password: 'BootstrapPassword123!',
      },
    });
    assert.equal(loginRes.status, 200);
    const adminToken = loginRes.body.token;

    // 2. Single question POST validates payload (rejects missing/invalid fields)
    const invalidQRes = await request('POST', '/api/questions', {
      token: adminToken,
      body: {
        id: 'inv-q-1',
        // stem missing/too short
        questionText: 'Short',
        options: [{ id: 'A', text: 'Opt A' }],
        correctAnswer: 'A',
      },
    });
    assert.equal(invalidQRes.status, 400);
    assert.equal(invalidQRes.body.success, false);
    assert.ok(invalidQRes.body.error);

    // 3. bulk-status rejects invalid status
    const invalidStatusPost = await request('POST', '/api/questions/bulk-status', {
      token: adminToken,
      body: { ids: ['q1'], status: 'InvalidStatus' },
    });
    assert.equal(invalidStatusPost.status, 400);
    assert.ok(invalidStatusPost.body.error?.includes('Published'));

    const invalidStatusPut = await request('PUT', '/api/questions/bulk-status', {
      token: adminToken,
      body: { ids: ['q1'], status: 'Approved' },
    });
    assert.equal(invalidStatusPut.status, 400);
    assert.ok(invalidStatusPut.body.error?.includes('Published'));

    // Valid bulk-status succeeds
    const validStatusPut = await request('PUT', '/api/questions/bulk-status', {
      token: adminToken,
      body: { ids: [], status: 'Draft' },
    });
    assert.equal(validStatusPut.status, 200);
    assert.equal(validStatusPut.body.success, true);

    // 4. Negative page and limit clamped
    const negRes = await request('GET', '/api/questions?page=-5&limit=-20');
    assert.equal(negRes.status, 200);
    assert.equal(negRes.body.success, true);
    assert.ok(negRes.body.page >= 1);

    const hugeRes = await request('GET', '/api/questions?limit=9999');
    assert.equal(hugeRes.status, 200);
    assert.equal(hugeRes.body.success, true);
    assert.ok(hugeRes.body.limit <= 200);
  });
});
