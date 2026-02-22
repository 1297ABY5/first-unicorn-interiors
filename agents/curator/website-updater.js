import { readFile, writeFile, copyFile, mkdir, access, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import sharp from 'sharp';
import { CONFIG } from './config.js';
import { loadManifest } from './categoriser.js';
import { appendLog } from './logger.js';

// ─── RESIZE IMAGE FOR WEB ────────────────────────────────

async function resizeForWeb(srcPath, destPath) {
  await mkdir(join(destPath, '..'), { recursive: true });
  await sharp(srcPath)
    .resize({ width: 1920, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(destPath);
}

// ─── PORTFOLIO ITEM HTML ─────────────────────────────────

function portfolioGridItemHTML(photo) {
  const roomLabel = photo.roomType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const communityLabel = photo.community !== 'unknown'
    ? photo.community.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Dubai';
  const whatsappText = encodeURIComponent(`I saw your ${photo.roomType} project and would like a quote`);

  return `
        <div class="portfolio-grid-item" data-cat="${photo.roomType}" data-community="${photo.community}">
          <div class="portfolio-grid-img">
            <img src="/images/${photo.roomType}/${photo.newFilename}" alt="${photo.description || ''}" loading="lazy">
          </div>
          <div class="portfolio-grid-info">
            <div class="portfolio-type">${roomLabel} Renovation</div>
            <h3>${roomLabel} — ${communityLabel}</h3>
            <p>${photo.suggestedCaption || photo.description || ''}</p>
            <a href="https://wa.me/971526455121?text=${whatsappText}" class="cta-btn">Get a Free Quote</a>
          </div>
        </div>`;
}

// ─── HOMEPAGE CARD HTML ──────────────────────────────────

function homepageCardHTML(photo, index) {
  const roomLabel = photo.roomType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const communityLabel = photo.community !== 'unknown'
    ? photo.community.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Dubai';
  const num = String(index).padStart(2, '0');

  return `
          <div class="portfolio-card">
            <div class="portfolio-img">
              <div class="portfolio-num">/${num}</div>
              <img src="/images/${photo.roomType}/${photo.newFilename}" alt="${photo.description || ''}" loading="lazy">
            </div>
            <div class="portfolio-body">
              <div class="portfolio-type">${roomLabel} Renovation</div>
              <div class="portfolio-name">${roomLabel} — ${communityLabel}</div>
              <p class="portfolio-desc">${photo.suggestedCaption || photo.description || ''}</p>
              <a href="/portfolio/" class="portfolio-link">View Details →</a>
            </div>
          </div>`;
}

// ─── GALLERY SECTION HTML (for service/area pages) ───────

function gallerySectionHTML(photos) {
  const items = photos.map(photo => {
    const roomLabel = photo.roomType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `
      <div class="portfolio-item" data-category="${photo.roomType}" data-community="${photo.community}">
        <div class="portfolio-image">
          <img src="/images/${photo.roomType}/${photo.newFilename}" alt="${photo.description || ''}" loading="lazy">
        </div>
        <div class="portfolio-caption">
          <p>${photo.suggestedCaption || photo.description || ''}</p>
        </div>
      </div>`;
  }).join('\n');

  return `
    <!-- Curator Gallery — auto-generated -->
    <section class="curator-gallery" style="padding:60px 20px;background:#0c0c0c;">
      <div style="max-width:1200px;margin:0 auto;">
        <h2 style="color:#c8a55e;text-align:center;margin-bottom:40px;font-family:'Playfair Display',serif;">Our Recent Work</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;">
          ${items}
        </div>
      </div>
    </section>
    <!-- End Curator Gallery -->`;
}

// ─── INSERT INTO HTML FILE ───────────────────────────────

async function insertIntoPage(htmlPath, insertionHTML, insertAfterPattern) {
  let html;
  try {
    html = await readFile(htmlPath, 'utf-8');
  } catch {
    console.log(`  [web] Page not found: ${htmlPath}`);
    return false;
  }

  // Check for existing curator content to avoid duplicates
  if (html.includes(insertionHTML.trim().slice(0, 80))) {
    return false; // Already inserted
  }

  const idx = html.indexOf(insertAfterPattern);
  if (idx !== -1) {
    const insertAt = idx + insertAfterPattern.length;
    html = html.slice(0, insertAt) + insertionHTML + html.slice(insertAt);
    await writeFile(htmlPath, html, 'utf-8');
    return true;
  }

  return false;
}

// ─── ADD GALLERY SECTION TO PAGE ─────────────────────────

async function addGalleryToPage(htmlPath, galleryHTML) {
  let html;
  try {
    html = await readFile(htmlPath, 'utf-8');
  } catch {
    console.log(`  [web] Page not found: ${htmlPath}`);
    return false;
  }

  // Don't add if already has curator gallery
  if (html.includes('curator-gallery')) return false;

  // Insert before closing </main> or before footer or before </body>
  const markers = ['</main>', '<footer', '</body>'];
  for (const marker of markers) {
    const idx = html.indexOf(marker);
    if (idx !== -1) {
      html = html.slice(0, idx) + galleryHTML + '\n' + html.slice(idx);
      await writeFile(htmlPath, html, 'utf-8');
      return true;
    }
  }

  return false;
}

// ─── UPDATE WEBSITE ──────────────────────────────────────

export async function updateWebsite() {
  const manifest = await loadManifest();
  if (manifest.photos.length === 0) {
    console.log('[curator] No photos in manifest to deploy');
    return { updated: 0, images: 0 };
  }

  // Check website repo exists
  try {
    await access(CONFIG.paths.websiteRepo);
  } catch {
    console.error(`[curator] Website repo not found: ${CONFIG.paths.websiteRepo}`);
    return { updated: 0, images: 0 };
  }

  // Filter to after-stage and high-quality photos for website
  const websitePhotos = manifest.photos.filter(p =>
    p.quality >= 5 && p.roomType !== 'other' && p.stage !== 'not-applicable'
  );

  if (websitePhotos.length === 0) {
    console.log('[curator] No suitable photos for website');
    return { updated: 0, images: 0 };
  }

  let imagesCopied = 0;
  let pagesUpdated = 0;

  // 1. Copy resized images to website repo
  const imagesDir = join(CONFIG.paths.websiteRepo, 'images');
  for (const photo of websitePhotos) {
    const srcPath = join(CONFIG.paths.curated, photo.destinations[0]);
    const destDir = join(imagesDir, photo.roomType);
    const destPath = join(destDir, photo.newFilename.replace(/\.\w+$/, '.jpg'));

    try {
      await resizeForWeb(srcPath, destPath);
      photo._webFilename = photo.newFilename.replace(/\.\w+$/, '.jpg');
      imagesCopied++;
      console.log(`  [web] Copied: images/${photo.roomType}/${photo._webFilename}`);
    } catch (err) {
      console.error(`  [web] Resize failed: ${photo.newFilename} — ${err.message}`);
    }
  }

  // 2. Update portfolio page
  const portfolioPath = join(CONFIG.paths.websiteRepo, 'portfolio/index.html');
  const afterPhotos = websitePhotos.filter(p => p.stage === 'after' && p.quality >= 7);
  for (const photo of afterPhotos) {
    const itemHTML = portfolioGridItemHTML(photo);
    const inserted = await insertIntoPage(portfolioPath, itemHTML, '<div class="portfolio-grid reveal">');
    if (inserted) {
      pagesUpdated++;
      console.log(`  [web] Updated portfolio: ${photo.newFilename}`);
    }
  }

  // 3. Update homepage carousel (hero shots only)
  const homepagePath = join(CONFIG.paths.websiteRepo, 'index.html');
  const heroPhotos = websitePhotos.filter(p => p.quality >= CONFIG.heroThreshold);
  let cardIndex = 10; // Start after existing items
  for (const photo of heroPhotos) {
    const cardHTML = homepageCardHTML(photo, cardIndex++);
    const inserted = await insertIntoPage(homepagePath, cardHTML, '<div class="portfolio-track" id="portfolioTrack">');
    if (inserted) {
      pagesUpdated++;
      console.log(`  [web] Updated homepage: ${photo.newFilename}`);
    }
  }

  // 4. Update service pages (add gallery section if not present)
  const byRoom = {};
  for (const photo of websitePhotos) {
    if (!byRoom[photo.roomType]) byRoom[photo.roomType] = [];
    byRoom[photo.roomType].push(photo);
  }

  for (const [room, photos] of Object.entries(byRoom)) {
    const pagePath = CONFIG.websitePages[room];
    if (!pagePath) continue;

    const fullPath = join(CONFIG.paths.websiteRepo, pagePath);
    const galleryHTML = gallerySectionHTML(photos);
    const added = await addGalleryToPage(fullPath, galleryHTML);
    if (added) {
      pagesUpdated++;
      console.log(`  [web] Added gallery to: ${pagePath}`);
    }
  }

  // 5. Update area pages
  const byCommunity = {};
  for (const photo of websitePhotos) {
    if (photo.community && photo.community !== 'unknown') {
      if (!byCommunity[photo.community]) byCommunity[photo.community] = [];
      byCommunity[photo.community].push(photo);
    }
  }

  for (const [community, photos] of Object.entries(byCommunity)) {
    const pagePath = CONFIG.websitePages[community];
    if (!pagePath) continue;

    const fullPath = join(CONFIG.paths.websiteRepo, pagePath);
    const galleryHTML = gallerySectionHTML(photos);
    const added = await addGalleryToPage(fullPath, galleryHTML);
    if (added) {
      pagesUpdated++;
      console.log(`  [web] Added gallery to: ${pagePath}`);
    }
  }

  await appendLog(`WEBSITE_UPDATE images=${imagesCopied} pages=${pagesUpdated}`);
  console.log(`\n[curator] Website updated: ${imagesCopied} images, ${pagesUpdated} pages`);
  return { updated: pagesUpdated, images: imagesCopied };
}
