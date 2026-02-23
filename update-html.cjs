#!/usr/bin/env node
/**
 * Update all 42 HTML pages with real photos from curated selection.
 * Replaces placeholder divs with <img> tags / background-image URLs.
 */
const fs = require('fs');
const path = require('path');

const SITE = '/home/openclaw/sites/first-unicorn-interiors';
const sel = JSON.parse(fs.readFileSync('/root/unicorn-sovereign/image-selection.json', 'utf8'));

// Build filename-only lists per category for easy access
const imgs = {};
for (const [cat, data] of Object.entries(sel.selections)) {
  imgs[cat] = data.files.map(f => path.basename(f.destination));
}

// ─── IMAGE ASSIGNMENT PER PAGE ───

// Helper: get relative path from page to images/
function relImg(pageDir) {
  const rel = path.relative(path.join(SITE, pageDir), path.join(SITE, 'images'));
  return rel || 'images';
}

// Page configs: { file, heroImg, heroType, featureImg, featureCategory, galleryImgs, galleryCat, galleryType }
const pages = [];

// ═══ HERO IMAGES per page (assigned from hero/ directory) ═══
const heroAssignments = {
  // index.html already has hero-home.jpg, skip hero replacement
  'about': 'living-room-after-organic-curved-sofa-and-armcha-141.webp',
  'renovation': 'kitchen-after-exposed-red-brick-accent-wall-070.webp',
  'renovation/kitchen': 'kitchen-after-smart-home-digital-interface-w-002.webp',
  'renovation/bathroom': 'bathroom-after-black-framed-glass-shower-encl-091.webp',
  'renovation/pool': 'exterior-after-black-aluminum-pergola-with-ho-106.webp',
  'renovation/glass-aluminium': 'glass-aluminium-after-black-aluminum-frame-090.webp',
  'renovation/joinery': 'other-after-curved-glass-panel-railing-sys-117.webp',
  'renovation/flooring': 'glass-aluminium-after-curved-glass-panels-with-alumi-111.webp',
  'renovation/full-villa': 'living-room-after-floor-to-ceiling-sliding-glass-086.webp',
  'contracting': 'exterior-after-contemporary-horizontal-panel--107.webp',
  'contracting/villa-construction': 'exterior-after-grey-metal-cladding-panels-102.webp',
  'contracting/low-rise': 'glass-aluminium-after-dark-aluminum-frame-with-clean-109.webp',
  'contracting/mid-rise': 'living-room-after-black-framed-tilt-and-turn-win-089.webp',
  'contracting/structural-works': 'bathroom-after-chrome-framed-glass-shower-enc-096.webp',
  'contracting/civil-works': 'bathroom-after-floating-wooden-vanity-unit-092.webp',
  'interiors': null, // no hero placeholder (0 placeholders)
  'interiors/residential': null, // uses page-hero fade-in class, no bg
  'interiors/commercial': null,
  'interiors/villa-fit-out': null,
  'interiors/furniture-lighting': null,
  'design-approvals': 'kitchen-after-exposed-red-brick-accent-wall-070.webp',
  'design-approvals/architectural-design': 'exterior-after-contemporary-horizontal-panel--107.webp',
  'design-approvals/engineering-drawings': 'glass-aluminium-after-dark-aluminum-frame-with-clean-109.webp',
  'design-approvals/3d-visualisation': 'living-room-after-organic-curved-sofa-and-armcha-141.webp',
  'design-approvals/municipality-approvals': 'exterior-after-grey-metal-cladding-panels-102.webp',
  'design-approvals/building-permits': 'glass-aluminium-after-black-aluminum-frame-090.webp',
  'design-approvals/noc-processing': 'bathroom-after-black-framed-glass-shower-encl-091.webp',
  'portfolio': 'living-room-after-organic-curved-sofa-and-armcha-141.webp',
  'portfolio/renovation': 'kitchen-after-exposed-red-brick-accent-wall-070.webp',
  'portfolio/interiors': 'living-room-after-floor-to-ceiling-sliding-glass-086.webp',
  'portfolio/contracting': 'exterior-after-contemporary-horizontal-panel--107.webp',
  'portfolio/design-approvals': 'glass-aluminium-after-dark-aluminum-frame-with-clean-109.webp',
  'blog': 'living-room-after-black-framed-tilt-and-turn-win-089.webp',
  'contact': 'exterior-after-black-aluminum-pergola-with-ho-106.webp',
  'areas/palm-jumeirah': 'exterior-after-black-aluminum-pergola-with-ho-106.webp',
  'areas/emirates-hills': 'living-room-after-organic-curved-sofa-and-armcha-141.webp',
  'areas/arabian-ranches': 'kitchen-after-exposed-red-brick-accent-wall-070.webp',
  'areas/dubai-hills': 'exterior-after-contemporary-horizontal-panel--107.webp',
  'areas/al-barari': 'glass-aluminium-after-black-aluminum-frame-090.webp',
  'areas/tilal-al-ghaf': 'living-room-after-floor-to-ceiling-sliding-glass-086.webp',
  'get-quote': null, // no placeholders
};

// ═══ Process each page ═══

function processFile(pageDir) {
  const filePath = path.join(SITE, pageDir, 'index.html');
  if (!fs.existsSync(filePath)) return;

  let html = fs.readFileSync(filePath, 'utf8');
  const originalHtml = html;
  const imgBase = relImg(pageDir);
  let changeCount = 0;

  // ── 1. HERO BACKGROUNDS ──
  const heroImg = heroAssignments[pageDir];
  if (heroImg) {
    // Pattern A: page-hero-bg (sub-pages)
    html = html.replace(
      /<div class="page-hero-bg" style="background-color:var\(--bg-secondary\)"><\/div>/g,
      `<div class="page-hero-bg" style="background-image:url('${imgBase}/hero/${heroImg}');background-size:cover;background-position:center;background-color:var(--bg-secondary)"></div>`
    );
    // Pattern B: hero-bg (top-level pages like about, portfolio, areas)
    html = html.replace(
      /<div class="hero-bg" style="background-color:var\(--bg-secondary\)"><\/div>/g,
      `<div class="hero-bg" style="background-image:url('${imgBase}/hero/${heroImg}');background-size:cover;background-position:center;background-color:var(--bg-secondary)"></div>`
    );
  }

  // ── 2. FEATURE IMAGES (two-col) ──
  // Pattern: <div style="width:100%;aspect-ratio:4/3;background:var(--bg-tertiary)"></div>
  const featureImages = getFeatureImage(pageDir);
  if (featureImages) {
    html = html.replace(
      /<div style="width:100%;aspect-ratio:4\/3;background:var\(--bg-tertiary\)"><\/div>/g,
      `<img src="${imgBase}/${featureImages}" alt="${getAltText(pageDir)}" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--radius)" loading="lazy">`
    );
  }

  // ── 3. SERVICE GALLERY ITEMS ──
  // Pattern: <div class="service-gallery-item"><div style="width:100%;height:100%;background:var(--bg-tertiary)"></div></div>
  // and:   <div class="service-gallery-item"><div style="width:100%;height:100%;background:var(--bg-secondary)"></div></div>
  const galleryImages = getGalleryImages(pageDir);
  if (galleryImages && galleryImages.length > 0) {
    let gi = 0;
    // Replace service-gallery-item placeholders
    html = html.replace(
      /<div class="service-gallery-item"><div style="width:100%;height:100%;background:var\(--bg-(?:tertiary|secondary)\)"><\/div><\/div>/g,
      (match) => {
        if (gi < galleryImages.length) {
          const img = galleryImages[gi++];
          const alt = getGalleryAlt(pageDir, gi - 1);
          return `<div class="service-gallery-item" data-lightbox="${imgBase}/${img}"><img data-src="${imgBase}/${img}" alt="${alt}" loading="lazy"></div>`;
        }
        return match;
      }
    );
  }

  // ── 4. GALLERY CARDS (homepage + interiors sub-pages + blog) ──
  const galleryCardImages = getGalleryCardImages(pageDir);
  if (galleryCardImages && galleryCardImages.length > 0) {
    let gi = 0;
    html = html.replace(
      /(<div class="gallery-card">)\s*<div style="width:100%;height:100%;background:var\(--bg-tertiary\)"><\/div>/g,
      (match, prefix) => {
        if (gi < galleryCardImages.length) {
          const img = galleryCardImages[gi++];
          return `${prefix}\n        <img src="${imgBase}/${img}" alt="${getGalleryCardAlt(pageDir, gi - 1)}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`;
        }
        return match;
      }
    );
  }

  // ── 5. COMMUNITY CARDS (homepage) ──
  if (pageDir === '') {
    const communityImages = imgs.community;
    const communityNames = ['Palm Jumeirah', 'Emirates Hills', 'Arabian Ranches', 'Dubai Hills Estate', 'Al Barari', 'Tilal Al Ghaf'];
    let ci = 0;
    html = html.replace(
      /(<a href="\/areas\/[^"]*" class="community-card fade-in">)\s*<div style="width:100%;height:100%;background:var\(--bg-secondary\)"><\/div>/g,
      (match, prefix) => {
        if (ci < communityImages.length) {
          const img = communityImages[ci];
          const alt = communityNames[ci] || 'Dubai community';
          ci++;
          return `${prefix}\n          <img src="${imgBase}/community/${img}" alt="${alt}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`;
        }
        return match;
      }
    );
  }

  // ── 6. TEAM PHOTOS (about page) ──
  if (pageDir === 'about') {
    const teamImages = imgs.team;
    const teamNames = ['Commander Bond', 'Head of Design', 'Hamdan', 'Rajeev'];
    let ti = 0;
    html = html.replace(
      /<div style="width:120px;height:120px;border-radius:50%;background:var\(--bg-tertiary\);margin:0 auto 1\.5rem"><\/div>/g,
      (match) => {
        if (ti < teamImages.length && ti < teamNames.length) {
          const img = teamImages[ti];
          const alt = teamNames[ti];
          ti++;
          return `<img src="${imgBase}/team/${img}" alt="${alt}" style="width:120px;height:120px;border-radius:50%;object-fit:cover;margin:0 auto 1.5rem" loading="lazy">`;
        }
        return match;
      }
    );

    // About story image: <div style="width:100%;height:400px;background:var(--bg-tertiary);border-radius:var(--radius)"></div>
    html = html.replace(
      /<div style="width:100%;height:400px;background:var\(--bg-tertiary\);border-radius:var\(--radius\)"><\/div>/g,
      `<img src="${imgBase}/interiors/full-villa-after-contemporary-cubic-architectur-145.webp" alt="First Unicorn Interiors project" style="width:100%;height:400px;object-fit:cover;border-radius:var(--radius)" loading="lazy">`
    );
  }

  // ── 7. BLOG CARD IMAGES ──
  if (pageDir === 'blog') {
    const blogImages = [
      'interiors/living-room-after-curved-white-sectional-sofa-016.webp',
      'kitchen/kitchen-after-high-gloss-black-kitchen-cabin-017.webp',
      'interiors/living-room-after-custom-golden-tube-pendant-cha-021.webp',
      'bathroom/bathroom-after-freestanding-white-bathtub-wit-177.webp',
      'construction/exterior-after-floor-to-ceiling-glass-walls-208.jpg',
      'interiors/living-room-after-neutral-color-palette-121.webp'
    ];
    let bi = 0;
    // Blog card images are inside blog-card divs
    html = html.replace(
      /(<div class="blog-card[^"]*"[^>]*>)\s*<div[^>]*class="blog-card-img"[^>]*>\s*<div style="width:100%;height:100%;background:var\(--bg-tertiary\)"><\/div>/g,
      (match, prefix) => {
        if (bi < blogImages.length) {
          const img = blogImages[bi++];
          return `${prefix}\n            <div class="blog-card-img">\n              <img src="${imgBase}/${img}" alt="Blog article" loading="lazy" style="width:100%;height:100%;object-fit:cover">`;
        }
        return match;
      }
    );
    // If blog uses gallery-card pattern instead:
    if (bi === 0) {
      bi = 0;
      html = html.replace(
        /(<div class="gallery-card">)\s*<div style="width:100%;height:100%;background:var\(--bg-tertiary\)"><\/div>/g,
        (match, prefix) => {
          if (bi < blogImages.length) {
            const img = blogImages[bi++];
            return `${prefix}\n        <img src="${imgBase}/${img}" alt="Blog article" loading="lazy" style="width:100%;height:100%;object-fit:cover">`;
          }
          return match;
        }
      );
    }
  }

  // ── 8. PORTFOLIO GRID ITEMS ──
  if (pageDir.startsWith('portfolio')) {
    const portfolioImages = getPortfolioImages(pageDir);
    if (portfolioImages && portfolioImages.length > 0) {
      let pi = 0;
      // Portfolio items use various patterns but typically gallery-card or portfolio-card
      html = html.replace(
        /(<div class="(?:portfolio-item|gallery-card)"[^>]*>)\s*<div style="width:100%;height:100%;background:var\(--bg-tertiary\)"><\/div>/g,
        (match, prefix) => {
          if (pi < portfolioImages.length) {
            const img = portfolioImages[pi++];
            return `${prefix}\n          <img src="${imgBase}/${img}" alt="Portfolio project" loading="lazy" style="width:100%;height:100%;object-fit:cover">`;
          }
          return match;
        }
      );
    }
  }

  // ── 9. DESIGN APPROVALS sub-page feature images ──
  if (pageDir.startsWith('design-approvals/') && pageDir !== 'design-approvals') {
    html = html.replace(
      /<div style="width:100%;aspect-ratio:4\/3;background:var\(--bg-tertiary\)"><\/div>/g,
      `<img src="${imgBase}/approvals/${imgs.approvals[0]}" alt="Design approvals, Dubai" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--radius)" loading="lazy">`
    );
  }

  // ── 10. CATCH-ALL: Any remaining gallery-card placeholders ──
  // For pages that haven't been handled above
  const remainingImages = getRemainingImages(pageDir);
  if (remainingImages && remainingImages.length > 0) {
    let ri = 0;
    // Generic gallery-card with tertiary bg
    html = html.replace(
      /(<div class="gallery-card"[^>]*>)\s*<div style="width:100%;height:100%;background:var\(--bg-tertiary\)"><\/div>/g,
      (match, prefix) => {
        if (ri < remainingImages.length) {
          const img = remainingImages[ri++];
          return `${prefix}\n          <img src="${imgBase}/${img}" alt="Project showcase" loading="lazy" style="width:100%;height:100%;object-fit:cover">`;
        }
        return match;
      }
    );
  }

  if (html !== originalHtml) {
    fs.writeFileSync(filePath, html);
    const before = (originalHtml.match(/background:var\(--bg-(?:tertiary|secondary)\)/g) || []).length;
    const after = (html.match(/background:var\(--bg-(?:tertiary|secondary)\)/g) || []).length;
    console.log(`${pageDir || '/'}: ${before - after} placeholders replaced (${after} remaining)`);
    changeCount = before - after;
  } else {
    console.log(`${pageDir || '/'}: no changes needed`);
  }
  return changeCount;
}

function getFeatureImage(pageDir) {
  const map = {
    'renovation/kitchen': 'kitchen/' + imgs.kitchen[0],
    'renovation/bathroom': 'bathroom/' + imgs.bathroom[0],
    'renovation/pool': 'pool/' + imgs.pool[0],
    'renovation/glass-aluminium': 'glass/' + imgs.glass[0],
    'renovation/joinery': 'joinery/' + imgs.joinery[0],
    'renovation/flooring': 'joinery/' + imgs.joinery[2], // wood-look flooring
    'renovation/full-villa': 'interiors/' + imgs.interiors[8], // full-villa image
    'contracting/villa-construction': 'construction/' + imgs.construction[6],
    'contracting/low-rise': 'construction/' + imgs.construction[5],
    'contracting/mid-rise': 'construction/' + imgs.construction[20],
    'contracting/structural-works': 'construction/' + imgs.construction[4],
    'contracting/civil-works': 'construction/' + imgs.construction[0],
  };
  return map[pageDir] || null;
}

function getAltText(pageDir) {
  const map = {
    'renovation/kitchen': 'Kitchen renovation, Dubai',
    'renovation/bathroom': 'Bathroom renovation, Dubai',
    'renovation/pool': 'Swimming pool construction, Dubai',
    'renovation/glass-aluminium': 'Glass and aluminium works, Dubai',
    'renovation/joinery': 'Custom joinery, Dubai',
    'renovation/flooring': 'Premium flooring, Dubai',
    'renovation/full-villa': 'Full villa renovation, Dubai',
    'contracting/villa-construction': 'Villa construction, Dubai',
    'contracting/low-rise': 'Low-rise construction, Dubai',
    'contracting/mid-rise': 'Mid-rise construction, Dubai',
    'contracting/structural-works': 'Structural works, Dubai',
    'contracting/civil-works': 'Civil works, Dubai',
  };
  return map[pageDir] || 'Interior design project, Dubai';
}

function getGalleryImages(pageDir) {
  // Service gallery items (6 per page)
  const map = {
    'renovation/kitchen': imgs.kitchen.slice(1, 7).map(f => 'kitchen/' + f),
    'renovation/bathroom': imgs.bathroom.slice(1, 7).map(f => 'bathroom/' + f),
    'renovation/pool': imgs.pool.slice(1, 7).map(f => 'pool/' + f),
    'renovation/glass-aluminium': imgs.glass.slice(1, 7).map(f => 'glass/' + f),
    'renovation/joinery': imgs.joinery.slice(1, 7).map(f => 'joinery/' + f),
    'renovation/flooring': [
      'joinery/' + imgs.joinery[2],
      'joinery/' + imgs.joinery[3],
      'interiors/' + imgs.interiors[0],
      'interiors/' + imgs.interiors[4],
      'interiors/' + imgs.interiors[6],
      'construction/' + imgs.construction[1],
    ],
    'renovation/full-villa': [
      'interiors/' + imgs.interiors[0],
      'interiors/' + imgs.interiors[1],
      'interiors/' + imgs.interiors[4],
      'kitchen/' + imgs.kitchen[0],
      'bathroom/' + imgs.bathroom[0],
      'pool/' + imgs.pool[0],
    ],
    'contracting/villa-construction': imgs.construction.slice(0, 6).map(f => 'construction/' + f),
    'contracting/low-rise': imgs.construction.slice(6, 12).map(f => 'construction/' + f),
    'contracting/mid-rise': imgs.construction.slice(12, 18).map(f => 'construction/' + f),
    'contracting/structural-works': imgs.construction.slice(18, 24).map(f => 'construction/' + f),
    'contracting/civil-works': imgs.construction.slice(24, 30).map(f => 'construction/' + f),
  };
  return map[pageDir] || null;
}

function getGalleryAlt(pageDir, index) {
  const map = {
    'renovation/kitchen': 'Kitchen renovation project, Dubai',
    'renovation/bathroom': 'Bathroom renovation project, Dubai',
    'renovation/pool': 'Swimming pool project, Dubai',
    'renovation/glass-aluminium': 'Glass and aluminium project, Dubai',
    'renovation/joinery': 'Custom joinery project, Dubai',
    'renovation/flooring': 'Premium flooring project, Dubai',
    'renovation/full-villa': 'Full villa renovation, Dubai',
    'contracting/villa-construction': 'Villa construction, Dubai',
    'contracting/low-rise': 'Low-rise construction, Dubai',
    'contracting/mid-rise': 'Mid-rise construction, Dubai',
    'contracting/structural-works': 'Structural works, Dubai',
    'contracting/civil-works': 'Civil works, Dubai',
  };
  return map[pageDir] || 'Project, Dubai';
}

function getGalleryCardImages(pageDir) {
  // Gallery-card type images (homepage, interiors sub-pages)
  if (pageDir === '') {
    // Homepage gallery cards (6 featured projects)
    return [
      'kitchen/' + imgs.kitchen[0],
      'interiors/' + imgs.interiors[8], // full-villa
      'construction/' + imgs.construction[6],
      'bathroom/' + imgs.bathroom[0],
      'pool/' + imgs.pool[0],
      'glass/' + imgs.glass[0],
    ];
  }
  if (pageDir === 'interiors/residential') {
    return [
      'interiors/' + imgs.interiors[0],
      'interiors/' + imgs.interiors[4],
      'interiors/' + imgs.interiors[6],
      'interiors/' + imgs.interiors[9],
    ];
  }
  if (pageDir === 'interiors/commercial') {
    return [
      'interiors/' + imgs.interiors[1],
      'interiors/' + imgs.interiors[5],
      'interiors/' + imgs.interiors[10],
      'interiors/' + imgs.interiors[12],
    ];
  }
  if (pageDir === 'interiors/villa-fit-out') {
    return [
      'interiors/' + imgs.interiors[2],
      'interiors/' + imgs.interiors[7],
      'interiors/' + imgs.interiors[8],
      'interiors/' + imgs.interiors[11],
    ];
  }
  if (pageDir === 'interiors/furniture-lighting') {
    return [
      'interiors/' + imgs.interiors[3],
      'interiors/' + imgs.interiors[13],
      'interiors/' + imgs.interiors[14],
      'interiors/' + imgs.interiors[15],
    ];
  }
  return null;
}

function getGalleryCardAlt(pageDir, index) {
  if (pageDir === '') {
    const alts = ['Kitchen renovation', 'Full villa transformation', 'Villa construction', 'Bathroom renovation', 'Swimming pool', 'Glass and aluminium'];
    return (alts[index] || 'Project') + ', Dubai';
  }
  return 'Interior design project, Dubai';
}

function getPortfolioImages(pageDir) {
  if (pageDir === 'portfolio') {
    return [
      'kitchen/' + imgs.kitchen[0],
      'bathroom/' + imgs.bathroom[0],
      'pool/' + imgs.pool[0],
      'glass/' + imgs.glass[0],
      'joinery/' + imgs.joinery[0],
      'interiors/' + imgs.interiors[0],
      'construction/' + imgs.construction[0],
      'construction/' + imgs.construction[6],
      'interiors/' + imgs.interiors[4],
      'approvals/' + imgs.approvals[0],
      'interiors/' + imgs.interiors[8],
      'construction/' + imgs.construction[20],
    ];
  }
  if (pageDir === 'portfolio/renovation') {
    return [
      'kitchen/' + imgs.kitchen[0],
      'bathroom/' + imgs.bathroom[0],
      'pool/' + imgs.pool[0],
      'glass/' + imgs.glass[0],
      'joinery/' + imgs.joinery[0],
      'interiors/' + imgs.interiors[8],
    ];
  }
  if (pageDir === 'portfolio/interiors') {
    return [
      'interiors/' + imgs.interiors[0],
      'interiors/' + imgs.interiors[4],
      'interiors/' + imgs.interiors[7],
      'interiors/' + imgs.interiors[8],
      'interiors/' + imgs.interiors[10],
      'interiors/' + imgs.interiors[12],
    ];
  }
  if (pageDir === 'portfolio/contracting') {
    return [
      'construction/' + imgs.construction[0],
      'construction/' + imgs.construction[5],
      'construction/' + imgs.construction[6],
      'construction/' + imgs.construction[15],
      'construction/' + imgs.construction[20],
      'construction/' + imgs.construction[22],
    ];
  }
  if (pageDir === 'portfolio/design-approvals') {
    return [
      'approvals/' + imgs.approvals[0],
      'approvals/' + imgs.approvals[1],
      'approvals/' + imgs.approvals[2],
      'approvals/' + imgs.approvals[3],
      'approvals/' + imgs.approvals[4],
      'approvals/' + imgs.approvals[5],
    ];
  }
  return null;
}

function getRemainingImages(pageDir) {
  // Catch-all for pages not handled above
  if (pageDir === 'blog') {
    return [
      'interiors/' + imgs.interiors[0],
      'kitchen/' + imgs.kitchen[0],
      'interiors/' + imgs.interiors[4],
      'bathroom/' + imgs.bathroom[0],
      'construction/' + imgs.construction[6],
      'interiors/' + imgs.interiors[6],
    ];
  }
  return null;
}

// ═══ RUN ═══
const allPages = [
  '', // index.html (root)
  'about',
  'blog',
  'contact',
  'get-quote',
  'renovation',
  'renovation/kitchen',
  'renovation/bathroom',
  'renovation/pool',
  'renovation/glass-aluminium',
  'renovation/joinery',
  'renovation/flooring',
  'renovation/full-villa',
  'contracting',
  'contracting/villa-construction',
  'contracting/low-rise',
  'contracting/mid-rise',
  'contracting/structural-works',
  'contracting/civil-works',
  'interiors',
  'interiors/residential',
  'interiors/commercial',
  'interiors/villa-fit-out',
  'interiors/furniture-lighting',
  'design-approvals',
  'design-approvals/architectural-design',
  'design-approvals/engineering-drawings',
  'design-approvals/3d-visualisation',
  'design-approvals/municipality-approvals',
  'design-approvals/building-permits',
  'design-approvals/noc-processing',
  'portfolio',
  'portfolio/renovation',
  'portfolio/interiors',
  'portfolio/contracting',
  'portfolio/design-approvals',
  'areas/palm-jumeirah',
  'areas/emirates-hills',
  'areas/arabian-ranches',
  'areas/dubai-hills',
  'areas/al-barari',
  'areas/tilal-al-ghaf',
];

let totalReplaced = 0;
for (const p of allPages) {
  totalReplaced += processFile(p) || 0;
}
console.log(`\nDone. Total placeholders replaced: ${totalReplaced}`);
