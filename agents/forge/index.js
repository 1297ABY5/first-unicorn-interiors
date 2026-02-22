import 'dotenv/config';
import { readdir, readFile, writeFile, copyFile, stat, mkdir, access } from 'node:fs/promises';
import { join, basename, extname, parse as parsePath } from 'node:path';
import { PATHS, BRAND, INTERIOR_VARIATIONS, EXTERIOR_VARIATIONS } from './config.js';
import { classifyScene, enrichPrompt } from './classifiers/scene-detect.js';
import { generateVariation, testConnections } from './utils/image-api.js';
import {
  fileToBase64, renderTemplate, testPuppeteer,
  carouselSlideHTML, ctaSlideHTML, storyFrameHTML, adCreativeHTML,
} from './utils/template-renderer.js';
import { trackRun, getMonthlySummary } from './utils/cost-tracker.js';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// ─── CORE PIPELINE ────────────────────────────────────────

/**
 * Process a single photo through the full Forge pipeline.
 * Returns summary of what was generated.
 */
export async function forgeFromPhoto(photoPath) {
  const startTime = Date.now();
  const photoName = parsePath(photoPath).name;

  // 1. Validate
  try {
    await access(photoPath);
  } catch {
    throw new Error(`Photo not found: ${photoPath}`);
  }

  const fileStat = await stat(photoPath);
  console.log(`\n[forge] Processing: ${basename(photoPath)} (${(fileStat.size / 1024).toFixed(0)} KB)`);

  // 2. Classify scene
  const classification = classifyScene(photoPath);
  console.log(`  [classify] ${classification.sceneType} / ${classification.roomType} (${classification.confidence})`);

  // 3. Get variation prompts for scene type
  const variations = classification.sceneType === 'exterior'
    ? EXTERIOR_VARIATIONS
    : INTERIOR_VARIATIONS;

  // 4. Generate AI variations
  let variationsGenerated = 0;
  let totalCost = 0;
  let lastProvider = 'none';
  const variationPaths = [];

  for (const variation of variations) {
    const outputName = `${photoName}--${variation.id}.jpg`;
    const outputPath = join(PATHS.variations, photoName, outputName);

    try {
      const enrichedPrompt = enrichPrompt(variation.prompt, classification);
      console.log(`  [generate] ${variation.name}...`);

      const result = await generateVariation(photoPath, enrichedPrompt, outputPath);
      variationsGenerated++;
      totalCost += result.cost;
      lastProvider = result.provider;
      variationPaths.push({ path: result.path, variation });
      console.log(`  [generate] ✓ ${variation.name} ($${result.cost} via ${result.provider})`);
    } catch (err) {
      console.error(`  [generate] ✗ ${variation.name}: ${err.message}`);
    }

    // Brief pause between API calls
    if (variationsGenerated < variations.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (variationsGenerated === 0) {
    console.log(`  [forge] No variations generated — skipping templates`);
    return { photoName, variationsGenerated: 0, templatesRendered: 0, totalCost: 0 };
  }

  // 5. Render branded templates
  let templatesRendered = 0;
  const templatePaths = [];

  // Carousel slides from variations
  const carouselHeadlines = [
    `${classification.roomType.charAt(0).toUpperCase() + classification.roomType.slice(1)} Transformation`,
    'Before → After',
    'Every Detail Matters',
    'Crafted by Our Team',
    'The Reveal',
  ];

  for (let i = 0; i < Math.min(variationPaths.length, 5); i++) {
    const { path: varPath, variation } = variationPaths[i];
    try {
      const b64 = await fileToBase64(varPath);
      const html = carouselSlideHTML(
        b64,
        carouselHeadlines[i] || variation.name,
        `${BRAND.name} — ${classification.roomType} renovation`,
        i + 1,
        Math.min(variationPaths.length, 5) + 1 // +1 for CTA slide
      );
      const outPath = join(PATHS.branded, photoName, `carousel-${i + 1}-${variation.id}.png`);
      await renderTemplate(html, outPath, 1080, 1080);
      templatePaths.push(outPath);
      templatesRendered++;
    } catch (err) {
      console.error(`  [template] Carousel ${i + 1} failed: ${err.message}`);
    }
  }

  // CTA slide
  try {
    const ctaHtml = ctaSlideHTML(Math.min(variationPaths.length, 5) + 1);
    const ctaPath = join(PATHS.branded, photoName, `carousel-cta.png`);
    await renderTemplate(ctaHtml, ctaPath, 1080, 1080);
    templatePaths.push(ctaPath);
    templatesRendered++;
  } catch (err) {
    console.error(`  [template] CTA slide failed: ${err.message}`);
  }

  // Story frames from best 2 variations
  for (let i = 0; i < Math.min(variationPaths.length, 2); i++) {
    const { path: varPath, variation } = variationPaths[i];
    try {
      const b64 = await fileToBase64(varPath);
      const html = storyFrameHTML(
        b64,
        `This ${classification.roomType} didn't look like this 8 weeks ago.`,
        'WhatsApp Us for a Free Consultation →'
      );
      const outPath = join(PATHS.branded, photoName, `story-${variation.id}.png`);
      await renderTemplate(html, outPath, 1080, 1920);
      templatePaths.push(outPath);
      templatesRendered++;
    } catch (err) {
      console.error(`  [template] Story ${i + 1} failed: ${err.message}`);
    }
  }

  // Ad creatives from best 2 variations
  const adHeadlines = [
    `Transform Your ${classification.roomType.charAt(0).toUpperCase() + classification.roomType.slice(1)}`,
    `Your Villa Deserves Better`,
  ];
  const adBody = 'Fixed pricing. 100% in-house team. 1-year warranty. Dubai\'s most trusted villa renovation specialists.';

  for (let i = 0; i < Math.min(variationPaths.length, 2); i++) {
    const { path: varPath, variation } = variationPaths[i];
    try {
      const b64 = await fileToBase64(varPath);
      const html = adCreativeHTML(b64, adHeadlines[i] || 'Premium Villa Renovations', adBody);
      const outPath = join(PATHS.branded, photoName, `ad-${variation.id}.png`);
      await renderTemplate(html, outPath, 1200, 628);
      templatePaths.push(outPath);
      templatesRendered++;
    } catch (err) {
      console.error(`  [template] Ad ${i + 1} failed: ${err.message}`);
    }
  }

  // 6. Copy everything to ready-to-publish
  const publishDir = join(PATHS.readyToPublish, photoName);
  await mkdir(publishDir, { recursive: true });

  for (const varItem of variationPaths) {
    try {
      await copyFile(varItem.path, join(publishDir, basename(varItem.path)));
    } catch { /* skip */ }
  }
  for (const tplPath of templatePaths) {
    try {
      await copyFile(tplPath, join(publishDir, basename(tplPath)));
    } catch { /* skip */ }
  }

  // 7. Track costs
  const durationMs = Date.now() - startTime;
  await trackRun({
    sourcePhoto: basename(photoPath),
    variationsGenerated,
    templatesRendered,
    totalCost,
    durationMs,
    provider: lastProvider,
  });

  // 8. Summary
  const totalAssets = variationsGenerated + templatesRendered;
  console.log(`\n  [forge] ═══ Complete ═══`);
  console.log(`  [forge] Variations: ${variationsGenerated}`);
  console.log(`  [forge] Templates: ${templatesRendered}`);
  console.log(`  [forge] Total assets: ${totalAssets}`);
  console.log(`  [forge] Cost: $${totalCost.toFixed(3)}`);
  console.log(`  [forge] Duration: ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`  [forge] Output: vault/ready-to-publish/${photoName}/`);

  return { photoName, variationsGenerated, templatesRendered, totalCost, durationMs, totalAssets };
}

// ─── BATCH PIPELINE ───────────────────────────────────────

/**
 * Process all new photos in vault/originals/.
 */
export async function forgeBatch() {
  await mkdir(PATHS.originals, { recursive: true });
  await mkdir(PATHS.logs, { recursive: true });

  // Load processed log
  let processed = {};
  try {
    processed = JSON.parse(await readFile(PATHS.processed, 'utf-8'));
  } catch { /* first run */ }

  // Scan for new images
  const files = await readdir(PATHS.originals);
  const imageFiles = files.filter(f => IMAGE_EXTS.has(extname(f).toLowerCase()));

  if (imageFiles.length === 0) {
    console.log('[forge] No photos found in vault/originals/');
    console.log('[forge] Drop project photos there and run again.');
    return;
  }

  const newPhotos = imageFiles.filter(f => !processed[f]);
  console.log(`[forge] Found ${imageFiles.length} photos, ${newPhotos.length} new`);

  if (newPhotos.length === 0) {
    console.log('[forge] All photos already processed. To reprocess, delete logs/processed.json');
    return;
  }

  let totalVariations = 0;
  let totalTemplates = 0;
  let totalCost = 0;

  for (const file of newPhotos) {
    const photoPath = join(PATHS.originals, file);
    try {
      const result = await forgeFromPhoto(photoPath);
      totalVariations += result.variationsGenerated;
      totalTemplates += result.templatesRendered;
      totalCost += result.totalCost;

      // Mark as processed (crash-safe: save after each photo)
      processed[file] = {
        processedAt: new Date().toISOString(),
        variations: result.variationsGenerated,
        templates: result.templatesRendered,
        cost: result.totalCost,
      };
      await writeFile(PATHS.processed, JSON.stringify(processed, null, 2), 'utf-8');

    } catch (err) {
      console.error(`[forge] Failed to process ${file}: ${err.message}`);
    }

    // Pause between photos
    if (newPhotos.indexOf(file) < newPhotos.length - 1) {
      console.log(`  [forge] Pausing 5s before next photo...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log(`\n[forge] ═══ Batch Complete ═══`);
  console.log(`[forge] Photos processed: ${newPhotos.length}`);
  console.log(`[forge] Variations: ${totalVariations}`);
  console.log(`[forge] Templates: ${totalTemplates}`);
  console.log(`[forge] Total assets: ${totalVariations + totalTemplates}`);
  console.log(`[forge] Total cost: $${totalCost.toFixed(3)}`);
}

// ─── STATUS ───────────────────────────────────────────────

async function showStatus() {
  const summary = await getMonthlySummary();
  console.log(`[forge] ═══ Status ═══`);
  console.log(`[forge] Month: ${summary.month}`);
  console.log(`[forge] Runs this month: ${summary.runs}`);
  console.log(`[forge] Variations: ${summary.variations}`);
  console.log(`[forge] Templates: ${summary.templates}`);
  console.log(`[forge] Cost this month: $${summary.cost.toFixed(3)}`);
  console.log(`[forge] All-time runs: ${summary.totalRunsAllTime}`);
  if (summary.lastRun) {
    console.log(`[forge] Last run: ${summary.lastRun.timestamp} (${summary.lastRun.sourcePhoto})`);
  }
}

// ─── TEST ─────────────────────────────────────────────────

async function runTest() {
  console.log('[forge] ═══ System Test ═══\n');

  // Check directories
  console.log('[test] Checking directories...');
  for (const [name, path] of Object.entries(PATHS)) {
    if (name === 'processed') continue;
    try {
      await access(path);
      console.log(`  ✓ ${name}: ${path}`);
    } catch {
      console.log(`  ✗ ${name}: ${path} (missing)`);
    }
  }

  // Check API keys
  console.log('\n[test] Checking API keys...');
  const falKey = process.env.FAL_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  console.log(`  FAL_API_KEY: ${falKey ? (falKey.startsWith('placeholder') ? '⚠ placeholder' : '✓ set') : '✗ missing'}`);
  console.log(`  OPENAI_API_KEY: ${openaiKey ? '✓ set' : '⚠ not set (optional fallback)'}`);

  // Test API connectivity
  console.log('\n[test] Testing API connections...');
  const connections = await testConnections();
  console.log(`  Grok (fal.ai): ${connections.grok ? '✓ connected' : '✗ unavailable'}`);
  console.log(`  GPT Image: ${connections.gpt ? '✓ connected' : '⚠ unavailable (optional)'}`);

  // Test Puppeteer
  console.log('\n[test] Testing Puppeteer...');
  try {
    const version = await testPuppeteer();
    console.log(`  ✓ Chromium: ${version}`);
  } catch (err) {
    console.log(`  ✗ Puppeteer failed: ${err.message}`);
  }

  // Check for photos
  console.log('\n[test] Checking vault...');
  try {
    const originals = await readdir(PATHS.originals);
    const images = originals.filter(f => IMAGE_EXTS.has(extname(f).toLowerCase()));
    console.log(`  Photos in vault/originals/: ${images.length}`);
  } catch {
    console.log(`  No photos found in vault/originals/`);
  }

  // Cost summary
  console.log('\n[test] Cost summary...');
  const summary = await getMonthlySummary();
  console.log(`  This month: $${summary.cost.toFixed(3)} (${summary.runs} runs)`);

  console.log('\n[forge] Test complete ✓');
}

// ─── CLASSIFY TEST ────────────────────────────────────────

function testClassify(path) {
  const result = classifyScene(path);
  console.log(`[classify] File: ${basename(path)}`);
  console.log(`  Scene: ${result.sceneType}`);
  console.log(`  Room: ${result.roomType}`);
  console.log(`  Confidence: ${result.confidence}`);
  console.log(`  Keywords: ${result.matchedKeywords.join(', ') || 'none'}`);
}

// ─── CLI ──────────────────────────────────────────────────

const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'photo':
    if (!arg) {
      console.error('Usage: node index.js photo <path-to-image>');
      process.exit(1);
    }
    forgeFromPhoto(arg).catch(err => {
      console.error(`[forge] Fatal: ${err.message}`);
      process.exit(1);
    });
    break;

  case 'batch':
    forgeBatch().catch(err => {
      console.error(`[forge] Fatal: ${err.message}`);
      process.exit(1);
    });
    break;

  case 'status':
    showStatus().catch(err => {
      console.error(`[forge] Error: ${err.message}`);
      process.exit(1);
    });
    break;

  case 'classify':
    if (!arg) {
      console.error('Usage: node index.js classify <path-to-image>');
      process.exit(1);
    }
    testClassify(arg);
    break;

  case 'test':
    runTest().catch(err => {
      console.error(`[forge] Test error: ${err.message}`);
      process.exit(1);
    });
    break;

  default:
    console.log(`Forge — Creative Engine for Sovereign Marketing System`);
    console.log(`\nUsage:`);
    console.log(`  node agents/forge/index.js photo <path>   Process a single photo`);
    console.log(`  node agents/forge/index.js batch          Process all new photos in vault/originals/`);
    console.log(`  node agents/forge/index.js status         Show costs and stats`);
    console.log(`  node agents/forge/index.js classify <p>   Test scene classification`);
    console.log(`  node agents/forge/index.js test           Verify API connections and deps`);
    break;
}
