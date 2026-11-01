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

## Deployment

### Production Build & Startup
1. Install production dependencies:
   ```bash
   npm ci --omit=dev
   ```
2. Build the client application:
   ```bash
   npm run build
   ```
3. Start the production server:
   ```bash
   NODE_ENV=production npm start
   ```

### Health Check Endpoint
- Path: `GET /api/health`
- Returns: `200 OK` with JSON `{"status":"ok","database":"sqlite",...}`. Use this URL for container readiness, Docker healthchecks, or cloud load balancer probes.

### Environment Variables

| Variable | Purpose | Required / Optional | Default |
|---|---|---|---|
| `NODE_ENV` | Application environment (`production`, `development`, `test`). In production, serves `dist/` and enables security headers. | **Required** in prod | None |
| `PORT` | HTTP port on which Express listens. | Optional | `3001` (or `3000`) |
| `DATA_DIR` | Absolute or relative path to persistent SQLite database storage directory. | Optional | `data` |
| `TRUST_PROXY` | Reverse proxy hop count (non-negative integer string e.g. `1` or `2`). Invalid values fall back to untrusted. | Optional | `1` in prod, unset otherwise |
| `SITE_URL` | Canonical server-side domain URL (used for `robots.txt` and `sitemap.xml`). | **Recommended** in prod | Request host header |
| `VITE_SITE_URL` | Canonical client-side site URL (injected into bundle at build time). | **Required at BUILD time** | `window.location.origin` |
| `INITIAL_ADMIN_EMAIL` | Email for initial superadmin bootstrapping on clean database install. | Required for 1st boot | None |
| `INITIAL_ADMIN_PASSWORD` | Password (min 12 chars) for initial superadmin bootstrapping. | Required for 1st boot | None |
| `RESEND_API_KEY` | Transactional email delivery key for password resets and staff invites. | Optional (prominent warning if missing) | Mock delivery |
| `EMAIL_FROM` | Sender display name and email address for transactional mail. | Optional | `MedLab QBank <onboarding@resend.dev>` |
| `APP_URL` | Base public URL used in email reset links. | Optional | `http://localhost:3000` |
| `GEMINI_API_KEY` | Google Gemini API key for administrative OCR of question documents. | Optional | Rule-based parser |
| `SUPABASE_SYNC_ENABLED` | Opt-in flag for Supabase cloud synchronization (`"true"` to enable). | Optional | Unset (disabled) |
| `SUPABASE_URL` | Optional Supabase cloud synchronization endpoint URL. | Optional | None |
| `SUPABASE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Optional Supabase service role key for cloud synchronization. | Optional | None |
| `SUPABASE_ANON_KEY` | Optional Supabase client anon key. | Optional | None |
| `CSP_MODE` | Content Security Policy mode (`report-only` or `enforce`). | Optional | `report-only` |
| `BACKUP_DIR` | Directory where automated and manual SQLite backups are stored. | Optional | `DATA_DIR/backups` |
| `BACKUP_KEEP` | Number of recent database backup snapshots retained during rotation. | Optional | `7` |
| `BACKUP_INTERVAL_HOURS` | Number of hours between automated in-process backups. | Optional | Unset (disabled) |
| `RATE_LIMIT_REGISTER_MAX` | Max registrations allowed per IP per hour. | Optional | `20` |
| `ANSWER_CHECK_USER_PER_HOUR` | Max answer checks per hour for authenticated non-admin users. | Optional | `300` |
| `ANSWER_CHECK_USER_PER_DAY` | Max answer checks per day for authenticated non-admin users. | Optional | `1500` |
| `ANSWER_CHECK_GUEST_PER_HOUR` | Max answer checks per hour for guest / anonymous visitors. | Optional | `60` |
| `ANSWER_CHECK_GUEST_PER_DAY` | Max answer checks per day for guest / anonymous visitors. | Optional | `200` |
| `EXAM_START_PER_HOUR` | Max exam sessions that can be started per hour per user/IP. | Optional | `10` |
| `EXTRACT_PDF_PER_HOUR` | Max PDF OCR extractions permitted per hour per administrator. | Optional | `20` |
| `STRICT_PLACEHOLDERS` | When set to `true`, fails `npm run build` if config placeholders remain. | Optional | `false` |

> [!IMPORTANT]
> **VITE_SITE_URL Must Exist at Build Time**:
> Vite compiles client assets statically during `npm run build`. If you need canonical meta tags, OpenGraph URLs, and JSON-LD schema to reflect your domain, ensure `VITE_SITE_URL` is set in the build environment *before* executing `npm run build`.

> [!IMPORTANT]
> **Persistent Volume Requirement for SQLite**:
> MedLab QBank stores relational state, sessions, accounts, and examination history in SQLite (`data/medlab_qbank.sqlite`). In containerized or serverless hosting environments, `DATA_DIR` must be mounted on a persistent disk volume. Ephemeral containers will lose all data upon restart without persistent storage.

### Answer Protection Architecture

MedLab QBank protects question answer keys, clinical rationales, and explanations from bulk scraping and client-side inspection through an allowlist serialization architecture:

1. **Allowlist Field Serialization**:
   - Non-administrative endpoints (`/api/bootstrap`, `GET /api/questions`, `GET /api/questions/:id`, `POST /api/exams/start`, and `/api/auth/export`) strictly serialize questions using `toPublicQuestion()`.
   - All **reveal-only** fields (`correctAnswer`, `explanation`, `reference`, and per-option rationales) and **admin-only** fields (`status`, `sourceDocument`, `pageNumber`, `versionHistory`, `flags`) are excluded from public payloads.
   - Admin and superadmin callers retain full access on authorized management routes.

2. **On-Demand Answer Verification**:
   - In practice sessions, daily questions, and browse mode, students submit their chosen option to `POST /api/questions/:id/check`.
   - The server verifies that the question is published, validates the selected option, and returns `{ correct: boolean }` along with the explanation and textbook citation.
   - Timed exams are graded strictly on the server via `POST /api/exams/:id/submit`; graded questions are returned only after grading completes.

3. **Rate Limiting Controls**:
   - Answer checks are rate-limited via `ANSWER_CHECK_USER_PER_HOUR` (`300`), `ANSWER_CHECK_USER_PER_DAY` (`1500`), `ANSWER_CHECK_GUEST_PER_HOUR` (`60`), and `ANSWER_CHECK_GUEST_PER_DAY` (`200`).
   - Exam session creation is throttled via `EXAM_START_PER_HOUR` (`10`).
   - Gemini PDF OCR extraction is capped via `EXTRACT_PDF_PER_HOUR` (`20`).

4. **Inherent Web Security Limitations**:
   - Answer protection prevents trivial inspection and substantially raises the computational and temporal cost of automated extraction.
   - However, because students must legitimately see answers and explanations as part of learning, no web application can completely eliminate distributed, slow-rate extraction over extended time periods. Our Terms of Service explicitly prohibit automated scraping, and rate limiters ensure suspicious extraction patterns can be detected and throttled.

### First Administrator Onboarding
1. On your initial deployment, supply `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` (minimum 12 characters) in your environment variables.
2. Boot the application. The server checks if any superadmin exists; finding none, it creates the superadmin account with scrypt password hashing.
3. Sign in to verify administrative access.
4. Remove `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` from your hosting environment variables to prevent accidental re-triggering.

### Post-Deployment Checklist & Automated Smoke Test
- [ ] **Health Probe**: Verify `GET /api/health` returns HTTP 200 with JSON status.
- [ ] **Trust Proxy & Client IPs**: Inspect server access logs to ensure client IP addresses are recorded correctly rather than internal load balancer IPs.
- [ ] **Robots & Sitemap**: Verify `GET /robots.txt` and `GET /sitemap.xml` resolve with HTTP 200 and display your real production domain.
- [ ] **Security Headers**: Verify `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-Robots-Tag: noindex` (on protected paths), and `Content-Security-Policy-Report-Only` (or `Content-Security-Policy` if `CSP_MODE=enforce`).
- [ ] **Placeholder Check**: Confirm `src/config/site.ts` placeholders have been replaced with real contact and operator credentials.

#### Automated Smoke Test
Run the automated smoke test suite after deploying to verify health, security headers, file isolation, anti-leak serialization, and 413 payload limits:

```bash
# Test local production build
npm run build
BASE_URL=http://localhost:3001 npm run smoke

# Test remote deployment target
BASE_URL=https://qbank.example.com npm run smoke
```

### Known Limitations and Accepted Risks

- **Single-Process SQLite**: The backend uses Node.js `node:sqlite` in WAL mode designed for a single Node instance. It is not architected for multi-node horizontally scaled deployments sharing a filesystem without an external cluster sync.
- **In-Memory Rate Limiting**: Express route limiters store hit counts in process memory. Counters reset on process restart or container redeployment, which is standard and sufficient for single-instance hosting.
- **AI Extraction Requires GEMINI_API_KEY**: Advanced PDF OCR and clinical rationale completion require a valid `GEMINI_API_KEY`. Without it, the ingestion workflow operates purely on deterministic rule-based text parsing.
- **Supabase Cloud Sync is Bidirectional (Opt-In)**: The optional Supabase synchronization layer is bidirectional (hydrates from remote on boot, and pushes local mutations). It operates on a fire-and-forget basis without distributed transactions. To enable, set `SUPABASE_SYNC_ENABLED=true` and provide `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. For standalone installations, leave Supabase disabled; SQLite on persistent disk is the authoritative datastore.
- **Session Tokens in `localStorage`**: Client session tokens are stored in browser `localStorage`. This architectural choice is mitigated by a strict Content Security Policy (`CSP_MODE=enforce`), absence of `dangerouslySetInnerHTML`, and strict sanitization of URLs and images.
- **Signup Email Enumeration**: Registration indicates whether a username or email is already registered (`409 Conflict`), allowing callers to determine if an email is registered.
- **Email Verification Is Soft-Gated**: Accounts stay usable immediately, but unverified email addresses are excluded from the Grand Test leaderboard and a banner prompts verification. Delivery requires `RESEND_API_KEY` and a correct `APP_URL`.
- **No Exam Resume After Refresh**: Active exam timer and in-progress answers are tracked in client component state; hard-refreshing or navigating away mid-exam forfeits the active attempt.
- **Answer Protection Limitations**: Server-side answer verification and allowlist serializers prevent trivial source inspection and throttle bulk extraction. However, because students must legitimately see explanations and answers to learn, slow distributed extraction cannot be completely eliminated.

### Email Setup

Automated password reset emails require an external transactional email provider:
- Set `RESEND_API_KEY` in your production environment variables.
- Ensure your sending domain is verified in your Resend account dashboard and set `EMAIL_FROM` (e.g., `noreply@yourdomain.com`).
- Without a valid API key and a verified domain, password reset and email verification messages cannot be delivered.
- Verification and reset links are built from `APP_URL`, then `SITE_URL`, then `http://localhost:${PORT}`. Set `APP_URL` explicitly in production.
- Resend test mode (`onboarding@resend.dev`) only delivers to the Resend account owner's address. To email anyone else, verify a domain at resend.com/domains and set `EMAIL_FROM` to an address on that domain.
- In development, verification links are always printed to the server terminal as `[Email Dev] Verification link for ...`, so temp-mail testing does not depend on delivery.

### Releasing

To publish a clean, production-ready codebase without historical artifacts, personal data, or draft files:

1. Ensure your working directory is clean and all desired commits are on your branch (`main` or `final-fixes`).
2. Run the clean snapshot script:
   ```bash
   ./scripts/make-clean-main.sh
   ```
   This script:
   - Validates that the working tree is clean.
   - Deletes any existing local `clean-main` branch.
   - Creates an orphan branch `clean-main` containing exactly one commit with current tracked files.
   - Verifies that no forbidden files (`data/`, `test_mcqs/`, `local-only/`, `.env*` other than `.env.example`, `*.sqlite*`, `*.pdf`) exist.
   - Verifies that no legacy passwords or usernames exist in the tree.
   - Switches back to your current working branch upon completion.

3. Push **only** the `clean-main` branch to your **PRIVATE** remote repository (never push development history or untracked assets):
   ```bash
   git push origin clean-main:main
   ```
