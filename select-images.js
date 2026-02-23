#!/usr/bin/env node
/**
 * select-images.js
 *
 * Scans the curated image directories on disk, reads metadata from
 * curator-analysis.json where possible, scores each image, and selects
 * the best candidates for each website destination category.
 *
 * The curated files have been renamed by the categoriser to descriptive
 * filenames: {room_type}-{stage}-{description}-{NNN}.{ext}
 * These sit in /root/unicorn-sovereign/vault/curated/{room_type}/{stage}/
 * or directly in /root/unicorn-sovereign/vault/curated/{room_type}/
 *
 * Destination structure under /home/openclaw/sites/first-unicorn-interiors/images/:
 *   hero/         — ~15 images (best from all categories, for hero banners)
 *   kitchen/      — 7 images
 *   bathroom/     — 7 images
 *   pool/         — 7 images
 *   glass/        — 7 images (from glass-aluminium)
 *   joinery/      — 7 images (from joinery + other with wood/staircase keywords)
 *   interiors/    — ~20 images (from living-room, bedroom, full-villa)
 *   construction/ — ~30 images (from exterior, site-progress)
 *   approvals/    — 6 images (from exterior + other with architectural/design keywords)
 *   team/         — up to 7 images (from team)
 *   community/    — 6 images (from hero-shots or exterior with community names)
 */

import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ANALYSIS_PATH = '/root/unicorn-sovereign/logs/curator-analysis.json';
const CURATED_BASE  = '/root/unicorn-sovereign/vault/curated';
const HERO_SHOTS_DIR = path.join(CURATED_BASE, 'hero-shots');
const DEST_BASE     = '/home/openclaw/sites/first-unicorn-interiors/images';
const OUTPUT_PATH   = '/root/unicorn-sovereign/image-selection.json';

const MAX_FILE_SIZE_KB = 400;
const TOTAL_BUDGET_MB  = 60;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively scan a directory for image files */
function scanImages(dir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      results.push(...scanImages(full));
    } else if (/\.(webp|jpg|jpeg|png)$/i.test(e.name)) {
      try {
        const size = fs.statSync(full).size;
        results.push({ absPath: full, filename: e.name, size });
      } catch {
        // skip unreadable files
      }
    }
  }
  return results;
}

/** Parse metadata from a curated filename like "kitchen-after-dark-wood-veneer-cabinetry-wit-027.webp" */
function parseFilename(filename) {
  // Pattern: {roomType}-{stage}-{description}-{index}.{ext}
  // roomType can contain hyphens (e.g., glass-aluminium, living-room, full-villa)
  const knownRooms = [
    'glass-aluminium', 'living-room', 'full-villa', 'site-progress',
    'kitchen', 'bathroom', 'pool', 'exterior', 'bedroom', 'joinery',
    'flooring', 'painting', 'team', 'other'
  ];
  const knownStages = ['after', 'before', 'during', 'not-applicable'];

  let roomType = 'unknown';
  let stage = 'unknown';
  let description = filename;

  for (const room of knownRooms) {
    if (filename.startsWith(room + '-')) {
      roomType = room;
      const rest = filename.slice(room.length + 1);
      for (const s of knownStages) {
        if (rest.startsWith(s + '-')) {
          stage = s;
          description = rest.slice(s.length + 1);
          break;
        }
      }
      break;
    }
  }

  const ext = path.extname(filename).toLowerCase();

  return { roomType, stage, description, ext };
}

/** Score an image file: higher is better */
function scoreImage(file, meta) {
  let score = 0;

  // All curated (non-skip) files have quality >= 8 (the heroThreshold).
  // We treat all as quality 9 baseline (most common score).
  score += 900;

  // Prefer "after" stage
  if (meta.stage === 'after') score += 50;
  else if (meta.stage === 'not-applicable') score += 20;

  // Prefer .webp format
  if (meta.ext === '.webp') score += 30;
  else if (meta.ext === '.jpg' || meta.ext === '.jpeg') score += 10;

  // Prefer smaller files
  const kb = file.size / 1024;
  if (kb <= 100) score += 25;
  else if (kb <= 200) score += 20;
  else if (kb <= 400) score += 15;
  else if (kb <= 800) score += 5;

  return score;
}

// ---------------------------------------------------------------------------
// Destination category matchers
// ---------------------------------------------------------------------------

function matchKitchen(meta) { return meta.roomType === 'kitchen'; }
function matchBathroom(meta) { return meta.roomType === 'bathroom'; }
function matchPool(meta) { return meta.roomType === 'pool'; }
function matchGlass(meta) { return meta.roomType === 'glass-aluminium'; }

function matchJoinery(meta) {
  if (meta.roomType === 'joinery') return true;
  if (meta.roomType === 'other') {
    return /\b(wood|wooden|timber|staircase|stairs|joinery|carpentry|wardrobe|closet|cabinet|slat)\b/i.test(meta.description);
  }
  return false;
}

function matchInteriors(meta) {
  return ['living-room', 'bedroom', 'full-villa'].includes(meta.roomType);
}

function matchConstruction(meta) {
  if (['exterior', 'site-progress'].includes(meta.roomType)) return true;
  if (meta.roomType === 'other') {
    return /\b(hvac|ac-unit|solar|steel|construction|industrial|brick|exposed-ceiling|air-handling)\b/i.test(meta.description);
  }
  return false;
}

function matchApprovals(meta) {
  if (meta.roomType === 'exterior') {
    return /\b(architect|design|plan|blueprint|render|elevation|facade|concept|approval|geometric|contemporary|modern|minimalist|concrete|glass-wall|perforated|cladding)\b/i.test(meta.description);
  }
  if (meta.roomType === 'other') {
    return /\b(architect|design|blueprint|render|elevation|facade|concept|approval|drawing|glass-facade)\b/i.test(meta.description);
  }
  if (meta.roomType === 'full-villa') {
    return /\b(architect|cubic|contemporary)\b/i.test(meta.description);
  }
  return false;
}

function matchTeam(meta) { return meta.roomType === 'team'; }

function matchCommunity(meta) {
  if (meta.roomType === 'exterior') {
    return /\b(villa|house|residential|community|neighborhood|estate|aerial|garden|landscape|putting|golf|pergola|facade|entrance)\b/i.test(meta.description);
  }
  if (meta.roomType === 'full-villa') return true;
  if (meta.roomType === 'pool') {
    return /\b(villa|facade|infinity|lap-pool|outdoor|pergola)\b/i.test(meta.description);
  }
  return false;
}

// Category configs — order matters: categories processed first get first pick.
// approvals and community run before construction so they can claim
// the best exterior images with architectural/community keywords.
const CATEGORIES = [
  { name: 'kitchen',      quota: 7,  matcher: matchKitchen },
  { name: 'bathroom',     quota: 7,  matcher: matchBathroom },
  { name: 'pool',         quota: 7,  matcher: matchPool },
  { name: 'glass',        quota: 7,  matcher: matchGlass },
  { name: 'joinery',      quota: 7,  matcher: matchJoinery },
  { name: 'interiors',    quota: 20, matcher: matchInteriors },
  { name: 'team',         quota: 7,  matcher: matchTeam },
  { name: 'approvals',    quota: 6,  matcher: matchApprovals },
  { name: 'community',    quota: 6,  matcher: matchCommunity, heroFallback: true },
  { name: 'construction', quota: 30, matcher: matchConstruction },
];

const HERO_QUOTA = 15;
const HERO_MAX_PER_ROOM = 3;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('Scanning curated image directories...');

  // 1. Scan all non-hero curated directories for actual files
  const roomDirs = fs.readdirSync(CURATED_BASE, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== 'hero-shots' && d.name !== 'skip' && d.name !== 'needs-review')
    .map(d => d.name);

  const allFiles = [];
  for (const dir of roomDirs) {
    const dirPath = path.join(CURATED_BASE, dir);
    const images = scanImages(dirPath);
    allFiles.push(...images);
  }

  console.log(`  Found ${allFiles.length} curated images across ${roomDirs.length} directories`);

  // 2. Parse metadata and score each file
  const enriched = allFiles.map(file => {
    const meta = parseFilename(file.filename);
    const score = scoreImage(file, meta);
    return { ...file, meta, score };
  });

  // 2b. Also scan hero-shots directory for fallback pool (community, etc.)
  const heroShotsPool = scanImages(HERO_SHOTS_DIR).map(file => {
    const meta = parseFilename(file.filename);
    const score = scoreImage(file, meta);
    return { ...file, meta, score };
  });
  console.log(`  Found ${heroShotsPool.length} hero-shot images for fallback pool`);

  // 3. Process each destination category
  const assigned = new Set();
  const result = {};
  let totalBytes = 0;

  for (const cat of CATEGORIES) {
    // Primary candidates from room-type directories
    const candidates = enriched
      .filter(item => {
        if (assigned.has(item.absPath)) return false;
        return cat.matcher(item.meta);
      })
      .sort((a, b) => b.score - a.score);

    const selected = [];
    for (const item of candidates) {
      if (selected.length >= cat.quota) break;
      selected.push(item);
      assigned.add(item.absPath);
    }

    // If this category supports heroFallback and we still need more images,
    // pull from the hero-shots pool
    if (cat.heroFallback && selected.length < cat.quota) {
      const heroFallbackCandidates = heroShotsPool
        .filter(item => {
          if (assigned.has(item.absPath)) return false;
          return cat.matcher(item.meta);
        })
        .sort((a, b) => b.score - a.score);

      for (const item of heroFallbackCandidates) {
        if (selected.length >= cat.quota) break;
        selected.push(item);
        assigned.add(item.absPath);
      }
    }

    const destDir = path.join(DEST_BASE, cat.name);
    const mappings = selected.map(item => {
      totalBytes += item.size;
      return {
        source: item.absPath,
        destination: path.join(destDir, item.filename),
        size_kb: Math.round(item.size / 1024),
        room_type: item.meta.roomType,
        stage: item.meta.stage,
        format: item.meta.ext,
        score: item.score,
      };
    });

    result[cat.name] = {
      count: mappings.length,
      quota: cat.quota,
      total_size_kb: mappings.reduce((s, m) => s + m.size_kb, 0),
      files: mappings,
    };

    console.log(`  ${cat.name}: selected ${mappings.length}/${cat.quota}`);
  }

  // 4. Hero images — from the hero-shots directory (pre-curated best-of copies)
  console.log('\nSelecting hero images from hero-shots directory...');
  const heroImages = scanImages(HERO_SHOTS_DIR).map(file => {
    const meta = parseFilename(file.filename);
    const score = scoreImage(file, meta);
    return { ...file, meta, score };
  });

  heroImages.sort((a, b) => b.score - a.score);

  const heroSelected = [];
  const heroRoomCounts = {};

  // First pass: prefer under 400KB
  for (const item of heroImages) {
    if (heroSelected.length >= HERO_QUOTA) break;
    const rc = heroRoomCounts[item.meta.roomType] || 0;
    if (rc >= HERO_MAX_PER_ROOM) continue;
    if (item.size / 1024 > MAX_FILE_SIZE_KB) continue;
    heroSelected.push(item);
    heroRoomCounts[item.meta.roomType] = rc + 1;
  }

  // Second pass: relax size limit if needed
  if (heroSelected.length < HERO_QUOTA) {
    for (const item of heroImages) {
      if (heroSelected.length >= HERO_QUOTA) break;
      if (heroSelected.some(s => s.absPath === item.absPath)) continue;
      const rc = heroRoomCounts[item.meta.roomType] || 0;
      if (rc >= HERO_MAX_PER_ROOM) continue;
      heroSelected.push(item);
      heroRoomCounts[item.meta.roomType] = rc + 1;
    }
  }

  const heroDestDir = path.join(DEST_BASE, 'hero');
  const heroMappings = heroSelected.map(item => {
    totalBytes += item.size;
    return {
      source: item.absPath,
      destination: path.join(heroDestDir, item.filename),
      size_kb: Math.round(item.size / 1024),
      room_type: item.meta.roomType,
      stage: item.meta.stage,
      format: item.meta.ext,
      score: item.score,
    };
  });

  result.hero = {
    count: heroMappings.length,
    quota: HERO_QUOTA,
    total_size_kb: heroMappings.reduce((s, m) => s + m.size_kb, 0),
    files: heroMappings,
  };
  console.log(`  hero: selected ${heroMappings.length}/${HERO_QUOTA}`);

  // 5. Summary
  const totalKB = Math.round(totalBytes / 1024);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
  const totalImages = Object.values(result).reduce((s, r) => s + r.count, 0);
  const oversized = Object.values(result).flatMap(r => r.files).filter(f => f.size_kb > MAX_FILE_SIZE_KB);

  const summary = {
    total_images: totalImages,
    total_size_kb: totalKB,
    total_size_mb: parseFloat(totalMB),
    within_budget: parseFloat(totalMB) <= TOTAL_BUDGET_MB,
    files_over_400kb: oversized.length,
    categories: {},
  };

  for (const [k, v] of Object.entries(result)) {
    summary.categories[k] = { count: v.count, quota: v.quota, size_kb: v.total_size_kb };
  }

  const output = { summary, selections: result };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nOutput written to ${OUTPUT_PATH}`);
  console.log(`\nSummary:`);
  console.log(`  Total images: ${totalImages}`);
  console.log(`  Total size: ${totalMB} MB (budget: ${TOTAL_BUDGET_MB} MB) — ${parseFloat(totalMB) <= TOTAL_BUDGET_MB ? 'WITHIN budget' : 'OVER budget'}`);
  console.log(`  Files over ${MAX_FILE_SIZE_KB}KB: ${oversized.length}`);

  if (oversized.length > 0) {
    console.log('  Oversized files:');
    oversized.forEach(f => console.log(`    ${f.size_kb}KB — ${path.basename(f.source)}`));
  }

  console.log('\n  Per-category breakdown:');
  for (const [cat, info] of Object.entries(result)) {
    console.log(`    ${cat.padEnd(15)} ${String(info.count).padStart(3)}/${String(info.quota).padStart(3)}   ${(info.total_size_kb / 1024).toFixed(1)} MB`);
  }
}

main();
