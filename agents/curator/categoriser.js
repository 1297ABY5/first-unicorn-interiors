import { readFile, writeFile, readdir, copyFile, rename, mkdir, stat } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { CONFIG } from './config.js';
import { getAllAnalyses, appendLog } from './logger.js';

// ─── BUILD DESCRIPTIVE FILENAME ──────────────────────────

function buildFilename(analysis, originalName, index) {
  const room = analysis.room_type || 'unknown';
  const stage = analysis.stage || 'unknown';
  const community = analysis.community && analysis.community !== 'unknown' ? analysis.community : '';
  const feature = (analysis.notable_features || [])[0] || '';

  const parts = [room, stage];
  if (community) parts.push(community);
  if (feature) parts.push(feature.replace(/\s+/g, '-').toLowerCase().slice(0, 30));

  const ext = extname(originalName).toLowerCase();
  const idx = String(index).padStart(3, '0');
  return `${parts.join('-')}-${idx}${ext}`;
}

// ─── CATEGORISE & SORT ───────────────────────────────────

export async function categoriseAll() {
  const analyses = await getAllAnalyses();
  const entries = Object.entries(analyses);

  if (entries.length === 0) {
    console.log('[curator] No analysed photos to categorise');
    return { categorised: 0, heroes: 0, skipped: 0 };
  }

  // Load existing manifest
  let manifest;
  try {
    manifest = JSON.parse(await readFile(CONFIG.paths.manifest, 'utf-8'));
  } catch {
    manifest = { photos: [], lastUpdated: null };
  }

  const alreadyCategorised = new Set(manifest.photos.map(p => p.originalFilename));

  let categorised = 0;
  let heroes = 0;
  let skipped = 0;
  let index = manifest.photos.length;

  for (const [filename, analysis] of entries) {
    if (alreadyCategorised.has(filename)) continue;

    const originalPath = join(CONFIG.paths.originals, filename);

    // Verify file exists
    try {
      await stat(originalPath);
    } catch {
      continue; // file removed, skip
    }

    try {
      index++;
      const newFilename = buildFilename(analysis, filename, index);
      const roomType = analysis.room_type || 'other';
      const stage = analysis.stage || 'not-applicable';
      const quality = analysis.quality_score || 5;

      const destinations = [];

      // Skip low quality
      if (quality <= CONFIG.skipThreshold) {
        const skipDest = join(CONFIG.paths.skip, newFilename);
        await mkdir(CONFIG.paths.skip, { recursive: true });
        await copyFile(originalPath, skipDest);
        destinations.push(`skip/${newFilename}`);
        skipped++;
        await appendLog(`SKIP ${filename} → skip/ (quality ${quality})`);
        console.log(`  [skip] ${filename} → skip/ (quality ${quality}/10)`);

      } else {
        // Copy to room/stage directory
        if (CONFIG.categories.rooms.includes(roomType)) {
          const roomDir = CONFIG.categories.stages.includes(stage)
            ? join(CONFIG.paths.curated, roomType, stage)
            : join(CONFIG.paths.curated, roomType);
          await mkdir(roomDir, { recursive: true });
          await copyFile(originalPath, join(roomDir, newFilename));
          destinations.push(`${roomType}/${stage}/${newFilename}`);
        } else {
          // team, site-progress, other
          const otherDir = join(CONFIG.paths.curated, roomType);
          await mkdir(otherDir, { recursive: true });
          await copyFile(originalPath, join(otherDir, newFilename));
          destinations.push(`${roomType}/${newFilename}`);
        }

        // Hero shots
        if (quality >= CONFIG.heroThreshold) {
          await mkdir(CONFIG.paths.heroShots, { recursive: true });
          await copyFile(originalPath, join(CONFIG.paths.heroShots, newFilename));
          destinations.push(`hero-shots/${newFilename}`);
          heroes++;

          // Also copy to forge originals for branded asset creation
          await copyFile(originalPath, join(CONFIG.paths.forgeOriginals, newFilename));
          destinations.push(`forge-originals/${newFilename}`);
        }

        categorised++;
        console.log(`  [sort] ${filename} → ${destinations[0]} (quality ${quality}/10)`);
      }

      // Add to manifest
      manifest.photos.push({
        originalFilename: filename,
        newFilename,
        roomType,
        stage,
        community: analysis.community || 'unknown',
        quality,
        description: analysis.description,
        suggestedCaption: analysis.suggested_caption,
        notableFeatures: analysis.notable_features,
        websitePlacement: analysis.website_placement,
        isBeforeAfterPair: analysis.is_before_after_pair,
        destinations,
        categorisedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`  [sort] Failed: ${filename} — ${err.message}`);
      await appendLog(`SORT_ERROR ${filename} — ${err.message}`).catch(() => {});
    }
  }

  manifest.lastUpdated = new Date().toISOString();
  await writeFile(CONFIG.paths.manifest, JSON.stringify(manifest, null, 2), 'utf-8');
  await appendLog(`CATEGORISE total=${categorised} heroes=${heroes} skipped=${skipped}`);

  console.log(`\n[curator] Categorised: ${categorised} | Heroes: ${heroes} | Skipped: ${skipped}`);
  return { categorised, heroes, skipped };
}

export async function loadManifest() {
  try {
    return JSON.parse(await readFile(CONFIG.paths.manifest, 'utf-8'));
  } catch {
    return { photos: [], lastUpdated: null };
  }
}
