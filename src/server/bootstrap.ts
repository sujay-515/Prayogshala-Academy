import { db, hashPassword, DEFAULT_USER_STATS } from './db';
import { syncUpsertUser } from './supabaseSync';

export function bootstrapSuperAdmin(): void {
  const superAdminRow = db
    .prepare("SELECT id, email FROM users WHERE role = 'superadmin' LIMIT 1")
    .get() as { id: string; email?: string } | undefined;

  const initialEmail = process.env.INITIAL_ADMIN_EMAIL?.trim();
  const initialPassword = process.env.INITIAL_ADMIN_PASSWORD;

  if (superAdminRow) {
    if (initialEmail || initialPassword) {
      console.warn(
        '[Bootstrap Warning] A superadmin already exists in the database. Please remove INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD from your environment variables.'
      );
    }
    return;
  }

  // No superadmin exists in database
  if (!initialEmail && !initialPassword) {
    console.warn(
      '[Bootstrap Warning] No superadmin account exists and INITIAL_ADMIN_* environment variables are not set. The platform currently has no administrator.'
    );
    return;
  }

  if (!initialEmail || !initialPassword) {
    console.error(
      '[Bootstrap Error] Both INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be provided to bootstrap the initial superadmin. Superadmin was not created.'
    );
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(initialEmail)) {
    console.error(
      '[Bootstrap Error] INITIAL_ADMIN_EMAIL is not a valid email address. Superadmin was not created.'
    );
    return;
  }

  // Validate password length >= 12
  if (initialPassword.length < 12) {
    console.error(
      '[Bootstrap Error] INITIAL_ADMIN_PASSWORD must be at least 12 characters long. Superadmin was not created.'
    );
    return;
  }

  // Check if email already belongs to an existing user (refuse and do NOT promote)
  const existingUser = db
    .prepare('SELECT id, role, email FROM users WHERE LOWER(email) = ?')
    .get(initialEmail.toLowerCase()) as { id: string; role: string; email: string } | undefined;

  if (existingUser) {
    console.error(
      `[Bootstrap Error] INITIAL_ADMIN_EMAIL matches an existing user with role "${existingUser.role}". Existing accounts cannot be elevated via bootstrap. Superadmin was not created.`
    );
    return;
  }

  const cleanEmail = initialEmail.toLowerCase();
  const baseUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9_-]/g, '') || 'admin';
  const existingUsername = db
    .prepare('SELECT id FROM users WHERE LOWER(username) = ?')
    .get(baseUsername);
  const username = existingUsername ? `${baseUsername}_${Date.now().toString().slice(-4)}` : baseUsername;

  const id = `usr-superadmin-${Date.now()}`;
  const now = new Date().toISOString();
  const passwordHash = hashPassword(initialPassword);
  const statsJson = JSON.stringify(DEFAULT_USER_STATS);

  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, display_name, stats_json, created_at)
    VALUES (?, ?, ?, ?, 'superadmin', ?, ?, ?)
  `).run(
    id,
    username,
    cleanEmail,
    passwordHash,
    'System Administrator',
    statsJson,
    now
  );

  syncUpsertUser({
    id,
    username,
    email: cleanEmail,
    password_hash: passwordHash,
    role: 'superadmin',
    display_name: 'System Administrator',
    stats_json: statsJson,
    created_at: now,
  });

  console.log(`[Bootstrap] Successfully created initial superadmin account (${cleanEmail}).`);
}
