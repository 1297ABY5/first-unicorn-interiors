import { readFile, writeFile, mkdir, readdir, rename } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.env.SOVEREIGN_DATA_DIR || join(import.meta.dirname, '..', '..');
const BUSINESSES_DIR = join(ROOT, 'businesses');

/**
 * Read all JSON files from the lead inbox directory.
 */
export async function loadLeadInbox(slug) {
  const inboxDir = join(BUSINESSES_DIR, slug, 'results', 'leads', 'inbox');
  let files;
  try {
    files = await readdir(inboxDir);
  } catch {
    return []; // No inbox directory = no leads
  }

  const jsonFiles = files.filter(f => f.endsWith('.json'));
  const leads = [];

  for (const file of jsonFiles) {
    try {
      const content = await readFile(join(inboxDir, file), 'utf-8');
      const lead = JSON.parse(content);
      lead._inbox_filename = file;
      leads.push(lead);
    } catch (err) {
      console.warn(`  [store] Skipping invalid inbox file ${file}: ${err.message}`);
    }
  }

  return leads;
}

/**
 * Load an existing lead record (for follow-up sequencing / re-scoring).
 */
export async function loadExistingLead(slug, leadId) {
  const filePath = join(BUSINESSES_DIR, slug, 'results', 'leads', `${leadId}.json`);
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null; // New lead
  }
}

/**
 * Save or update a lead record.
 */
export async function saveLead(slug, lead) {
  const leadsDir = join(BUSINESSES_DIR, slug, 'results', 'leads');
  await mkdir(leadsDir, { recursive: true });

  const filePath = join(leadsDir, `${lead.lead_id}.json`);
  await writeFile(filePath, JSON.stringify(lead, null, 2));
  console.log(`  [store] Saved lead record → ${lead.lead_id}.json`);
  return filePath;
}

/**
 * Save a generated message to the messages directory.
 */
export async function saveMessage(slug, leadId, message) {
  const messagesDir = join(BUSINESSES_DIR, slug, 'results', 'leads', 'messages');
  await mkdir(messagesDir, { recursive: true });

  const ts = new Date().toISOString().replace(/:/g, '-');
  const filename = `${leadId}-msg${message.message_number}-${ts}.json`;
  const filePath = join(messagesDir, filename);
  await writeFile(filePath, JSON.stringify(message, null, 2));
  console.log(`  [store] Saved message → ${filename}`);
  return filePath;
}

/**
 * Move processed inbox file to the processed directory.
 */
export async function archiveInboxItem(slug, filename) {
  const inboxDir = join(BUSINESSES_DIR, slug, 'results', 'leads', 'inbox');
  const processedDir = join(BUSINESSES_DIR, slug, 'results', 'leads', 'processed');
  await mkdir(processedDir, { recursive: true });

  const src = join(inboxDir, filename);
  const dest = join(processedDir, filename);
  await rename(src, dest);
  console.log(`  [store] Archived → processed/${filename}`);
}
