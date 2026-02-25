#!/usr/bin/env node
/**
 * Google Ads Image Extensions Deployer - First Unicorn Interiors
 * Downloads images, converts WebP→JPG, uploads as image assets,
 * and links them to all 26 ad groups on campaign 23590913919.
 *
 * - Deduplicates: same URL uploaded once, linked to multiple ad groups
 * - Resizes landscape images to fit Google's 1200x628 (1.91:1) ratio
 * - Creates both landscape (1.91:1) and square (1:1) versions
 * - Primary + backup images = up to 5 per ad group
 *
 * Usage: node deploy-image-extensions.cjs
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  DEVELOPER_TOKEN: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  CUSTOMER_ID: process.env.GOOGLE_ADS_CUSTOMER_ID || '1600550384',
  CLIENT_ID: process.env.GOOGLE_ADS_CLIENT_ID,
  CLIENT_SECRET: process.env.GOOGLE_ADS_CLIENT_SECRET,
  REFRESH_TOKEN: process.env.GOOGLE_ADS_REFRESH_TOKEN,
  CAMPAIGN_ID: '23590913919',
};

let ACCESS_TOKEN = null;
const TEMP_DIR = '/tmp/gads-images';

// Cache: url -> { landscapeAssetResource, squareAssetResource }
const assetCache = {};

// ============================================================
// HTTP HELPERS
// ============================================================

function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) {
            console.error(`  API Error [${res.statusCode}]:`, JSON.stringify(json, null, 2).substring(0, 500));
            reject({ statusCode: res.statusCode, body: json });
          } else {
            resolve(json);
          }
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const doRequest = (reqUrl, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      client.get(reqUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return doRequest(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${reqUrl}`));
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    doRequest(url);
  });
}

// ============================================================
// AUTH
// ============================================================

async function getAccessToken() {
  console.log('  Getting access token...');
  const postData = [
    `grant_type=refresh_token`,
    `client_id=${CONFIG.CLIENT_ID}`,
    `client_secret=${CONFIG.CLIENT_SECRET}`,
    `refresh_token=${CONFIG.REFRESH_TOKEN}`,
  ].join('&');

  const result = await httpsRequest({
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
    },
  }, postData);

  ACCESS_TOKEN = result.access_token;
  console.log('  Access token obtained\n');
}

// ============================================================
// GOOGLE ADS API
// ============================================================

function googleAdsHeaders() {
  return {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'developer-token': CONFIG.DEVELOPER_TOKEN,
    'Content-Type': 'application/json',
  };
}

async function googleAdsMutate(operations) {
  const postData = JSON.stringify(operations);
  return httpsRequest({
    hostname: 'googleads.googleapis.com',
    path: `/v20/customers/${CONFIG.CUSTOMER_ID}/googleAds:mutate`,
    method: 'POST',
    headers: { ...googleAdsHeaders(), 'Content-Length': Buffer.byteLength(postData) },
  }, postData);
}

async function googleAdsSearch(query) {
  const postData = JSON.stringify({ query });
  return httpsRequest({
    hostname: 'googleads.googleapis.com',
    path: `/v20/customers/${CONFIG.CUSTOMER_ID}/googleAds:searchStream`,
    method: 'POST',
    headers: { ...googleAdsHeaders(), 'Content-Length': Buffer.byteLength(postData) },
  }, postData);
}

// ============================================================
// IMAGE PROCESSING
// ============================================================

async function processImage(imageBuffer) {
  const metadata = await sharp(imageBuffer).metadata();
  const { width, height, format } = metadata;

  // Landscape version: 1200x628 (1.91:1 ratio) — Google's preferred
  const landscapeBuf = await sharp(imageBuffer)
    .resize(1200, 628, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 85 })
    .toBuffer();

  // Square version: 1200x1200 (1:1 ratio)
  const squareBuf = await sharp(imageBuffer)
    .resize(1200, 1200, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 85 })
    .toBuffer();

  return {
    landscape: landscapeBuf,
    square: squareBuf,
    originalWidth: width,
    originalHeight: height,
    originalFormat: format,
  };
}

// ============================================================
// ASSET CREATION
// ============================================================

async function createImageAsset(imageData, name, ratio) {
  const b64 = imageData.toString('base64');

  const result = await googleAdsMutate({
    mutateOperations: [{
      assetOperation: {
        create: {
          name: `${name} [${ratio}]`,
          type: 'IMAGE',
          imageAsset: {
            data: b64,
          },
        }
      }
    }]
  });

  return result.mutateOperationResponses[0].assetResult.resourceName;
}

async function getOrCreateImageAssets(url, description) {
  if (assetCache[url]) {
    return assetCache[url];
  }

  // Download
  const rawBuffer = await downloadImage(url);

  // Process into landscape + square
  const processed = await processImage(rawBuffer);

  // Create landscape asset
  const landscapeResource = await createImageAsset(
    processed.landscape,
    description,
    'landscape'
  );

  // Create square asset
  const squareResource = await createImageAsset(
    processed.square,
    description,
    'square'
  );

  const result = { landscapeResource, squareResource };
  assetCache[url] = result;
  return result;
}

async function linkImageToAdGroup(adGroupResource, assetResource) {
  await googleAdsMutate({
    mutateOperations: [{
      adGroupAssetOperation: {
        create: {
          adGroup: adGroupResource,
          asset: assetResource,
          fieldType: 'AD_IMAGE',
        }
      }
    }]
  });
}

// ============================================================
// MAIN
// ============================================================

async function deploy() {
  console.log('');
  console.log('=========================================================');
  console.log('  IMAGE EXTENSIONS DEPLOYER — All 26 Ad Groups');
  console.log('=========================================================');
  console.log('');

  // Validate
  const missing = Object.entries(CONFIG).filter(([k, v]) => !v && k !== 'CAMPAIGN_ID').map(([k]) => k);
  if (missing.length > 0) {
    console.error('ERROR: Missing env vars:', missing.join(', '));
    process.exit(1);
  }

  // Load config
  const config = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'all-image-extensions.json'), 'utf8')
  );

  // Create temp dir
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  await getAccessToken();

  // Step 1: Get all ad groups from the campaign
  console.log('  Querying ad groups on campaign...\n');
  const query = `
    SELECT ad_group.id, ad_group.name, ad_group.resource_name
    FROM ad_group
    WHERE campaign.id = ${CONFIG.CAMPAIGN_ID}
      AND ad_group.status != 'REMOVED'
  `;

  const searchResult = await googleAdsSearch(query);
  const rows = [];
  if (Array.isArray(searchResult)) {
    for (const batch of searchResult) {
      if (batch.results) rows.push(...batch.results);
    }
  }

  // Build name -> resource map
  const adGroupMap = {};
  for (const row of rows) {
    const name = row.adGroup.name;
    const resource = row.adGroup.resourceName;
    adGroupMap[name] = resource;
  }

  console.log(`  Found ${rows.length} ad groups in campaign:\n`);
  for (const [name, resource] of Object.entries(adGroupMap)) {
    console.log(`    ${name}`);
  }
  console.log('');

  // Step 2: Match config ad groups to actual ad groups
  // Handle naming mismatches (config uses "Glass and Aluminium", Google may have "Glass & Aluminium")
  const nameAliases = {
    'Glass and Aluminium': ['Glass & Aluminium', 'Glass and Aluminium'],
    'Glass & Aluminium': ['Glass & Aluminium', 'Glass and Aluminium'],
    'Swimming Pool': ['Swimming Pool', 'Swimming Pool Renovation'],
    'Swimming Pool Renovation': ['Swimming Pool Renovation', 'Swimming Pool'],
    'Solar Panels': ['Solar Panels', 'Solar Panels Dubai'],
    'Solar Panels Dubai': ['Solar Panels Dubai', 'Solar Panels'],
    'Solar Water Heater': ['Solar Water Heater', 'Solar Water Heater Dubai'],
    'Solar Water Heater Dubai': ['Solar Water Heater Dubai', 'Solar Water Heater'],
    'Landscaping Outdoor': ['Landscaping Outdoor', 'Landscaping & Outdoor', 'Landscaping and Outdoor'],
    'JVC and JVT': ['JVC and JVT', 'JVC & JVT'],
    'Al Barsha and Mirdif': ['Al Barsha and Mirdif', 'Al Barsha & Mirdif'],
    'Springs and Meadows': ['Springs and Meadows', 'Springs & Meadows'],
  };

  function findAdGroupResource(configName) {
    // Direct match first
    if (adGroupMap[configName]) return adGroupMap[configName];
    // Try aliases
    const aliases = nameAliases[configName] || [];
    for (const alias of aliases) {
      if (adGroupMap[alias]) return adGroupMap[alias];
    }
    // Fuzzy: case-insensitive
    for (const [name, resource] of Object.entries(adGroupMap)) {
      if (name.toLowerCase() === configName.toLowerCase()) return resource;
    }
    return null;
  }

  // Step 3: Deploy images to each ad group
  const adGroupNames = Object.keys(config.ad_groups);
  let totalImagesLinked = 0;
  let adGroupsProcessed = 0;
  let adGroupsSkipped = 0;
  const errors = [];

  for (let i = 0; i < adGroupNames.length; i++) {
    const agName = adGroupNames[i];
    const agConfig = config.ad_groups[agName];
    const adGroupResource = findAdGroupResource(agName);

    console.log(`  --- [${i + 1}/${adGroupNames.length}] ${agName} ---`);

    if (!adGroupResource) {
      console.log(`    SKIPPED: ad group not found in Google Ads\n`);
      adGroupsSkipped++;
      errors.push(`${agName}: ad group not found`);
      continue;
    }

    // Combine primary + backup images
    const allImages = [
      ...(agConfig.primary_images || []),
      ...(agConfig.backup_images || []),
    ];

    let linkedCount = 0;

    for (let j = 0; j < allImages.length; j++) {
      const img = allImages[j];
      const isPrimary = j < (agConfig.primary_images || []).length;
      const label = isPrimary ? 'primary' : 'backup';

      try {
        // Download + convert + create assets (cached by URL)
        const cached = assetCache[img.url];
        const prefix = cached ? '(cached) ' : '';
        process.stdout.write(`    ${prefix}[${j + 1}/${allImages.length}] ${label}: ${img.description}...`);

        const { landscapeResource, squareResource } = await getOrCreateImageAssets(
          img.url, img.description
        );

        // Link landscape to ad group
        await linkImageToAdGroup(adGroupResource, landscapeResource);

        // Link square to ad group
        await linkImageToAdGroup(adGroupResource, squareResource);

        console.log(' OK');
        linkedCount += 2; // landscape + square
      } catch (e) {
        const errMsg = e.body?.error?.message || e.message || String(e);
        console.log(` FAILED: ${errMsg.substring(0, 120)}`);
        errors.push(`${agName} / ${img.description}: ${errMsg.substring(0, 200)}`);
      }
    }

    totalImagesLinked += linkedCount;
    adGroupsProcessed++;
    console.log(`    ${agName}: ${linkedCount} image links created\n`);
  }

  // Summary
  console.log('');
  console.log('=========================================================');
  console.log('  IMAGE EXTENSIONS DEPLOYMENT COMPLETE');
  console.log('=========================================================');
  console.log('');
  console.log(`  Ad groups processed: ${adGroupsProcessed}/${adGroupNames.length}`);
  console.log(`  Ad groups skipped:   ${adGroupsSkipped}`);
  console.log(`  Unique images uploaded: ${Object.keys(assetCache).length}`);
  console.log(`  Total image-adgroup links: ${totalImagesLinked}`);
  console.log('');

  if (errors.length > 0) {
    console.log(`  Errors (${errors.length}):`);
    for (const err of errors) {
      console.log(`    - ${err}`);
    }
    console.log('');
  }

  console.log('  Next steps:');
  console.log('  1. Go to ads.google.com → Assets → Images to review');
  console.log('  2. Google will auto-approve images within 1-2 business days');
  console.log('  3. Images appear alongside ads once approved');
  console.log('');
}

deploy().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
