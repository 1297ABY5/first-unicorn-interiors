import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { PATHS } from './config.js';

// ─── HELPERS ─────────────────────────────────────────────

function timestamp() {
  return new Date().toISOString();
}

async function ensureDirs() {
  await mkdir(dirname(PATHS.publishLog), { recursive: true });
  await mkdir(dirname(PATHS.globalLog), { recursive: true });
}

async function loadPublishLog() {
  try {
    return JSON.parse(await readFile(PATHS.publishLog, 'utf-8'));
  } catch {
    return { entries: [], monthly: {} };
  }
}

function monthKey() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

// ─── APPEND PUBLISH LOG ──────────────────────────────────

export async function appendLog(result) {
  await ensureDirs();
  const log = await loadPublishLog();
  const month = monthKey();

  // Structured entry
  log.entries.push({
    ...result,
    timestamp: timestamp(),
  });

  // Keep last 100 entries
  if (log.entries.length > 100) {
    log.entries = log.entries.slice(-100);
  }

  // Monthly counters
  if (!log.monthly[month]) log.monthly[month] = { posts: 0, carousels: 0, errors: 0 };
  if (result.type === 'carousel') {
    log.monthly[month].carousels++;
  } else {
    log.monthly[month].posts++;
  }

  await writeFile(PATHS.publishLog, JSON.stringify(log, null, 2), 'utf-8');

  // Plaintext global log
  const line = `[${timestamp()}] PUBLISH ${result.type || 'single'} | mediaId=${result.mediaId || 'n/a'} | ${result.permalink || 'no-link'}\n`;
  await appendFile(PATHS.globalLog, line, 'utf-8');
}

// ─── APPEND ERROR LOG ────────────────────────────────────

export async function appendErrorLog(context, error) {
  await ensureDirs();
  const line = `[${timestamp()}] ERROR ${context} | ${error.message || error}\n`;
  await appendFile(PATHS.globalLog, line, 'utf-8');
}

// ─── APPEND TOKEN LOG ────────────────────────────────────

export async function appendTokenLog(success, detail) {
  await ensureDirs();
  const status = success ? 'OK' : 'FAIL';
  const line = `[${timestamp()}] TOKEN_REFRESH ${status} | ${detail}\n`;
  await appendFile(PATHS.globalLog, line, 'utf-8');
}

// ─── STATS ───────────────────────────────────────────────

export async function getPublishStats() {
  const log = await loadPublishLog();
  const month = monthKey();
  const monthly = log.monthly[month] || { posts: 0, carousels: 0, errors: 0 };
  const lastEntry = log.entries.length > 0 ? log.entries[log.entries.length - 1] : null;

  return {
    month,
    posts: monthly.posts,
    carousels: monthly.carousels,
    errors: monthly.errors,
    totalEntries: log.entries.length,
    lastPublish: lastEntry,
  };
}
