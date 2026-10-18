import { runIngestionPipeline, getIssueDateString } from '../src/lib/generation/pipeline';
import { sourceRegistry } from '../src/lib/feeds/registry';
import { isAiSummariesEnabled } from '../src/lib/news/summary-service';
import { isEmailDeliveryEnabled, validateGmailCredentials, validateEditionUrl } from '../src/lib/email/delivery';

async function verifySystem() {
  console.log('================================================================');
  console.log('SYSTEM-WIDE ACCEPTANCE & VERIFICATION RUNNER');
  console.log('================================================================\n');

  // 1. Fetch running UI at http://localhost:3000/
  console.log('1. VERIFYING RUNNING UI AT http://localhost:3000/ ...');
  try {
    const res = await fetch('http://localhost:3000/', { cache: 'no-store' });
    const html = await res.text();
    console.log(`   HTTP Status: ${res.status} ${res.statusText}`);
    console.log(`   Payload Size: ${html.length} bytes`);

    // Check semantic HTML elements
    const hasHeader = html.includes('<header');
    const hasMain = html.includes('<main');
    const hasArticle = html.includes('<article');
    const hasFooter = html.includes('<footer');
    const hasH1 = html.includes('<h1');
    const hasAria = html.includes('aria-label=');

    console.log('   Semantic & Accessibility Checks:');
    console.log(`     - <header> present: ${hasHeader}`);
    console.log(`     - <main> present: ${hasMain}`);
    console.log(`     - <article> present: ${hasArticle}`);
    console.log(`     - <footer> present: ${hasFooter}`);
    console.log(`     - <h1> present: ${hasH1}`);
    console.log(`     - aria-label attributes: ${hasAria}`);

    // Check for mock / fake stories
    const mockPatterns = ['Demo Story', 'Acme AI', 'Lorem Ipsum', 'fake headline'];
    const mockFound = mockPatterns.filter((p) => html.toLowerCase().includes(p.toLowerCase()));
    console.log(`   Mock stories search: ${mockFound.length === 0 ? 'CLEAN (0 mock stories found)' : 'FOUND: ' + mockFound.join(', ')}`);

    // Check responsive viewport meta
    const hasViewport = html.includes('name="viewport"');
    console.log(`   Responsive Viewport meta tag present: ${hasViewport}`);

    // Check Asia/Kolkata timezone reference
    const hasIst = html.includes('ASIA/KOLKATA') || html.includes('IST');
    console.log(`   Asia/Kolkata timezone badge present: ${hasIst}`);
  } catch (err) {
    console.error('   Failed to reach http://localhost:3000/:', err);
  }

  // 2. Verify Secondary Routes (/history and /settings)
  console.log('\n2. VERIFYING SECONDARY ROUTES ...');
  try {
    const historyRes = await fetch('http://localhost:3000/history', { cache: 'no-store' });
    console.log(`   GET /history -> HTTP ${historyRes.status}`);

    const settingsRes = await fetch('http://localhost:3000/settings', { cache: 'no-store' });
    console.log(`   GET /settings -> HTTP ${settingsRes.status}`);
  } catch (err) {
    console.error('   Failed to reach secondary routes:', err);
  }

  // 3. Verify Live Feed Ingestion Pipeline & Real Articles
  console.log('\n3. VERIFYING LIVE INGESTION PIPELINE & REAL SOURCES ...');
  const result = await runIngestionPipeline({ limit: 20 });
  console.log(`   Total candidate feeds: ${sourceRegistry.getAllSources().length}`);
  console.log(`   Feeds attempted: ${result.stats.feedsAttempted}`);
  console.log(`   Feeds succeeded: ${result.stats.feedsSucceeded}`);
  console.log(`   Feeds failed: ${result.stats.feedsFailed}`);
  console.log(`   Raw articles fetched: ${result.stats.rawArticlesFetched}`);
  console.log(`   Duplicates removed: ${result.stats.duplicatesRemoved}`);
  console.log(`   Stale articles removed: ${result.stats.staleArticlesRemoved}`);
  console.log(`   Qualifying articles in edition: ${result.edition.articles.length}`);

  console.log('\n   Sample verified real stories:');
  result.edition.articles.slice(0, 5).forEach((art, idx) => {
    console.log(`     ${idx + 1}. [${art.sourceName}] "${art.title}"`);
    console.log(`        Link: ${art.canonicalUrl}`);
    console.log(`        Provenance: ${art.provenanceLabel} | Summary Kind: ${art.summaryKind}`);
    console.log(`        Published: ${art.publishedAt}`);
  });

  // 4. Verify Duplicate Prevention
  console.log('\n4. VERIFYING DUPLICATE PREVENTION ...');
  const urls = result.edition.articles.map((a) => a.canonicalUrl);
  const uniqueUrls = new Set(urls);
  const duplicatesFound = urls.length - uniqueUrls.size;
  console.log(`   Total articles: ${urls.length}, Unique canonical URLs: ${uniqueUrls.size}`);
  console.log(`   Duplicates in edition: ${duplicatesFound} (Must be 0)`);

  // 5. Verify Freshness Window (30 days)
  console.log('\n5. VERIFYING FRESHNESS RULES ...');
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const staleCount = result.edition.articles.filter((a) => {
    if (!a.publishedAt) return false;
    return new Date(a.publishedAt).getTime() < thirtyDaysAgo;
  }).length;
  console.log(`   Articles older than 30-day cutoff: ${staleCount} (Must be 0)`);

  // 6. Verify Timezone & Date Formatting
  console.log('\n6. VERIFYING TIMEZONE (Asia/Kolkata) ...');
  const istDate = getIssueDateString(new Date(), 'Asia/Kolkata');
  console.log(`   Current issue date in Asia/Kolkata: ${istDate}`);
  console.log(`   Edition issueDate: ${result.edition.issueDate}`);

  // 7. Verify Secret Handling, Authentication & Idempotency
  console.log('\n7. VERIFYING SECRET HANDLING, AUTHENTICATION & IDEMPOTENCY ...');
  let secret = process.env.GENERATION_SECRET || '';
  try {
    const fs = await import('fs');
    if (fs.existsSync('.env.local')) {
      const content = fs.readFileSync('.env.local', 'utf-8');
      const match = content.match(/GENERATION_SECRET=["']?([^"'\r\n]+)/);
      if (match) secret = match[1];
    }
  } catch {
    // ignore
  }

  console.log(`   GENERATION_SECRET detected: ${secret ? 'YES (configured)' : 'NO'}`);

  // 7a. Test unauthenticated request is rejected
  const unauthRes = await fetch('http://localhost:3000/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trigger: 'manual' }),
  });
  console.log(`   Unauthenticated POST /api/generate -> HTTP ${unauthRes.status} (Must be 401)`);

  // 7b. Test authenticated request succeeds
  const authRes1 = await fetch('http://localhost:3000/api/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trigger: 'manual' }),
  });
  const json1 = await authRes1.json();
  const json1Str = JSON.stringify(json1);
  const leaksSecret = secret.length > 5 && json1Str.includes(secret);
  console.log(`   Authenticated POST /api/generate -> HTTP ${authRes1.status}`);
  console.log(`   editionUrl returned: ${json1.editionUrl}`);
  console.log(`   Secrets leaked in payload: ${leaksSecret} (Must be false)`);

  // 7c. Test Idempotency (calling same date again)
  const authRes2 = await fetch('http://localhost:3000/api/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trigger: 'manual', issueDate: json1.issueDate }),
  });
  const json2 = await authRes2.json();
  const isIdempotent = json1.editionUrl === json2.editionUrl;
  console.log(`   Idempotency test (second run with same date): HTTP ${authRes2.status}`);
  console.log(`   Idempotent URL preserved: ${isIdempotent} (${json2.editionUrl})`);

  // 8. Verify No-AI & No-Email Mode
  console.log('\n8. VERIFYING NO-AI & NO-EMAIL MODE ...');
  console.log(`   AI Summaries enabled: ${isAiSummariesEnabled()} (default: false)`);
  console.log(`   Email delivery enabled: ${isEmailDeliveryEnabled()} (default: false)`);
  const gmailValidation = validateGmailCredentials();
  console.log(`   Gmail credentials present: ${gmailValidation.valid}`);
  console.log(`   Edition URL validation: ${validateEditionUrl(json1.editionUrl).valid}`);

  console.log('\n================================================================');
  console.log('ACCEPTANCE VERIFICATION COMPLETE');
  console.log('================================================================');
}

verifySystem().catch(console.error);
