import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { CONFIG } from './config.js';

function ts() {
  return new Date().toISOString();
}

async function ensureDirs() {
  await mkdir(dirname(CONFIG.paths.curatorLog), { recursive: true });
}

// ─── LOG LINE ────────────────────────────────────────────

export async function appendLog(message) {
  await ensureDirs();
  const line = `[${ts()}] ${message}\n`;
  await appendFile(CONFIG.paths.curatorLog, line, 'utf-8');
}

// ─── ANALYSIS CACHE ──────────────────────────────────────

async function loadCache() {
  try {
    return JSON.parse(await readFile(CONFIG.paths.analysisCache, 'utf-8'));
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  await ensureDirs();
  await writeFile(CONFIG.paths.analysisCache, JSON.stringify(cache, null, 2), 'utf-8');
}

export async function appendAnalysis(filename, analysis) {
  const cache = await loadCache();
  cache[filename] = {
    ...analysis,
    analysedAt: ts(),
  };
  await saveCache(cache);
}

export async function getAnalysis(filename) {
  const cache = await loadCache();
  return cache[filename] || null;
}

export async function getAllAnalyses() {
  return loadCache();
}

// ─── STATS ───────────────────────────────────────────────

export async function getStats() {
  const cache = await loadCache();
  const entries = Object.values(cache);

  const byRoom = {};
  const byStage = {};
  let heroCount = 0;
  let skipCount = 0;

  for (const entry of entries) {
    const room = entry.room_type || 'unknown';
    const stage = entry.stage || 'unknown';
    byRoom[room] = (byRoom[room] || 0) + 1;
    byStage[stage] = (byStage[stage] || 0) + 1;
    if (entry.quality_score >= CONFIG.heroThreshold) heroCount++;
    if (entry.quality_score <= CONFIG.skipThreshold) skipCount++;
  }

  return {
    total: entries.length,
    byRoom,
    byStage,
    heroShots: heroCount,
    skipped: skipCount,
  };
}
