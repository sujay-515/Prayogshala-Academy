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

## Backups

- **UI Export**: Admin Console -> Bulk CSV/JSON -> Export Database (JSON).
- **API Export**: `GET /api/backup/export`.
- **API Restore**: `POST /api/backup/restore`.
- **Database File Copy**: Archive `data/medlab_qbank.sqlite` directly.
