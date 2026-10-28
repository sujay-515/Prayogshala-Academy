#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteConfigPath = path.resolve(__dirname, '../src/config/site.ts');

if (!fs.existsSync(siteConfigPath)) {
  console.warn(`[Placeholder Check] Warning: ${siteConfigPath} not found.`);
  process.exit(0);
}

const content = fs.readFileSync(siteConfigPath, 'utf-8');
const placeholderRegex = /\[[A-Z0-9_]+\]/g;
const matches = [...new Set(content.match(placeholderRegex) || [])];

if (matches.length > 0) {
  console.warn('\n================================================================================');
  console.warn('[Placeholder Check] WARNING: Unresolved site configuration placeholders found:');
  matches.forEach((m) => console.warn(`  - ${m}`));
  console.warn('\nPlease update src/config/site.ts with real production values before deployment.');
  console.warn('================================================================================\n');

  if (process.env.STRICT_PLACEHOLDERS === 'true') {
    console.error('[Placeholder Check] STRICT_PLACEHOLDERS=true is set. Failing build due to unresolved placeholders.\n');
    process.exit(1);
  }
} else {
  console.log('[Placeholder Check] All site configuration placeholders are resolved.');
}
