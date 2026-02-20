import 'dotenv/config';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { readBrandConfig, readServicesConfig, readAudiencesConfig } from './config-reader.js';
import { getTodayAssignment, getWeekAssignments, getScheduleDay } from './scheduler.js';
import { generateContent } from './content-generator.js';
import { saveContent } from './store.js';

const ROOT = process.env.SOVEREIGN_DATA_DIR || join(import.meta.dirname, '..', '..');
const BUSINESSES_DIR = join(ROOT, 'businesses');

async function main() {
  const startTime = Date.now();
  const weekMode = process.argv.includes('--week');

  console.log(`[factory] Starting content generation — ${new Date().toISOString()}`);
  console.log(`[factory] Mode: ${weekMode ? 'full week (7 days)' : `today only (Day ${getScheduleDay()})`}`);

  // Discover businesses (skip .template and hidden dirs)
  const entries = await readdir(BUSINESSES_DIR, { withFileTypes: true });
  const businesses = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name);

  if (businesses.length === 0) {
    console.log('[factory] No businesses found — nothing to do');
    console.log('[factory] Add a business: cp -r businesses/.template businesses/your-biz-slug');
    return;
  }

  console.log(`[factory] Found ${businesses.length} business(es): ${businesses.join(', ')}`);

  const assignments = weekMode ? getWeekAssignments() : [getTodayAssignment()];

  let totalPieces = 0;
  let successCount = 0;
  let failCount = 0;

  for (const slug of businesses) {
    try {
      console.log(`\n[factory] === ${slug} ===`);

      // Read all configs once per business
      const brand = await readBrandConfig(slug);
      const services = await readServicesConfig(slug);
      const audiences = await readAudiencesConfig(slug);

      if (!brand.identity.business_name) {
        console.log(`  [${slug}] Brand config not filled in — skipping`);
        continue;
      }

      if (services.length === 0) {
        console.log(`  [${slug}] No services configured — skipping`);
        continue;
      }

      console.log(`  [${slug}] Brand: ${brand.identity.business_name}`);
      console.log(`  [${slug}] Services: ${services.length}, Audiences: ${audiences.length}`);

      for (const assignment of assignments) {
        try {
          console.log(`  [${slug}] Day ${assignment.day}: ${assignment.type} (${assignment.theme})`);
          const content = await generateContent(assignment, brand, services, audiences);
          await saveContent(slug, content);
          totalPieces++;
        } catch (err) {
          console.error(`  [${slug}] Failed Day ${assignment.day} ${assignment.type}: ${err.message}`);
        }
      }

      successCount++;
    } catch (err) {
      failCount++;
      console.error(`[factory] Error processing ${slug}: ${err.message}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n[factory] === Summary ===');
  console.log(`[factory] Businesses processed: ${successCount}/${businesses.length}`);
  console.log(`[factory] Content pieces generated: ${totalPieces}`);
  if (failCount > 0) console.log(`[factory] Failures: ${failCount}`);
  console.log(`[factory] Duration: ${elapsed}s`);
  console.log(`[factory] Done — ${new Date().toISOString()}`);
}

main().catch(err => {
  console.error(`[factory] Fatal error: ${err.message}`);
  process.exit(1);
});
