import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { performDatabaseBackup } from '../../src/server/backup';

describe('Database Backup & Rotation Suite', () => {
  it('creates a consistent point-in-time SQLite snapshot via VACUUM INTO and rotates to keep N', async () => {
    const tempBackupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prayogshala-backup-test-'));

    try {
      // 1. Initial backup
      const res1 = performDatabaseBackup(tempBackupDir, 3);
      assert.equal(res1.success, true);
      assert.ok(fs.existsSync(res1.backupPath), 'Backup file must exist on disk');
      assert.ok(res1.backupFileName.startsWith('prayogshala_academy_backup_'));
      assert.ok(res1.backupFileName.endsWith('.sqlite'));

      // 2. Validate that the backup is a valid SQLite database
      const backupDb = new DatabaseSync(res1.backupPath);
      const row = backupDb.prepare('SELECT count(*) as count FROM questions').get() as { count: number };
      assert.ok(typeof row.count === 'number');
      backupDb.close();

      // 3. Create multiple backups with small sleep to have distinct timestamps/mtimes
      await new Promise((r) => setTimeout(r, 20));
      const res2 = performDatabaseBackup(tempBackupDir, 3);

      await new Promise((r) => setTimeout(r, 20));
      const res3 = performDatabaseBackup(tempBackupDir, 3);

      let files = fs.readdirSync(tempBackupDir).filter((f) => f.endsWith('.sqlite'));
      assert.equal(files.length, 3, 'Should have exactly 3 backups before rotation trigger');

      // 4. Create a 4th backup with keep = 3 -> Should prune 1
      await new Promise((r) => setTimeout(r, 20));
      const res4 = performDatabaseBackup(tempBackupDir, 3);
      assert.equal(res4.prunedFiles.length, 1, 'Should prune exactly 1 file');

      files = fs.readdirSync(tempBackupDir).filter((f) => f.endsWith('.sqlite'));
      assert.equal(files.length, 3, 'Rotation must keep exactly 3 files');
      assert.ok(!files.includes(res1.backupFileName), 'Oldest backup should have been pruned');
      assert.ok(files.includes(res4.backupFileName), 'Newest backup must be retained');
    } finally {
      try {
        fs.rmSync(tempBackupDir, { recursive: true, force: true });
      } catch {}
    }
  });
});
