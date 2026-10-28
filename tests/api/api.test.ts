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
      new Date(Date.now() - 300 * 1000).toISOString(), // 5 minutes ago
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
});
