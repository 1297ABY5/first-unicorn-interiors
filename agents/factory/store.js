import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.env.SOVEREIGN_DATA_DIR || join(import.meta.dirname, '..', '..');
const BUSINESSES_DIR = join(ROOT, 'businesses');

/**
 * Save generated content as a timestamped JSON file.
 * Path: businesses/{slug}/results/content/{type}-day{N}-{timestamp}.json
 */
export async function saveContent(businessSlug, content) {
  if (!content) return null;

  const dir = join(BUSINESSES_DIR, businessSlug, 'results', 'content');
  await mkdir(dir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, 'Z');
  const contentType = content.content_type || 'unknown';
  const day = content.day_number || 0;
  const filename = `${contentType}-day${day}-${timestamp}.json`;
  const filePath = join(dir, filename);

  await writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8');
  console.log(`  [store] Wrote ${contentType} → ${filename}`);

  return filePath;
}
