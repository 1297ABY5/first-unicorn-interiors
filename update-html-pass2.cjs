#!/usr/bin/env node
/**
 * Pass 2: Fix remaining placeholders not caught by pass 1.
 */
const fs = require('fs');
const path = require('path');

const SITE = '/home/openclaw/sites/first-unicorn-interiors';
const sel = JSON.parse(fs.readFileSync('/root/unicorn-sovereign/image-selection.json', 'utf8'));

const imgs = {};
for (const [cat, data] of Object.entries(sel.selections)) {
  imgs[cat] = data.files.map(f => path.basename(f.destination));
}

function relImg(pageDir) {
  const rel = path.relative(path.join(SITE, pageDir), path.join(SITE, 'images'));
  return rel || 'images';
}

let totalFixed = 0;

function fixFile(pageDir, replacements) {
  const filePath = path.join(SITE, pageDir, 'index.html');
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');
  const original = html;

  for (const [pattern, replacement] of replacements) {
    html = html.replace(pattern, replacement);
  }

  if (html !== original) {
    fs.writeFileSync(filePath, html);
    const before = (original.match(/background:var\(--bg-(?:tertiary|secondary)\)/g) || []).length;
    const after = (html.match(/background:var\(--bg-(?:tertiary|secondary)\)/g) || []).length;
    const fixed = before - after;
    totalFixed += fixed;
    console.log(`${pageDir}: fixed ${fixed} (${after} remaining)`);
  } else {
    const rem = (html.match(/background:var\(--bg-(?:tertiary|secondary)\)/g) || []).length;
    if (rem > 0) console.log(`${pageDir}: no fix applied (${rem} remaining)`);
  }
}

// ═══ 1. PORTFOLIO MAIN PAGE — community-card portfolio-item ═══
{
  const pageDir = 'portfolio';
  const filePath = path.join(SITE, pageDir, 'index.html');
  let html = fs.readFileSync(filePath, 'utf8');
  const original = html;
  const base = relImg(pageDir);

  const portfolioImgs = [
    // design (3)
    `approvals/${imgs.approvals[0]}`,
    `approvals/${imgs.approvals[2]}`,
    `approvals/${imgs.approvals[1]}`,
    // interiors (3)
    `interiors/${imgs.interiors[0]}`,
    `interiors/${imgs.interiors[4]}`,
    `interiors/${imgs.interiors[10]}`,
    // renovation (3)
    `interiors/${imgs.interiors[8]}`,
    `kitchen/${imgs.kitchen[0]}`,
    `bathroom/${imgs.bathroom[0]}`,
    // contracting (3)
    `construction/${imgs.construction[6]}`,
    `construction/${imgs.construction[20]}`,
    `construction/${imgs.construction[4]}`,
  ];

  let i = 0;
  html = html.replace(
    /(<div class="community-card fade-in(?:\s+portfolio-item)?"(?:\s+data-category="[^"]*")?>\s*)<div style="width:100%;height:100%;background:var\(--bg-tertiary\)"><\/div>/g,
    (match, prefix) => {
      if (i < portfolioImgs.length) {
        const img = portfolioImgs[i++];
        return `${prefix}<img src="${base}/${img}" alt="Portfolio project" loading="lazy" style="width:100%;height:100%;object-fit:cover">`;
      }
      return match;
    }
  );

  if (html !== original) {
    fs.writeFileSync(filePath, html);
    const before = (original.match(/background:var\(--bg-(?:tertiary|secondary)\)/g) || []).length;
    const after = (html.match(/background:var\(--bg-(?:tertiary|secondary)\)/g) || []).length;
    totalFixed += before - after;
    console.log(`portfolio: fixed ${before - after} (${after} remaining)`);
  }
}

// ═══ 2. PORTFOLIO SUB-PAGES — community-card fade-in (no portfolio-item) ═══
const portfolioSubPages = {
  'portfolio/renovation': [
    `interiors/${imgs.interiors[8]}`,
    `kitchen/${imgs.kitchen[0]}`,
    `bathroom/${imgs.bathroom[0]}`,
    `pool/${imgs.pool[0]}`,
    `glass/${imgs.glass[0]}`,
    `joinery/${imgs.joinery[0]}`,
  ],
  'portfolio/interiors': [
    `interiors/${imgs.interiors[0]}`,
    `interiors/${imgs.interiors[4]}`,
    `interiors/${imgs.interiors[7]}`,
    `interiors/${imgs.interiors[8]}`,
    `interiors/${imgs.interiors[10]}`,
    `interiors/${imgs.interiors[12]}`,
  ],
  'portfolio/contracting': [
    `construction/${imgs.construction[0]}`,
    `construction/${imgs.construction[5]}`,
    `construction/${imgs.construction[6]}`,
    `construction/${imgs.construction[15]}`,
    `construction/${imgs.construction[20]}`,
    `construction/${imgs.construction[22]}`,
  ],
  'portfolio/design-approvals': [
    `approvals/${imgs.approvals[0]}`,
    `approvals/${imgs.approvals[1]}`,
    `approvals/${imgs.approvals[2]}`,
    `approvals/${imgs.approvals[3]}`,
    `approvals/${imgs.approvals[4]}`,
    `approvals/${imgs.approvals[5]}`,
  ],
};

for (const [pageDir, images] of Object.entries(portfolioSubPages)) {
  const filePath = path.join(SITE, pageDir, 'index.html');
  let html = fs.readFileSync(filePath, 'utf8');
  const original = html;
  const base = relImg(pageDir);

  let i = 0;
  html = html.replace(
    /(<div class="community-card fade-in"[^>]*>\s*)<div style="width:100%;height:100%;background:var\(--bg-tertiary\)"><\/div>/g,
    (match, prefix) => {
      if (i < images.length) {
        const img = images[i++];
        return `${prefix}<img src="${base}/${img}" alt="Portfolio project" loading="lazy" style="width:100%;height:100%;object-fit:cover">`;
      }
      return match;
    }
  );

  if (html !== original) {
    fs.writeFileSync(filePath, html);
    const before = (original.match(/background:var\(--bg-(?:tertiary|secondary)\)/g) || []).length;
    const after = (html.match(/background:var\(--bg-(?:tertiary|secondary)\)/g) || []).length;
    totalFixed += before - after;
    console.log(`${pageDir}: fixed ${before - after} (${after} remaining)`);
  }
}

// ═══ 3. CONTRACTING SUB-PAGES — service-gallery-item WITH existing data-lightbox ═══
const contractingPages = {
  'contracting/villa-construction': imgs.construction.slice(0, 6).map(f => 'construction/' + f),
  'contracting/low-rise': imgs.construction.slice(6, 12).map(f => 'construction/' + f),
  'contracting/mid-rise': imgs.construction.slice(12, 18).map(f => 'construction/' + f),
  'contracting/structural-works': imgs.construction.slice(18, 24).map(f => 'construction/' + f),
  'contracting/civil-works': imgs.construction.slice(24, 30).map(f => 'construction/' + f),
};

for (const [pageDir, images] of Object.entries(contractingPages)) {
  const filePath = path.join(SITE, pageDir, 'index.html');
  let html = fs.readFileSync(filePath, 'utf8');
  const original = html;
  const base = relImg(pageDir);

  let i = 0;
  // Pattern: <div class="service-gallery-item" data-lightbox="..."><div style="width:100%;height:100%;background:var(--bg-tertiary)"></div></div>
  html = html.replace(
    /<div class="service-gallery-item" data-lightbox="[^"]*">\s*<div style="width:100%;height:100%;background:var\(--bg-tertiary\)"><\/div>\s*<\/div>/g,
    (match) => {
      if (i < images.length) {
        const img = images[i++];
        const alt = getContractingAlt(pageDir);
        return `<div class="service-gallery-item" data-lightbox="${base}/${img}"><img data-src="${base}/${img}" alt="${alt}" loading="lazy"></div>`;
      }
      return match;
    }
  );

  if (html !== original) {
    fs.writeFileSync(filePath, html);
    const before = (original.match(/background:var\(--bg-(?:tertiary|secondary)\)/g) || []).length;
    const after = (html.match(/background:var\(--bg-(?:tertiary|secondary)\)/g) || []).length;
    totalFixed += before - after;
    console.log(`${pageDir}: fixed ${before - after} (${after} remaining)`);
  }
}

function getContractingAlt(pageDir) {
  const map = {
    'contracting/villa-construction': 'Villa construction project, Dubai',
    'contracting/low-rise': 'Low-rise construction, Dubai',
    'contracting/mid-rise': 'Mid-rise construction, Dubai',
    'contracting/structural-works': 'Structural works, Dubai',
    'contracting/civil-works': 'Civil works, Dubai',
  };
  return map[pageDir] || 'Construction project, Dubai';
}

// ═══ 4. OVERVIEW PAGES — feature images with different patterns ═══
// Renovation overview: <div style="width:100%;aspect-ratio:4/3;background:var(--bg-tertiary)"></div>
fixFile('renovation', [
  [
    /<div style="width:100%;aspect-ratio:4\/3;background:var\(--bg-tertiary\)"><\/div>/g,
    `<img src="${relImg('renovation')}/interiors/${imgs.interiors[0]}" alt="Renovation services, Dubai" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--radius)" loading="lazy">`
  ],
]);

// Contracting overview: similar but with old hero format
fixFile('contracting', [
  [
    /<div style="width:100%;aspect-ratio:4\/3;background:var\(--bg-tertiary\)"><\/div>/g,
    `<img src="${relImg('contracting')}/construction/${imgs.construction[6]}" alt="Construction services, Dubai" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--radius)" loading="lazy">`
  ],
  // Fix hero — contracting has old format
  [
    /<div class="page-hero-bg" style="background-image:url\('\.\.\/images\/hero\/hero-contracting\.jpg'\);background-color:var\(--bg-secondary\)"><\/div>/g,
    `<div class="page-hero-bg" style="background-image:url('${relImg('contracting')}/hero/exterior-after-contemporary-horizontal-panel--107.webp');background-size:cover;background-position:center;background-color:var(--bg-secondary)"></div>`
  ],
]);

// Design-approvals overview: has different aspect-ratio pattern (no width)
fixFile('design-approvals', [
  [
    /<div style="aspect-ratio:4\/3;background:var\(--bg-secondary\)"><\/div>/g,
    `<img src="${relImg('design-approvals')}/approvals/${imgs.approvals[0]}" alt="Design approvals, Dubai" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--radius)" loading="lazy">`
  ],
]);

// Design-approvals sub-pages: all have page-hero-bg already replaced but may have feature images
for (const subPage of ['architectural-design', 'engineering-drawings', '3d-visualisation', 'municipality-approvals', 'building-permits', 'noc-processing']) {
  const pageDir = `design-approvals/${subPage}`;
  const filePath = path.join(SITE, pageDir, 'index.html');
  if (!fs.existsSync(filePath)) continue;
  let html = fs.readFileSync(filePath, 'utf8');
  const original = html;
  const base = relImg(pageDir);
  const approvalIdx = ['architectural-design', 'engineering-drawings', '3d-visualisation', 'municipality-approvals', 'building-permits', 'noc-processing'].indexOf(subPage);

  // Replace feature/aspect-ratio images
  html = html.replace(
    /<div style="(?:width:100%;)?aspect-ratio:4\/3;background:var\(--bg-(?:tertiary|secondary)\)"><\/div>/g,
    `<img src="${base}/approvals/${imgs.approvals[approvalIdx % imgs.approvals.length]}" alt="${subPage.replace(/-/g, ' ')}, Dubai" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--radius)" loading="lazy">`
  );

  // Replace any remaining generic placeholders
  html = html.replace(
    /<div style="width:100%;height:100%;background:var\(--bg-(?:tertiary|secondary)\)"><\/div>/g,
    `<img src="${base}/approvals/${imgs.approvals[(approvalIdx + 1) % imgs.approvals.length]}" alt="Design project, Dubai" loading="lazy" style="width:100%;height:100%;object-fit:cover">`
  );

  if (html !== original) {
    fs.writeFileSync(filePath, html);
    const before = (original.match(/background:var\(--bg-(?:tertiary|secondary)\)/g) || []).length;
    const after = (html.match(/background:var\(--bg-(?:tertiary|secondary)\)/g) || []).length;
    totalFixed += before - after;
    console.log(`${pageDir}: fixed ${before - after} (${after} remaining)`);
  }
}

// ═══ 5. CONTACT PAGE — map placeholder ═══
fixFile('contact', [
  [
    /<div style="width:100%;height:400px;background:var\(--bg-tertiary\);border:1px solid var\(--border\);overflow:hidden;[^"]*">/g,
    `<div style="width:100%;height:400px;border:1px solid var(--border);overflow:hidden;background-image:url('${relImg('contact')}/community/${imgs.community[0]}');background-size:cover;background-position:center">`
  ],
]);

console.log(`\nPass 2 done. Total fixed: ${totalFixed}`);

// Final check across all files
let totalRemaining = 0;
const allFiles = [];
function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !['images', 'node_modules', '.git'].includes(entry.name)) walkDir(full);
    else if (entry.name === 'index.html') allFiles.push(full);
  }
}
walkDir(SITE);
for (const f of allFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const matches = html.match(/background:var\(--bg-(?:tertiary|secondary)\)/g) || [];
  // Filter out hero bg-secondary that already have background-image
  const remaining = [];
  for (const m of matches) {
    // Check if this is within a hero div that already has background-image
    const idx = html.indexOf(m);
    const before = html.substring(Math.max(0, idx - 200), idx);
    if (before.includes('background-image:url(')) continue;
    remaining.push(m);
  }
  if (remaining.length > 0) {
    const rel = path.relative(SITE, f);
    console.log(`  Remaining: ${rel} (${remaining.length})`);
    totalRemaining += remaining.length;
  }
}
console.log(`\nTotal remaining placeholders (excl. hero-with-image): ${totalRemaining}`);
