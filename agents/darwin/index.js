import 'dotenv/config';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { analysePerformance, generateWeeklyReport } from './performance-analyser.js';

const ROOT = process.env.SOVEREIGN_DATA_DIR || join(import.meta.dirname, '..', '..');
const BUSINESSES_DIR = join(ROOT, 'businesses');

async function main() {
  const startTime = Date.now();
  const reportMode = process.argv.includes('--report');

  console.log(`[darwin] Starting performance analysis — ${new Date().toISOString()}`);
  console.log(`[darwin] Mode: ${reportMode ? 'analysis + weekly report' : 'analysis only'}`);

  // Discover businesses
  const entries = await readdir(BUSINESSES_DIR, { withFileTypes: true });
  const businesses = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name);

  if (businesses.length === 0) {
    console.log('[darwin] No businesses found — nothing to analyse');
    return;
  }

  console.log(`[darwin] Found ${businesses.length} business(es): ${businesses.join(', ')}`);

  let analysisCount = 0;
  let reportCount = 0;
  let failCount = 0;

  for (const slug of businesses) {
    try {
      console.log(`\n[darwin] === ${slug} ===`);

      // Phase 1: Performance analysis
      const analysis = await analysePerformance(slug);
      if (analysis) {
        analysisCount++;
        console.log(`  [${slug}] Grade: ${analysis.weekly_grade || '?'} — ${analysis.one_line_summary || ''}`);
      }

      // Phase 2: Weekly report (if --report flag)
      if (reportMode && analysis) {
        const report = await generateWeeklyReport(slug);
        if (report) reportCount++;
      }
    } catch (err) {
      failCount++;
      console.error(`[darwin] Error processing ${slug}: ${err.message}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n[darwin] === Summary ===');
  console.log(`[darwin] Analyses completed: ${analysisCount}/${businesses.length}`);
  if (reportMode) console.log(`[darwin] Weekly reports: ${reportCount}`);
  if (failCount > 0) console.log(`[darwin] Failures: ${failCount}`);
  console.log(`[darwin] Duration: ${elapsed}s`);
  console.log(`[darwin] Done — ${new Date().toISOString()}`);
}

main().catch(err => {
  console.error(`[darwin] Fatal error: ${err.message}`);
  process.exit(1);
});
