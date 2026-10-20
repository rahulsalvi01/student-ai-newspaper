#!/usr/bin/env node
/**
 * CLI helper script to manually add or activate newspaper email recipients.
 * Upserts directly into the persistent Supabase `subscribers` table with
 * status='active', source='manual', idempotent on normalized_email.
 *
 * Usage:
 *   npm run add-recipient <email> [email2 ...]
 *   npx tsx scripts/add-recipient.ts student@university.edu professor@school.edu
 */
import fs from 'fs';
import path from 'path';
import { subscribersRepo } from '../src/lib/db/repository';
import { isDatabaseConfigured } from '../src/lib/db/client';

function loadEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return result;

  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
  }
  return result;
}

// 1. Populate process.env with local configuration
const cwd = process.cwd();
const envLocal = loadEnvFile(path.join(cwd, '.env.local'));
const envDefault = loadEnvFile(path.join(cwd, '.env'));
const mergedEnv = { ...envDefault, ...envLocal };

for (const [key, value] of Object.entries(mergedEnv)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

// Email format validation (RFC-5322 compatible regex)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  const rawArgs = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));

  if (rawArgs.length === 0) {
    console.log('='.repeat(70));
    console.log('STUDENT AI NEWSPAPER — MANUAL RECIPIENT MANAGEMENT');
    console.log('='.repeat(70));
    console.log('\nUsage:');
    console.log('  npm run add-recipient <email> [additional-emails...]');
    console.log('\nExamples:');
    console.log('  npm run add-recipient reader@example.com');
    console.log('  npm run add-recipient alice@university.edu bob@school.edu');
    console.log('\nOptions:');
    console.log('  --list    List all current active recipients');
    console.log('='.repeat(70));

    if (process.argv.includes('--list')) {
      console.log('\nFetching current active recipients...');
      const active = await subscribersRepo.getActiveSubscribers();
      console.log(`Found ${active.length} active recipient(s):`);
      for (const e of active) {
        console.log(`  - ${e}`);
      }
    }
    return;
  }

  const dbConfigured = isDatabaseConfigured();
  if (!dbConfigured) {
    console.warn(
      '\n[Notice] Supabase connection is not configured in .env.local or process environment.'
    );
    console.warn(
      'To persist subscribers to Supabase, set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n'
    );
  }

  console.log(`Processing ${rawArgs.length} recipient(s)...`);

  let addedCount = 0;
  for (const rawEmail of rawArgs) {
    const trimmed = rawEmail.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      console.error(`  [SKIP] Invalid email format: "${trimmed}"`);
      continue;
    }

    try {
      const subscriber = await subscribersRepo.addSubscriber(trimmed, 'manual');
      console.log(
        `  [OK] Active recipient: ${subscriber.email} (normalized: ${subscriber.normalized_email}, source: manual)`
      );
      addedCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [ERROR] Failed to save "${trimmed}": ${msg}`);
    }
  }

  console.log(`\nCompleted: ${addedCount} recipient(s) saved with status='active'.`);
  if (dbConfigured) {
    console.log('Recipients are persisted in Supabase and will receive the next scheduled daily newspaper.');
  }
}

main().catch((err) => {
  console.error('Fatal error in add-recipient script:', err);
  process.exit(1);
});
