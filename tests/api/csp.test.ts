import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function requestHeader(port: number, reqPath: string): Promise<http.IncomingHttpHeaders> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: reqPath,
        method: 'GET',
      },
      (res) => {
        res.resume();
        res.on('end', () => resolve(res.headers));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

describe('CSP Mode Configuration Suite', () => {
  it('sends Content-Security-Policy-Report-Only by default and Content-Security-Policy in enforce mode', async () => {
    const tempDirReport = fs.mkdtempSync(path.join(os.tmpdir(), 'prayogshala-csp-report-'));
    const tempDirEnforce = fs.mkdtempSync(path.join(os.tmpdir(), 'prayogshala-csp-enforce-'));
    const portReport = 4800 + Math.floor(Math.random() * 100);
    const portEnforce = 4900 + Math.floor(Math.random() * 100);

    const procReport = spawn('npx', ['tsx', 'server.ts'], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(portReport),
        DATA_DIR: tempDirReport,
        CSP_MODE: 'report-only',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const procEnforce = spawn('npx', ['tsx', 'server.ts'], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(portEnforce),
        DATA_DIR: tempDirEnforce,
        CSP_MODE: 'enforce',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const waitForPort = async (port: number) => {
      for (let i = 0; i < 40; i++) {
        try {
          const res = await fetch(`http://127.0.0.1:${port}/api/health`);
          if (res.ok) return;
        } catch {}
        await new Promise((r) => setTimeout(r, 200));
      }
      throw new Error(`Server on port ${port} failed to start`);
    };

    try {
      await Promise.all([waitForPort(portReport), waitForPort(portEnforce)]);

      // 1. Verify Report-Only Mode
      const reportHeaders = await requestHeader(portReport, '/api/health');
      assert.ok(
        reportHeaders['content-security-policy-report-only'],
        'Report-only mode must emit Content-Security-Policy-Report-Only header'
      );
      assert.equal(
        reportHeaders['content-security-policy'],
        undefined,
        'Report-only mode must NOT emit Content-Security-Policy header'
      );

      // 2. Verify Enforce Mode
      const enforceHeaders = await requestHeader(portEnforce, '/api/health');
      assert.ok(
        enforceHeaders['content-security-policy'],
        'Enforce mode must emit Content-Security-Policy header'
      );
      assert.equal(
        enforceHeaders['content-security-policy-report-only'],
        undefined,
        'Enforce mode must NOT emit Content-Security-Policy-Report-Only header'
      );

      // Verify directives match in enforce mode
      const cspDirectives = enforceHeaders['content-security-policy'];
      assert.ok(cspDirectives.includes("default-src 'self'"));
      assert.ok(cspDirectives.includes("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"));
      assert.ok(cspDirectives.includes("font-src 'self' https://fonts.gstatic.com"));
      assert.ok(cspDirectives.includes("script-src 'self'"));
    } finally {
      procReport.kill('SIGTERM');
      procEnforce.kill('SIGTERM');
      try {
        fs.rmSync(tempDirReport, { recursive: true, force: true });
        fs.rmSync(tempDirEnforce, { recursive: true, force: true });
      } catch {}
    }
  });
});
