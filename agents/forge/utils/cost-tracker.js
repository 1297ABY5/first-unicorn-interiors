import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { PATHS } from '../config.js';
import { join } from 'node:path';

const LOG_PATH = join(PATHS.logs, 'cost-log.json');
const MAX_RUNS = 100;

async function loadLog() {
  try {
    return JSON.parse(await readFile(LOG_PATH, 'utf-8'));
  } catch {
    return { runs: [], monthly: {} };
  }
}

async function saveLog(log) {
  await mkdir(PATHS.logs, { recursive: true });
  await writeFile(LOG_PATH, JSON.stringify(log, null, 2), 'utf-8');
}

/**
 * Track a single Forge run.
 */
export async function trackRun({ sourcePhoto, variationsGenerated, templatesRendered, totalCost, durationMs, provider }) {
  const log = await loadLog();
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Add run record
  log.runs.push({
    timestamp: now.toISOString(),
    sourcePhoto,
    variationsGenerated,
    templatesRendered,
    totalCost: Math.round(totalCost * 1000) / 1000,
    durationMs,
    provider,
  });

  // Trim to last N runs
  if (log.runs.length > MAX_RUNS) {
    log.runs = log.runs.slice(-MAX_RUNS);
  }

  // Update monthly totals
  if (!log.monthly[monthKey]) {
    log.monthly[monthKey] = { runs: 0, variations: 0, templates: 0, cost: 0 };
  }
  log.monthly[monthKey].runs++;
  log.monthly[monthKey].variations += variationsGenerated;
  log.monthly[monthKey].templates += templatesRendered;
  log.monthly[monthKey].cost = Math.round((log.monthly[monthKey].cost + totalCost) * 1000) / 1000;

  await saveLog(log);
  return log;
}

/**
 * Get current month's spending summary.
 */
export async function getMonthlySummary() {
  const log = await loadLog();
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const current = log.monthly[monthKey] || { runs: 0, variations: 0, templates: 0, cost: 0 };

  return {
    month: monthKey,
    ...current,
    totalRunsAllTime: log.runs.length,
    lastRun: log.runs.length > 0 ? log.runs[log.runs.length - 1] : null,
  };
}

/**
 * Get full cost log for display.
 */
export async function getFullLog() {
  return loadLog();
}
