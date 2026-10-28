# MedLab QBank

Clinical Laboratory Medicine and Pathology question bank with PDF ingestion, multi-tier taxonomy, interactive practice, and timed mock examinations for licensing preparation (ASCP, NHPC, PSC, DHA, and AIMS).

## Getting Started

### Requirements
- Node.js 22.5+ or 24+ (uses native `node:sqlite`)
- npm

### Installation
```bash
npm install
```

### Environment Configuration
Copy `.env.example` to `.env` if you plan to enable cloud OCR extraction:
```env
GEMINI_API_KEY=your_api_key_here
PORT=3000
```
If `GEMINI_API_KEY` is not provided, the application runs with deterministic rule-based text parsing.

### Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

## Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide icons.
- **Backend**: Express on Node.js with built-in SQLite (`DatabaseSync` in WAL mode).
- **Database File**: Stored at `data/medlab_qbank.sqlite`.
- **Primary Entities**:
  - `questions`: Question stem, choices, correct answer, rationale, reference, taxonomy keys, and audit log.
  - `categories`: Units, subjects, and topics.
  - `users` & `sessions`: Scrypt-hashed user accounts and session tokens.
  - `source_pdfs`: Uploaded PDF text and staging drafts.
  - `active_exams`: Server-side state for in-progress timed exams.
  - `reports`: Content discrepancy submissions.

### Initial Administrator Setup
On a fresh installation, specify initial superadmin credentials in `.env`:
```env
INITIAL_ADMIN_EMAIL="admin@yourinstitution.org"
INITIAL_ADMIN_PASSWORD="YourStrongPasswordAtLeast12Chars!"
```
Upon startup, the server automatically bootstraps the superadmin account with scrypt hashing. Once bootstrapped, remove these environment variables.

To inspect legacy seeded accounts in an existing database:
```bash
npm run list-legacy-accounts
```

### Site Configuration & Placeholder Guard
Public legal metadata, contact email, operator entity, and site URLs are managed centrally in `src/config/site.ts`.

During `npm run build`, an automated `prebuild` hook (`scripts/check-placeholders.mjs`) verifies whether bracketed placeholders (such as `[CONTACT_EMAIL]`, `[OPERATOR_NAME]`, and `[OPERATOR_COUNTRY]`) remain unresolved:
- In local development, the hook emits a descriptive console warning with missing keys.
- In strict CI/CD production pipelines, set `STRICT_PLACEHOLDERS=true` in the environment to fail the build if any placeholder remains unconfigured.

### Content Security Policy (CSP)
In production environments, Helmet configures HTTP security headers. The CSP mode is controlled via the `CSP_MODE` environment variable:
- `CSP_MODE=report-only` (default when unset): Emits the `Content-Security-Policy-Report-Only` header. This allows operators to audit policy compliance in their production environment without blocking styles, fonts, or images.
- `CSP_MODE=enforce`: Emits the strict `Content-Security-Policy` header using the same directive set, actively enforcing resource isolation and blocking unauthorized external origins.

## Backups

### Automated and CLI Database Snapshots (`VACUUM INTO`)
Create an atomic, point-in-time SQLite snapshot without stopping the server:
```bash
npm run backup
```
- **Consistent Copy**: Executes SQLite's native `VACUUM INTO` to create a clean, consistent snapshot without locking ongoing queries.
- **Location**: Snapshots are saved to `BACKUP_DIR` (defaults to `DATA_DIR/backups/`). Backups are never written to any publicly served directory.
- **Naming**: Files use an ISO timestamp: `medlab_qbank_backup_YYYY-MM-DDTHH-mm-ss-SSSZ.sqlite`.
- **Rotation**: Automatically retains the newest `BACKUP_KEEP` files (default: 7) and deletes older files.
- **In-Process Scheduler**: Set `BACKUP_INTERVAL_HOURS=24` (or any positive number of hours) in your environment to run automated backups at that interval. The scheduler shuts down cleanly on SIGTERM/SIGINT.

### How to Restore from a Backup File
1. Stop the running server process: `pkill -f "node.*server"` or stop your container/process manager.
2. Locate the desired backup file in `data/backups/`.
3. Overwrite the primary database file with the backup:
   ```bash
   cp data/backups/medlab_qbank_backup_<timestamp>.sqlite data/medlab_qbank.sqlite
   ```
4. If temporary SQLite WAL files exist (`data/medlab_qbank.sqlite-wal` or `data/medlab_qbank.sqlite-shm`), remove them so the restored database starts from a fresh state:
   ```bash
   rm -f data/medlab_qbank.sqlite-wal data/medlab_qbank.sqlite-shm
   ```
5. Restart the server:
   ```bash
   npm start
   ```

> [!WARNING]
> Storing backups on the same volume as the primary database does not protect against physical disk failure, volume deletion, or infrastructure loss. Always copy or replicate your backup files off-host (e.g. to S3, Google Cloud Storage, or an external secure storage volume) for disaster recovery.

- **UI Export**: Admin Console -> Bulk CSV/JSON -> Export Database (JSON).
- **API Export**: `GET /api/backup/export`.
- **API Restore**: `POST /api/backup/restore`.
- **Database File Copy**: Archive `data/medlab_qbank.sqlite` directly.
