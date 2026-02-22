import 'dotenv/config';
import { readdir, access, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { CONFIG } from './config.js';
import { analysePhoto, analyseBatch, isImage } from './analyser.js';
import { categoriseAll, loadManifest } from './categoriser.js';
import { updateWebsite } from './website-updater.js';
import { deploy } from './deployer.js';
import { getStats, appendLog } from './logger.js';

// ─── SCAN ────────────────────────────────────────────────

async function scan({ force = false } = {}) {
  console.log('[curator] Scanning vault/originals/ for new photos...\n');

  let files;
  try {
    files = await readdir(CONFIG.paths.originals);
  } catch {
    console.log('[curator] vault/originals/ not found — create it and add photos');
    return;
  }

  const images = files.filter(isImage);
  if (images.length === 0) {
    console.log('[curator] No images found in vault/originals/');
    return;
  }

  console.log(`[curator] Found ${images.length} images`);

  // Process in batches
  const filePaths = images.map(f => join(CONFIG.paths.originals, f));
  for (let i = 0; i < filePaths.length; i += CONFIG.batchSize) {
    const batch = filePaths.slice(i, i + CONFIG.batchSize);
    console.log(`\n[curator] Batch ${Math.floor(i / CONFIG.batchSize) + 1} (${batch.length} photos)...`);
    await analyseBatch(batch, { force });
  }

  // Categorise
  console.log('\n[curator] Categorising analysed photos...');
  await categoriseAll();
}

// ─── ANALYSE SINGLE ──────────────────────────────────────

async function analyseSingle(filePath) {
  try {
    await access(filePath);
  } catch {
    console.error(`[curator] File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`[curator] Analysing: ${filePath}\n`);
  const result = await analysePhoto(filePath, { force: true });
  console.log('\n[curator] Analysis result:');
  console.log(JSON.stringify(result, null, 2));
}

// ─── SORT ────────────────────────────────────────────────

async function sort() {
  console.log('[curator] Categorising from cache (no vision calls)...\n');
  await categoriseAll();
}

// ─── DEPLOY ──────────────────────────────────────────────

async function deployCmd() {
  const manifest = await loadManifest();
  const photos = manifest.photos || [];
  const roomTypes = [...new Set(photos.map(p => p.roomType))];
  const communities = [...new Set(photos.filter(p => p.community !== 'unknown').map(p => p.community))];

  console.log('[curator] Updating website...\n');
  await updateWebsite();

  console.log('\n[curator] Deploying...\n');
  await deploy({ roomTypes, communities, photoCount: photos.length });
}

// ─── FULL PIPELINE ───────────────────────────────────────

async function full() {
  console.log('[curator] ═══ Full Pipeline ═══\n');
  const startTime = Date.now();

  // 1. Scan & analyse
  await scan();

  // 2. Update website
  console.log('\n[curator] Updating website...');
  await updateWebsite();

  // 3. Deploy
  const manifest = await loadManifest();
  const photos = manifest.photos || [];
  const roomTypes = [...new Set(photos.map(p => p.roomType))];
  const communities = [...new Set(photos.filter(p => p.community !== 'unknown').map(p => p.community))];

  console.log('\n[curator] Deploying...');
  try {
    await deploy({ roomTypes, communities, photoCount: photos.length });
  } catch (err) {
    console.error(`[curator] Deploy failed: ${err.message}`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  await appendLog(`FULL_PIPELINE completed in ${duration}s`);
  console.log(`\n[curator] ═══ Pipeline Complete (${duration}s) ═══`);
}

// ─── STATUS ──────────────────────────────────────────────

async function showStatus() {
  console.log('[curator] ═══ Status ═══\n');

  const stats = await getStats();
  console.log(`[status] Total analysed: ${stats.total}`);
  console.log(`[status] Hero shots: ${stats.heroShots}`);
  console.log(`[status] Skipped: ${stats.skipped}`);

  if (Object.keys(stats.byRoom).length > 0) {
    console.log('\n[status] By room type:');
    for (const [room, count] of Object.entries(stats.byRoom)) {
      console.log(`  ${room}: ${count}`);
    }
  }

  if (Object.keys(stats.byStage).length > 0) {
    console.log('\n[status] By stage:');
    for (const [stage, count] of Object.entries(stats.byStage)) {
      console.log(`  ${stage}: ${count}`);
    }
  }

  const manifest = await loadManifest();
  console.log(`\n[status] Manifest: ${manifest.photos.length} photos`);
  if (manifest.lastUpdated) console.log(`[status] Last updated: ${manifest.lastUpdated}`);
}

// ─── TEST ────────────────────────────────────────────────

async function runTest() {
  console.log('[curator] ═══ Connection Test ═══\n');

  // Check vision API
  console.log('[test] Vision API...');
  const provider = CONFIG.vision.provider;
  const hasKey = provider === 'openai' ? !!CONFIG.vision.openaiKey : !!CONFIG.vision.anthropicKey;
  console.log(`  Provider: ${provider}`);
  console.log(`  Model: ${CONFIG.vision.model}`);
  console.log(`  API key: ${hasKey ? '✓ set' : '✗ MISSING'}`);

  if (!hasKey) {
    console.error('\n[test] Curator needs a vision API key.');
    console.error('  Add OPENAI_API_KEY or ANTHROPIC_API_KEY to /root/unicorn-sovereign/.env');
    process.exit(1);
  }

  // Check directories
  console.log('\n[test] Directories...');
  const dirs = ['originals', 'curated', 'heroShots', 'skip', 'logs'];
  for (const key of dirs) {
    const path = CONFIG.paths[key];
    try {
      await access(path);
      console.log(`  ✓ ${key}: ${path}`);
    } catch {
      console.log(`  ✗ ${key}: ${path} (missing)`);
    }
  }

  // Check website repo
  console.log('\n[test] Website repo...');
  try {
    await access(CONFIG.paths.websiteRepo);
    console.log(`  ✓ ${CONFIG.paths.websiteRepo}`);
  } catch {
    console.log(`  ✗ ${CONFIG.paths.websiteRepo} (not found)`);
  }

  // Check sharp
  console.log('\n[test] Sharp (image processing)...');
  try {
    const sharp = await import('sharp');
    console.log('  ✓ sharp loaded');
  } catch {
    console.log('  ✗ sharp not installed — run: npm install sharp');
  }

  // Check originals
  console.log('\n[test] Vault...');
  try {
    const files = await readdir(CONFIG.paths.originals);
    const images = files.filter(isImage);
    console.log(`  Photos in vault/originals/: ${images.length}`);
  } catch {
    console.log('  vault/originals/ not found');
  }

  // Stats
  const stats = await getStats();
  console.log(`\n[test] Cache: ${stats.total} photos analysed`);

  console.log('\n[curator] Test complete ✓');
}

// ─── CLI ─────────────────────────────────────────────────

const command = process.argv[2];
const arg = process.argv[3];
const force = process.argv.includes('--force');

switch (command) {
  case 'scan':
    scan({ force }).catch(err => {
      console.error(`[curator] Fatal: ${err.message}`);
      process.exit(1);
    });
    break;

  case 'analyse':
    if (!arg) {
      console.error('Usage: node index.js analyse <path-to-photo>');
      process.exit(1);
    }
    analyseSingle(arg).catch(err => {
      console.error(`[curator] Fatal: ${err.message}`);
      process.exit(1);
    });
    break;

  case 'sort':
    sort().catch(err => {
      console.error(`[curator] Fatal: ${err.message}`);
      process.exit(1);
    });
    break;

  case 'deploy':
    deployCmd().catch(err => {
      console.error(`[curator] Fatal: ${err.message}`);
      process.exit(1);
    });
    break;

  case 'full':
    full().catch(err => {
      console.error(`[curator] Fatal: ${err.message}`);
      process.exit(1);
    });
    break;

  case 'status':
    showStatus().catch(err => {
      console.error(`[curator] Error: ${err.message}`);
      process.exit(1);
    });
    break;

  case 'test':
    runTest().catch(err => {
      console.error(`[curator] Test error: ${err.message}`);
      process.exit(1);
    });
    break;

  default:
    console.log(`Curator — Photo Manager & Website Deployer for Sovereign Marketing System`);
    console.log(`\nUsage:`);
    console.log(`  node agents/curator/index.js scan [--force]     Analyse & categorise new photos`);
    console.log(`  node agents/curator/index.js analyse <path>     Analyse a single photo`);
    console.log(`  node agents/curator/index.js sort               Categorise from cache (no AI)`);
    console.log(`  node agents/curator/index.js deploy             Update website & deploy`);
    console.log(`  node agents/curator/index.js full               Full pipeline: scan → deploy`);
    console.log(`  node agents/curator/index.js status             Show stats`);
    console.log(`  node agents/curator/index.js test               Verify connections & deps`);
    break;
}
