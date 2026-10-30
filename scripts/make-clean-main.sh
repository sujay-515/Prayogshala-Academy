#!/usr/bin/env bash
set -euo pipefail

# 1. Refuse to run with uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: Working tree has uncommitted changes or untracked files. Stash or commit before running." >&2
  exit 1
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" = "clean-main" ]; then
  echo "ERROR: Already on clean-main branch. Switch to your feature or release branch before running." >&2
  exit 1
fi

echo "Starting clean snapshot from current branch: $CURRENT_BRANCH"

# Ensure we switch back to the original branch on exit or error
cleanup() {
  local exit_code=$?
  local active
  active=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)
  if [ "$active" != "$CURRENT_BRANCH" ]; then
    echo "Switching back to $CURRENT_BRANCH..."
    git checkout "$CURRENT_BRANCH" --quiet || git switch "$CURRENT_BRANCH" --quiet
  fi
  exit "$exit_code"
}
trap cleanup EXIT

# 2. Delete branch clean-main if it exists
if git show-ref --verify --quiet refs/heads/clean-main; then
  echo "Deleting existing local clean-main branch..."
  git branch -D clean-main
fi

# 3. Create orphan clean-main branch from current branch's tracked files with one commit
echo "Creating orphan clean-main branch from tracked files..."
git checkout --orphan clean-main --quiet
git commit -m "chore: initial clean production release snapshot" --quiet

# 4. Verify tree contains none of forbidden patterns
echo "Verifying tree isolation..."
VIOLATIONS=0

check_pattern() {
  local pattern="$1"
  local desc="$2"
  local matches
  matches=$(git ls-files "$pattern" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "VIOLATION: Found forbidden $desc in clean tree:" >&2
    echo "$matches" >&2
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
}

check_pattern "data/*" "data/ directory"
check_pattern "test_mcqs/*" "test_mcqs/ directory"
check_pattern "local-only/*" "local-only/ directory"
check_pattern "*.sqlite*" "SQLite database file (*.sqlite*)"
check_pattern "*.pdf" "PDF file (*.pdf)"

# Check .env* files except .env.example
ENV_FILES=$(git ls-files ".env*" 2>/dev/null || true)
for f in $ENV_FILES; do
  if [ "$f" != ".env.example" ]; then
    echo "VIOLATION: Found forbidden environment file: $f" >&2
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

# 5. Grep tree for banned credentials and legacy strings (excluding this verification script itself)
BANNED_STRINGS=("admin123" "staff123" "student123" "playfine")
for str in "${BANNED_STRINGS[@]}"; do
  if git grep -q -i "$str" -- ':!scripts/make-clean-main.sh' 2>/dev/null; then
    echo "VIOLATION: Found banned string '$str' in tracked files:" >&2
    git grep -n -i "$str" -- ':!scripts/make-clean-main.sh' >&2 || true
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "ERROR: Clean snapshot verification failed with $VIOLATIONS violation(s)." >&2
  exit 1
fi

echo "=========================================="
echo "SUCCESS: clean-main snapshot created and verified!"
echo "Commit: $(git rev-parse --short HEAD)"
echo "Tracked files count: $(git ls-files | wc -l)"
echo "No forbidden paths, databases, PDFs, or credentials found."
echo "=========================================="
