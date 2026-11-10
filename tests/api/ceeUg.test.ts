import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, ChildProcess } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

let serverProcess: ChildProcess;
let tempDir: string;
const PORT = 4900 + Math.floor(Math.random() * 400);

function request(
  method: string,
  reqPath: string,
  options: { headers?: Record<string, string>; body?: any; token?: string } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any; rawBody: string }> {
  return new Promise((resolve, reject) => {
    let payload = '';
    const headers: Record<string, string> = { ...(options.headers || {}) };
    if (options.token) headers['Authorization'] = `Bearer ${options.token}`;
    if (options.body !== undefined) {
      payload = JSON.stringify(options.body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = String(Buffer.byteLength(payload));
    }

    const req = http.request(
      { host: '127.0.0.1', port: PORT, path: reqPath, method, headers },
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
          resolve({ status: res.statusCode || 0, headers: res.headers, body: parsed, rawBody });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/** Creates a published question whose correct option text is uniquely identifiable. */
async function createQuestion(
  token: string,
  id: string,
  unit: string,
  subject: string
): Promise<string> {
  const res = await request('POST', '/api/questions', {
    token,
    body: {
      id,
      code: `CEE-${id.toUpperCase()}`,
      unit,
      subject,
      topic: 'Sample topic',
      difficulty: 'Conceptual',
      status: 'Published',
      questionText: `${unit} sample question ${id}?`,
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      explanation: 'Sample explanation',
      reference: 'Sample reference',
      examCategories: ['CEE-UG'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
  assert.equal(res.status, 200, `failed to create question ${id}: ${res.rawBody}`);
  return res.body.question.id;
}

describe('CEE-UG Entrance Mock Suite', () => {
  let adminToken = '';

  before(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medlab-ceeug-test-'));
    serverProcess = spawn('npx', ['tsx', 'server.ts'], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: String(PORT),
        DATA_DIR: tempDir,
        SUPABASE_URL: '',
        SUPABASE_SERVICE_ROLE_KEY: '',
        SUPABASE_ANON_KEY: '',
        INITIAL_ADMIN_EMAIL: 'ceeug_superadmin@example.com',
        INITIAL_ADMIN_PASSWORD: 'BootstrapPassword123!',
        EXAM_START_PER_HOUR: '100',
        RATE_LIMIT_REGISTER_MAX: '50',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let ready = false;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 250));
      try {
        const res = await request('GET', '/api/health');
        if (res.status === 200) {
          ready = true;
          break;
        }
      } catch {
        // still booting
      }
    }
    if (!ready) throw new Error(`Server failed to boot on port ${PORT}`);

    const login = await request('POST', '/api/auth/login', {
      body: { identifier: 'ceeug_superadmin@example.com', password: 'BootstrapPassword123!' },
    });
    assert.equal(login.status, 200);
    adminToken = login.body.token;
  });

  after(async () => {
    if (serverProcess) {
      const exited = new Promise((resolve) => serverProcess.on('exit', resolve));
      serverProcess.kill('SIGTERM');
      await exited;
    }
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup failures
      }
    }
  });

  it('refuses to start when the CEE-UG question bank is empty', async () => {
    const res = await request('POST', '/api/cee-ug/exams/start', { body: {} });
    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.match(res.body.error, /CEE-UG question bank is empty/i);
    assert.equal(res.body.availableCount, 0);
  });

  it('does not add entrance subjects into the site taxonomy (CEE-UG is mock-test only)', async () => {
    const res = await request('GET', '/api/bootstrap');
    assert.equal(res.status, 200);
    const names = (res.body.categories || []).map((c: any) => c.name);
    for (const unit of ['Physics', 'Chemistry', 'Biology', 'Mental Ability']) {
      assert.ok(!names.includes(unit), `entrance subject should not be in taxonomy: ${unit}`);
    }
  });

  it('assembles the 200-question / 180-minute / −0.25 paper and grades it', async () => {
    for (let i = 0; i < 10; i++) {
      await createQuestion(adminToken, `cee-bulk-${i + 1}`, 'General', 'General');
    }

    const start = await request('POST', '/api/cee-ug/exams/start', { body: { shuffleOptions: true } });
    assert.equal(start.status, 200, start.rawBody);
    assert.equal(start.body.success, true);
    assert.equal(start.body.examType, 'CEE-UG');
    assert.equal(start.body.durationMinutes, 180);
    assert.equal(start.body.negativeMarking, true);
    assert.equal(start.body.penaltyPerWrong, 0.25);
    assert.equal(start.body.passingPercentage, 50);
    assert.equal(start.body.requestedCount, 200);
    assert.equal(start.body.servedCount, 10);
    assert.equal(start.body.questions.length, 10);

    // The public payload must never leak the answer key.
    for (const q of start.body.questions) {
      assert.equal(q.correctAnswer, undefined);
      assert.equal(q.explanation, undefined);
    }

    // Answer the first question correctly and the second one incorrectly.
    const findCorrectOption = (q: any) => q.options.find((o: any) => o.text === 'A');
    const findWrongOption = (q: any) => q.options.find((o: any) => o.text !== 'A');
    const correctPick = findCorrectOption(start.body.questions[0]);
    const wrongPick = findWrongOption(start.body.questions[1]);
    assert.ok(correctPick && wrongPick);

    const submit = await request('POST', `/api/exams/${start.body.examId}/submit`, {
      body: {
        userAnswers: {
          [start.body.questions[0].id]: correctPick.id,
          [start.body.questions[1].id]: wrongPick.id,
        },
        timeSpentSeconds: 60,
      },
    });
    assert.equal(submit.status, 200, submit.rawBody);
    assert.equal(submit.body.success, true);

    const result = submit.body.result;
    assert.equal(result.total, 10);
    assert.equal(result.correctCount, 1);
    assert.equal(result.incorrectCount, 1);
    assert.equal(result.unansweredCount, 8);
    assert.equal(result.negativeMarking, true);
    assert.equal(result.penaltyPerWrong, 0.25);
    assert.equal(result.penaltyPoints, 0.25);
    assert.equal(result.score, 0.75);
    // 50% pass mark is applied, so a single correct answer out of ten fails.
    assert.equal(result.passed, false);
    // Section-wise performance is reported per subject for the scorecard.
    assert.ok(Object.keys(result.subjectPerformance).length > 0);

    // Graded questions reveal answers & explanations only after submission.
    const graded = submit.body.gradedQuestions.find(
      (q: any) => q.id === start.body.questions[0].id
    );
    assert.ok(graded.correctAnswer);
  });

  it('keeps CEE-UG out of the existing licensing mock-test category list', async () => {
    // The licensing endpoint still validates against its own category vocabulary;
    // CEE-UG questions are served only by the dedicated endpoint.
    const res = await request('POST', '/api/exams/start', {
      body: {
        examCategory: 'ASCP',
        unit: 'All',
        difficulty: 'All',
        questionCount: 5,
        durationMinutes: 15,
        shuffleOptions: false,
        negativeMarking: false,
      },
    });
    assert.equal(res.status, 200, res.rawBody);
    // No ASCP-tagged questions were seeded in this suite.
    assert.equal(res.body.questions.length, 0);
  });
});
