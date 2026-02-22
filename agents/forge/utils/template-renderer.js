import puppeteer from 'puppeteer';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { BRAND } from '../config.js';

const { colors, fonts } = BRAND;

/**
 * Convert a local file to a base64 data URL for embedding in HTML.
 */
export async function fileToBase64(filePath) {
  const buffer = await readFile(filePath);
  const ext = filePath.toLowerCase().split('.').pop();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/**
 * Render HTML to a PNG image using Puppeteer.
 */
export async function renderTemplate(html, outputPath, width, height) {
  await mkdir(dirname(outputPath), { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.screenshot({ path: outputPath, type: 'png', fullPage: false });
    return outputPath;
  } finally {
    await browser.close();
  }
}

// ─── INSTAGRAM CAROUSEL SLIDE (1080x1080) ─────────────────
export function carouselSlideHTML(photoBase64, headline, subtext, slideNum, totalSlides) {
  return `<!DOCTYPE html>
<html><head>
<style>
  ${fonts.googleImport}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; overflow: hidden; font-family: '${fonts.body}', sans-serif; }
  .container { position: relative; width: 100%; height: 100%; }
  .photo { width: 100%; height: 100%; object-fit: cover; }
  .overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 50px 40px 40px; background: linear-gradient(transparent, ${colors.overlay} 40%); }
  .headline { font-family: '${fonts.heading}', serif; font-size: 42px; font-weight: 700; color: ${colors.text}; line-height: 1.2; margin-bottom: 12px; text-shadow: 0 2px 8px rgba(0,0,0,0.3); }
  .subtext { font-size: 20px; font-weight: 300; color: ${colors.accent}; line-height: 1.4; }
  .brand-bar { position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, ${colors.secondary}, ${colors.accent}); }
  .logo { position: absolute; top: 24px; right: 24px; background: ${colors.overlay}; padding: 10px 18px; border-radius: 4px; }
  .logo-text { font-family: '${fonts.heading}', serif; font-size: 18px; font-weight: 600; color: ${colors.secondary}; letter-spacing: 1px; }
  .slide-num { position: absolute; top: 24px; left: 24px; font-size: 14px; color: rgba(255,255,255,0.6); background: rgba(0,0,0,0.3); padding: 6px 12px; border-radius: 20px; }
</style>
</head><body>
  <div class="container">
    <img class="photo" src="${photoBase64}" />
    <div class="brand-bar"></div>
    <div class="logo"><span class="logo-text">UNICORN</span></div>
    <div class="slide-num">${slideNum} / ${totalSlides}</div>
    <div class="overlay">
      <div class="headline">${headline}</div>
      <div class="subtext">${subtext}</div>
    </div>
  </div>
</body></html>`;
}

// ─── CTA SLIDE (no photo — navy + gold) ───────────────────
export function ctaSlideHTML(totalSlides) {
  return `<!DOCTYPE html>
<html><head>
<style>
  ${fonts.googleImport}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; overflow: hidden; font-family: '${fonts.body}', sans-serif; background: ${colors.primary}; }
  .container { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; padding: 80px; text-align: center; }
  .headline { font-family: '${fonts.heading}', serif; font-size: 48px; font-weight: 700; color: ${colors.secondary}; line-height: 1.3; margin-bottom: 32px; }
  .subtext { font-size: 22px; color: ${colors.accent}; line-height: 1.6; margin-bottom: 48px; max-width: 700px; }
  .cta-btn { display: inline-block; background: ${colors.secondary}; color: ${colors.primary}; font-size: 22px; font-weight: 600; padding: 20px 48px; border-radius: 6px; letter-spacing: 1px; text-transform: uppercase; }
  .phone { font-size: 20px; color: rgba(255,255,255,0.5); margin-top: 32px; }
  .brand-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, ${colors.secondary}, ${colors.accent}); }
  .trust { display: flex; gap: 24px; margin-top: 40px; flex-wrap: wrap; justify-content: center; }
  .trust-item { font-size: 15px; color: rgba(255,255,255,0.4); }
  .slide-num { position: absolute; top: 24px; left: 24px; font-size: 14px; color: rgba(255,255,255,0.3); }
</style>
</head><body>
  <div class="container">
    <div class="slide-num">${totalSlides} / ${totalSlides}</div>
    <div class="headline">Ready to Transform<br/>Your Villa?</div>
    <div class="subtext">Free consultation. 48-hour quote.<br/>Fixed pricing. No hidden costs.</div>
    <div class="cta-btn">WhatsApp Us Now →</div>
    <div class="phone">${BRAND.phone}</div>
    <div class="trust">
      ${BRAND.trustSignals.map(s => `<span class="trust-item">${s}</span>`).join('')}
    </div>
    <div class="brand-bar"></div>
  </div>
</body></html>`;
}

// ─── INSTAGRAM STORY FRAME (1080x1920) ────────────────────
export function storyFrameHTML(photoBase64, headline, ctaText) {
  return `<!DOCTYPE html>
<html><head>
<style>
  ${fonts.googleImport}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1920px; overflow: hidden; font-family: '${fonts.body}', sans-serif; }
  .container { position: relative; width: 100%; height: 100%; }
  .photo { width: 100%; height: 100%; object-fit: cover; }
  .header { position: absolute; top: 0; left: 0; right: 0; padding: 60px 40px 30px; background: linear-gradient(${colors.overlay}, transparent); display: flex; justify-content: space-between; align-items: center; }
  .logo-text { font-family: '${fonts.heading}', serif; font-size: 24px; font-weight: 600; color: ${colors.secondary}; letter-spacing: 2px; }
  .tag { font-size: 14px; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 2px; }
  .bottom { position: absolute; bottom: 0; left: 0; right: 0; padding: 60px 40px 80px; background: linear-gradient(transparent, ${colors.primary} 50%); }
  .headline { font-family: '${fonts.heading}', serif; font-size: 44px; font-weight: 700; color: ${colors.text}; line-height: 1.2; margin-bottom: 24px; }
  .cta-btn { display: inline-block; background: ${colors.secondary}; color: ${colors.primary}; font-size: 20px; font-weight: 600; padding: 18px 40px; border-radius: 6px; letter-spacing: 1px; }
  .swipe { text-align: center; margin-top: 20px; font-size: 16px; color: rgba(255,255,255,0.4); }
</style>
</head><body>
  <div class="container">
    <img class="photo" src="${photoBase64}" />
    <div class="header">
      <span class="logo-text">UNICORN</span>
      <span class="tag">Villa Renovations</span>
    </div>
    <div class="bottom">
      <div class="headline">${headline}</div>
      <div class="cta-btn">${ctaText || 'Get Free Consultation →'}</div>
      <div class="swipe">Swipe up or tap the link ↑</div>
    </div>
  </div>
</body></html>`;
}

// ─── META AD CREATIVE (1200x628) ──────────────────────────
export function adCreativeHTML(photoBase64, headline, bodyText) {
  return `<!DOCTYPE html>
<html><head>
<style>
  ${fonts.googleImport}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1200px; height: 628px; overflow: hidden; font-family: '${fonts.body}', sans-serif; }
  .container { display: flex; width: 100%; height: 100%; }
  .photo-side { width: 55%; height: 100%; overflow: hidden; position: relative; }
  .photo-side img { width: 100%; height: 100%; object-fit: cover; }
  .content-side { width: 45%; height: 100%; background: ${colors.primary}; display: flex; flex-direction: column; justify-content: center; padding: 40px 36px; }
  .logo-text { font-family: '${fonts.heading}', serif; font-size: 16px; font-weight: 600; color: ${colors.secondary}; letter-spacing: 2px; margin-bottom: 24px; }
  .headline { font-family: '${fonts.heading}', serif; font-size: 32px; font-weight: 700; color: ${colors.text}; line-height: 1.2; margin-bottom: 16px; }
  .body-text { font-size: 16px; color: ${colors.accent}; line-height: 1.5; margin-bottom: 28px; }
  .cta-btn { display: inline-block; background: ${colors.secondary}; color: ${colors.primary}; font-size: 16px; font-weight: 600; padding: 14px 28px; border-radius: 4px; letter-spacing: 1px; align-self: flex-start; }
  .trust-row { display: flex; gap: 16px; margin-top: 20px; flex-wrap: wrap; }
  .trust-item { font-size: 11px; color: rgba(255,255,255,0.35); }
  .gold-line { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${colors.secondary}; }
</style>
</head><body>
  <div class="container">
    <div class="photo-side">
      <img src="${photoBase64}" />
    </div>
    <div class="content-side">
      <div class="gold-line"></div>
      <div class="logo-text">UNICORN RENOVATIONS</div>
      <div class="headline">${headline}</div>
      <div class="body-text">${bodyText}</div>
      <div class="cta-btn">Get Free Quote →</div>
      <div class="trust-row">
        ${BRAND.trustSignals.slice(0, 3).map(s => `<span class="trust-item">${s}</span>`).join('')}
      </div>
    </div>
  </div>
</body></html>`;
}

// ─── QUOTE CARD (1080x1080) ───────────────────────────────
export function quoteCardHTML(quote, clientName, location, stars) {
  const starStr = '★'.repeat(stars || 5);
  return `<!DOCTYPE html>
<html><head>
<style>
  ${fonts.googleImport}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; overflow: hidden; font-family: '${fonts.body}', sans-serif; background: ${colors.primary}; }
  .container { display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; height: 100%; padding: 80px; text-align: center; }
  .brand-bar { position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, ${colors.secondary}, ${colors.accent}); }
  .stars { font-size: 36px; color: ${colors.secondary}; margin-bottom: 32px; letter-spacing: 8px; }
  .quote-mark { font-family: '${fonts.heading}', serif; font-size: 120px; color: ${colors.secondary}; opacity: 0.3; line-height: 0.8; margin-bottom: 16px; }
  .quote { font-family: '${fonts.heading}', serif; font-size: 32px; font-weight: 400; color: ${colors.text}; line-height: 1.5; font-style: italic; margin-bottom: 40px; max-width: 800px; }
  .client-name { font-size: 20px; font-weight: 600; color: ${colors.secondary}; margin-bottom: 8px; }
  .location { font-size: 16px; color: rgba(255,255,255,0.4); }
  .logo-text { position: absolute; bottom: 40px; font-family: '${fonts.heading}', serif; font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.15); letter-spacing: 4px; }
</style>
</head><body>
  <div class="container">
    <div class="brand-bar"></div>
    <div class="stars">${starStr}</div>
    <div class="quote-mark">"</div>
    <div class="quote">${quote}</div>
    <div class="client-name">${clientName}</div>
    <div class="location">${location}</div>
    <span class="logo-text">UNICORN RENOVATIONS</span>
  </div>
</body></html>`;
}

/**
 * Test that Puppeteer can launch headless Chromium.
 */
export async function testPuppeteer() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const version = await browser.version();
  await browser.close();
  return version;
}
