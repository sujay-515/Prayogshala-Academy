import fs from 'node:fs';
import path from 'node:path';
import { db } from './db';

export interface BackupResult {
  success: boolean;
  backupPath: string;
  backupFileName: string;
  prunedFiles: string[];
}

/**
 * Creates an atomic point-in-time SQLite snapshot using VACUUM INTO
 * and enforces rotation by keeping the newest N backup files.
 */
export function performDatabaseBackup(customBackupDir?: string, customKeep?: number): BackupResult {
  const dataDir = path.resolve(process.cwd(), process.env.DATA_DIR || 'data');
  const backupDir = path.resolve(customBackupDir || process.env.BACKUP_DIR || path.join(dataDir, 'backups'));

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Filesystem-safe timestamp: YYYY-MM-DDTHH-mm-ss-SSSZ
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `prayogshala_academy_backup_${timestamp}.sqlite`;
  const backupPath = path.join(backupDir, backupFileName);

  // SQLite VACUUM INTO creates a consistent point-in-time copy without taking down writes
  db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}';`);

  // Rotation: Keep newest BACKUP_KEEP (default 7)
  const rawKeep = process.env.BACKUP_KEEP;
  const keepCount = customKeep !== undefined ? customKeep : (rawKeep ? parseInt(rawKeep, 10) : 7);
  const effectiveKeep = isNaN(keepCount) || keepCount < 1 ? 7 : keepCount;

  const prunedFiles: string[] = [];
  try {
    const files = fs.readdirSync(backupDir)
      .filter((f) => f.startsWith('prayogshala_academy_backup_') && f.endsWith('.sqlite'))
      .map((f) => {
        const fullPath = path.join(backupDir, f);
        const stat = fs.statSync(fullPath);
        return { name: f, fullPath, mtimeMs: stat.mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs); // newest first

    if (files.length > effectiveKeep) {
      const toRemove = files.slice(effectiveKeep);
      for (const item of toRemove) {
        fs.unlinkSync(item.fullPath);
        prunedFiles.push(item.name);
      }
    }
  } catch (err: any) {
    console.error('[Backup] Error rotating backup files:', err.message);
  }

  return {
    success: true,
    backupPath,
    backupFileName,
    prunedFiles,
  };
}

let schedulerTimer: NodeJS.Timeout | null = null;

export function startBackupScheduler(): void {
  const rawInterval = process.env.BACKUP_INTERVAL_HOURS;
  if (!rawInterval) return;

  const hours = parseFloat(rawInterval);
  if (isNaN(hours) || hours <= 0) return;

  const intervalMs = Math.round(hours * 3600 * 1000);
  console.log(`[Backup] Automated in-process backup scheduled every ${hours} hour(s).`);

  schedulerTimer = setInterval(() => {
    try {
      const result = performDatabaseBackup();
      console.log(`[Backup] Automated backup created: ${result.backupFileName} (pruned ${result.prunedFiles.length} older backups)`);
    } catch (err: any) {
      console.error('[Backup] Automated backup failed:', err.message || 'Unknown error');
    }
  }, intervalMs);

  if (schedulerTimer.unref) {
    schedulerTimer.unref();
  }
}

export function stopBackupScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log('[Backup] In-process backup scheduler stopped.');
  }
}

// Standalone CLI execution: `npm run backup`
const isDirectCli = process.argv[1] && (process.argv[1].endsWith('backup.ts') || process.argv[1].endsWith('backup.js'));
if (isDirectCli) {
  try {
    const res = performDatabaseBackup();
    console.log(`[Backup] Successfully created database backup: ${res.backupPath}`);
    if (res.prunedFiles.length > 0) {
      console.log(`[Backup] Rotated ${res.prunedFiles.length} old backup(s): ${res.prunedFiles.join(', ')}`);
    }
    process.exit(0);
  } catch (err: any) {
    console.error('[Backup] Backup failed:', err.message || err);
    process.exit(1);
  }
}
