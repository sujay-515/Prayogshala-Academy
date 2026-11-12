import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const DATA_DIR = path.resolve(process.cwd(), process.env.DATA_DIR || 'data');
const DB_PATH = path.join(DATA_DIR, 'prayogshala_academy.sqlite');

if (!fs.existsSync(DB_PATH)) {
  console.log(`[Legacy Accounts Checker] No database file found at ${DB_PATH}`);
  process.exit(0);
}

const db = new DatabaseSync(DB_PATH);

const LEGACY_IDENTIFIERS = [
  'admin',
  'guest',
  'student',
  'staff',
  'superadmin',
  'student@prayogshala.local',
  'staff@prayogshala.test',
  'superadmin@prayogshala.test',
  'admin@prayogshala.local',
];

const placeholders = LEGACY_IDENTIFIERS.map(() => '?').join(',');
const rows = db.prepare(`
  SELECT id, username, email, role, display_name, created_at
  FROM users
  WHERE LOWER(username) IN (${placeholders}) OR LOWER(email) IN (${placeholders})
  ORDER BY created_at ASC
`).all(...LEGACY_IDENTIFIERS, ...LEGACY_IDENTIFIERS) as any[];

console.log('================================================================================');
console.log(`[Legacy Accounts Audit] Database: ${DB_PATH}`);
console.log(`Found ${rows.length} matching legacy seeded account(s):`);
console.log('================================================================================');

if (rows.length === 0) {
  console.log('No legacy seeded accounts found in this database.');
} else {
  console.table(
    rows.map((r) => ({
      ID: r.id,
      Username: r.username,
      Email: r.email || '<none>',
      Role: r.role,
      'Display Name': r.display_name,
      'Created At': r.created_at,
    }))
  );
  console.log('\nNOTE: This script is READ-ONLY. No accounts were deleted or altered.');
}
