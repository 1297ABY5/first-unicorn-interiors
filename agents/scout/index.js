import 'dotenv/config';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { monitorCompetitors } from './competitor-monitor.js';
import { scanTrends } from './trend-scanner.js';

const ROOT = process.env.SOVEREIGN_DATA_DIR || join(import.meta.dirname, '..', '..');
const BUSINESSES_DIR = join(ROOT, 'businesses');

async function main() {
  const startTime = Date.now();
  console.log(`[scout] Starting competitor monitoring + trend scanning — ${new Date().toISOString()}`);

  // Discover all business folders (skip .template and hidden dirs)
  const entries = await readdir(BUSINESSES_DIR, { withFileTypes: true });
  const businesses = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name);

  if (businesses.length === 0) {
    console.log('[scout] No businesses found — nothing to do');
    console.log('[scout] Add a business: cp -r businesses/.template businesses/your-biz-slug');
    return;
  }

  console.log(`[scout] Found ${businesses.length} business(es): ${businesses.join(', ')}`);

  let totalRecords = 0;
  let trendCount = 0;
  let successCount = 0;
  let failCount = 0;

  for (const slug of businesses) {
    try {
      console.log(`\n[scout] === ${slug} ===`);

      // Phase 1: Competitor monitoring
      const count = await monitorCompetitors(slug);
      totalRecords += count;

      // Phase 2: Trend scanning
      try {
        const trends = await scanTrends(slug);
        if (trends) trendCount++;
      } catch (err) {
        console.error(`  [${slug}] Trend scan failed: ${err.message}`);
      }

      successCount++;
    } catch (err) {
      failCount++;
      console.error(`[scout] Error processing ${slug}: ${err.message}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n[scout] === Summary ===');
  console.log(`[scout] Businesses scanned: ${successCount}/${businesses.length}`);
  console.log(`[scout] Intel records: ${totalRecords}`);
  console.log(`[scout] Trend reports: ${trendCount}`);
  if (failCount > 0) console.log(`[scout] Failures: ${failCount}`);
  console.log(`[scout] Duration: ${elapsed}s`);
  console.log(`[scout] Done — ${new Date().toISOString()}`);
}

main().catch(err => {
  console.error(`[scout] Fatal error: ${err.message}`);
  process.exit(1);
});
