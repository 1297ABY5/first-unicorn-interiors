import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.env.SOVEREIGN_DATA_DIR || join(import.meta.dirname, '..', '..');
const BUSINESSES_DIR = join(ROOT, 'businesses');

/**
 * Save competitor intel records as a timestamped JSON file.
 * Creates the output directory if it doesn't exist.
 */
export async function saveIntel(businessSlug, records) {
  if (!records || records.length === 0) return null;

  const dir = join(BUSINESSES_DIR, businessSlug, 'results', 'competitor-intel');
  await mkdir(dir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, 'Z');
  const filename = `competitor-intel-${timestamp}.json`;
  const filePath = join(dir, filename);

  await writeFile(filePath, JSON.stringify(records, null, 2), 'utf-8');
  console.log(`  [store] Wrote ${records.length} records → ${filename}`);

  return filePath;
}
