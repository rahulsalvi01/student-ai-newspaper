#!/usr/bin/env node
/**
 * CLI helper script to trigger edition generation locally or against a remote server.
 * Usage:
 *   npx tsx scripts/trigger-generate.ts
 *   npx tsx scripts/trigger-generate.ts --date=2026-10-19 --timezone=Asia/Kolkata
 */
import fs from 'fs';
import path from 'path';

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

// Load .env.local and .env
const cwd = process.cwd();
const envLocal = loadEnvFile(path.join(cwd, '.env.local'));
const envDefault = loadEnvFile(path.join(cwd, '.env'));
const mergedEnv = { ...envDefault, ...envLocal, ...process.env };

const secret = mergedEnv.GENERATION_SECRET || mergedEnv.NEWSPAPER_GENERATE_SECRET;
const apiUrl =
  process.env.NEWSPAPER_GENERATE_URL ||
  process.argv.find((a) => a.startsWith('--url='))?.split('=')[1] ||
  'http://localhost:3000/api/generate';

const targetDate = process.argv.find((a) => a.startsWith('--date='))?.split('=')[1];
const targetTz = process.argv.find((a) => a.startsWith('--timezone='))?.split('=')[1];
const force = process.argv.includes('--force');

async function main() {
  console.log('--- Triggering Local Edition Generation ---');
  console.log(`Endpoint: ${apiUrl}`);

  if (!secret) {
    console.error('Error: GENERATION_SECRET is not set in environment or .env.local.');
    console.error('Please configure GENERATION_SECRET before triggering generation.');
    process.exit(1);
  }

  const payload: Record<string, unknown> = {
    trigger: 'manual',
    force: force || true,
  };
  if (targetDate) payload.issueDate = targetDate;
  if (targetTz) payload.timezone = targetTz;

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
    });

    const status = res.status;
    const data = await res.json().catch(() => null);

    console.log(`\nHTTP Response Status: ${status}`);

    if (res.ok) {
      console.log('✓ Generation Succeeded!');
      console.log(`  Issue Date:     ${data.issueDate}`);
      console.log(`  Edition Status: ${data.editionStatus}`);
      console.log(`  Articles Count: ${data.articleCount}`);
      console.log(`  Edition URL:    ${data.editionUrl}`);
      console.log('\nSource & Article Counts:');
      console.log(`  - Sources Attempted (Fetched): ${data.sourcesFetched}`);
      console.log(`  - Sources Accepted (Healthy):  ${data.sourcesAccepted}`);
      console.log(`  - Sources Rejected (Skipped):  ${data.sourcesRejected}`);
      console.log(`  - Sources Failed:              ${data.sourcesFailed}`);
      console.log(`  - Raw Articles Fetched:        ${data.articlesFetched}`);
      console.log(`  - Qualifying Articles:         ${data.articlesAccepted}`);
      console.log(`  - Rejected Articles:           ${data.articlesRejected}`);
      console.log(`\nDuration: ${data.durationMs}ms`);
    } else {
      console.error(`✗ Generation Failed [${data?.error || 'UNKNOWN_ERROR'}]`);
      console.error(`  Message: ${data?.message || res.statusText}`);
      if (data?.issues) {
        console.error('  Validation Issues:', data.issues);
      }
      process.exit(1);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\nNetwork/Connection error: ${message}`);
    console.error('Make sure the Next.js dev server is running on http://localhost:3000 (npm run dev).');
    process.exit(1);
  }
}

main();
