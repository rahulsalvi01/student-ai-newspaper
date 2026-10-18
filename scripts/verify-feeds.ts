import { CANDIDATE_SOURCES, SourceRegistry } from '../src/lib/feeds/registry';
import { verifySingleFeed } from '../src/lib/feeds/verifier';
import type { Source, FeedHealthResult } from '../src/types/sources';

interface VerificationRecord {
  source: Source;
  health: FeedHealthResult;
  testedAlternative?: {
    url: string;
    health: FeedHealthResult;
  };
}

// Known candidate alternatives to test if candidate feed fails
const CANDIDATE_ALTERNATIVES: Record<string, string> = {
  'arxiv-cs-ai': 'https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=20',
  'arxiv-cs-lg': 'https://export.arxiv.org/api/query?search_query=cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=20',
  'arxiv-cs-cl': 'https://export.arxiv.org/api/query?search_query=cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=20',
  'arxiv-cs-se': 'https://export.arxiv.org/api/query?search_query=cat:cs.SE&sortBy=submittedDate&sortOrder=descending&max_results=20',
};

async function runVerification() {
  console.log('='.repeat(90));
  console.log('STUDENT AI NEWSPAPER — FEED HEALTH VERIFICATION REPORT');
  console.log('Timestamp (UTC):', new Date().toISOString());
  console.log('Verifying all candidate feeds with real network requests...');
  console.log('='.repeat(90));

  const registry = new SourceRegistry(CANDIDATE_SOURCES);
  const sources = registry.getAllSources();
  const records: VerificationRecord[] = [];

  // 1. Verify candidate feeds
  for (const source of sources) {
    process.stdout.write(`Fetching ${source.name} (${source.feedUrl})... `);
    const health = await verifySingleFeed(source, { timeoutMs: 12000 });

    if (health.status === 'healthy') {
      console.log(`[PASS] ${health.httpStatus} OK - ${health.validEntriesCount} entries, newest: ${health.newestEntryPublishedAt ?? 'no date'}`);
    } else {
      console.log(`[FAIL] ${health.error}`);
    }

    const record: VerificationRecord = { source, health };

    // Update registry health
    registry.updateHealthResult(source.id, health);

    // If unhealthy, test alternative if available
    if (health.status === 'unhealthy') {
      const altUrl = CANDIDATE_ALTERNATIVES[source.id];
      if (altUrl) {
        process.stdout.write(`  -> Testing alternative for ${source.name} (${altUrl})... `);
        // Small delay to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const altHealth = await verifySingleFeed(
          {
            ...source,
            feedUrl: altUrl,
          },
          { timeoutMs: 12000 }
        );

        if (altHealth.status === 'healthy') {
          console.log(`[PASS] Verified working! ${altHealth.validEntriesCount} entries, newest: ${altHealth.newestEntryPublishedAt}`);
          registry.setSuggestedAlternative(source.id, altUrl);
          record.testedAlternative = { url: altUrl, health: altHealth };
        } else {
          console.log(`[FAIL] Alternative also failed: ${altHealth.error}`);
        }
      }
    }

    records.push(record);
  }

  // 2. Summary Table
  console.log('\n' + '='.repeat(120));
  console.log('CANDIDATE FEED VERIFICATION TABLE');
  console.log('='.repeat(120));
  console.log(
    [
      'Publisher / Source'.padEnd(26),
      'Status'.padEnd(10),
      'HTTP'.padEnd(6),
      'Entries'.padEnd(9),
      'Enabled'.padEnd(9),
      'Newest Published (UTC)'.padEnd(25),
      'Feed URL',
    ].join(' | ')
  );
  console.log('-'.repeat(120));

  for (const r of records) {
    const pub = r.source.name.slice(0, 25).padEnd(26);
    const st = (r.health.status === 'healthy' ? 'HEALTHY' : 'UNHEALTHY').padEnd(10);
    const code = String(r.health.httpStatus ?? 'ERR').padEnd(6);
    const count = String(r.health.validEntriesCount).padEnd(9);
    const enabled = (r.source.enabled ? 'YES' : 'NO').padEnd(9);
    const date = (r.health.newestEntryPublishedAt ?? 'None').slice(0, 24).padEnd(25);
    const url = r.source.feedUrl;

    console.log(`${pub} | ${st} | ${code} | ${count} | ${enabled} | ${date} | ${url}`);
  }

  // 3. Alternatives Table
  const alternativesTested = records.filter((r) => r.testedAlternative);
  if (alternativesTested.length > 0) {
    console.log('\n' + '='.repeat(120));
    console.log('TESTED & VERIFIED ALTERNATIVE FEEDS (REAL NETWORK TEST RESULTS)');
    console.log('='.repeat(120));
    console.log(
      [
        'Publisher / Source'.padEnd(26),
        'Alt Status'.padEnd(12),
        'Entries'.padEnd(9),
        'Newest Published (UTC)'.padEnd(25),
        'Verified Alternative Feed URL',
      ].join(' | ')
    );
    console.log('-'.repeat(120));

    for (const r of alternativesTested) {
      const alt = r.testedAlternative!;
      const pub = r.source.name.slice(0, 25).padEnd(26);
      const st = (alt.health.status === 'healthy' ? 'HEALTHY' : 'UNHEALTHY').padEnd(12);
      const count = String(alt.health.validEntriesCount).padEnd(9);
      const date = (alt.health.newestEntryPublishedAt ?? 'None').slice(0, 24).padEnd(25);
      console.log(`${pub} | ${st} | ${count} | ${date} | ${alt.url}`);
    }
  }

  // 4. Detailed Findings
  console.log('\n' + '='.repeat(90));
  console.log('DETAILED BREAKDOWN & PROVENANCE');
  console.log('='.repeat(90));

  const healthyList = records.filter((r) => r.health.status === 'healthy');
  const unhealthyList = records.filter((r) => r.health.status === 'unhealthy');

  console.log(`Total candidate feeds tested: ${records.length}`);
  console.log(`Healthy / Enabled candidate feeds: ${healthyList.length}`);
  console.log(`Unhealthy / Disabled candidate feeds: ${unhealthyList.length}`);

  if (unhealthyList.length > 0) {
    console.log('\n--- Unhealthy / Disabled Feeds ---');
    for (const r of unhealthyList) {
      console.log(`\n• Source: ${r.source.name} [id: ${r.source.id}]`);
      console.log(`  Candidate URL: ${r.source.feedUrl}`);
      console.log(`  Enabled: ${r.source.enabled}`);
      console.log(`  Disabled Reason: ${r.source.disabledReason}`);
      if (r.testedAlternative) {
        console.log(`  Tested Alternative: ${r.testedAlternative.url}`);
        console.log(`  Alternative Status: ${r.testedAlternative.health.status} (${r.testedAlternative.health.validEntriesCount} valid entries, newest: ${r.testedAlternative.health.newestEntryPublishedAt})`);
      }
    }
  }

  if (healthyList.length > 0) {
    console.log('\n--- Verified Working Feeds Sample Articles ---');
    for (const r of healthyList) {
      console.log(`\n• ${r.source.name} (${r.source.isOfficial ? 'Official' : 'Independent'}):`);
      console.log(`  Category: ${r.source.category}`);
      console.log(`  Entries Found: ${r.health.validEntriesCount}`);
      console.log(`  Newest Entry Date: ${r.health.newestEntryPublishedAt}`);
      console.log(`  Sample Article Title: ${r.health.sampleArticleTitle}`);
      console.log(`  Sample Article URL: ${r.health.exampleArticleUrl}`);
    }
  }

  return { records, registry };
}

runVerification().catch((err) => {
  console.error('Fatal verification runner error:', err);
  process.exit(1);
});
