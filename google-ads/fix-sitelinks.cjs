#!/usr/bin/env node
/**
 * Fix Broken Sitelink URLs
 *
 * Google Ads does NOT allow editing asset URLs after creation.
 * Strategy: find broken sitelink assets → remove campaign link → remove asset → create new asset with correct URL → link to campaign
 *
 * Usage: node fix-sitelinks.cjs
 */

const https = require('https');

const CONFIG = {
  DEVELOPER_TOKEN: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  CUSTOMER_ID: process.env.GOOGLE_ADS_CUSTOMER_ID || '1600550384',
  CLIENT_ID: process.env.GOOGLE_ADS_CLIENT_ID,
  CLIENT_SECRET: process.env.GOOGLE_ADS_CLIENT_SECRET,
  REFRESH_TOKEN: process.env.GOOGLE_ADS_REFRESH_TOKEN,
  CAMPAIGN_ID: '23590913919',
};

let ACCESS_TOKEN = null;

const SITELINK_FIXES = [
  { linkText: 'Kitchen Renovation', correctUrl: 'https://firstunicorninteriors.com/renovation/kitchen/', desc1: 'Custom kitchen design & build', desc2: 'In-house joinery team' },
  { linkText: 'Bathroom Renovation', correctUrl: 'https://firstunicorninteriors.com/renovation/bathroom/', desc1: 'Luxury bathroom makeovers', desc2: 'Italian marble & glass' },
  { linkText: 'Swimming Pools', correctUrl: 'https://firstunicorninteriors.com/renovation/pool/', desc1: 'Licensed pool contractor', desc2: 'Build or renovate' },
  { linkText: 'Solar Panels', correctUrl: 'https://firstunicorninteriors.com/renovation/solar/', desc1: 'Cut DEWA bills 50-90%', desc2: 'Shams Dubai certified' },
];

// ============================================================
// HTTP + AUTH (same as other deployers)
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
            console.error(`API Error [${res.statusCode}]:`, JSON.stringify(json, null, 2));
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
// MAIN
// ============================================================

async function fixSitelinks() {
  console.log('');
  console.log('=========================================================');
  console.log('  FIX BROKEN SITELINK URLs');
  console.log('=========================================================');
  console.log('');

  const missing = Object.entries(CONFIG).filter(([k, v]) => !v && k !== 'CAMPAIGN_ID').map(([k]) => k);
  if (missing.length > 0) {
    console.error('ERROR: Missing env vars:', missing.join(', '));
    process.exit(1);
  }

  await getAccessToken();

  // Step 1: Find all sitelink assets linked to this campaign
  console.log('  Querying existing sitelink assets on campaign...\n');

  const query = `
    SELECT
      asset.id,
      asset.name,
      asset.resource_name,
      asset.sitelink_asset.link_text,
      asset.sitelink_asset.description1,
      asset.sitelink_asset.description2,
      asset.final_urls,
      campaign_asset.resource_name,
      campaign_asset.campaign
    FROM campaign_asset
    WHERE campaign_asset.campaign = 'customers/${CONFIG.CUSTOMER_ID}/campaigns/${CONFIG.CAMPAIGN_ID}'
      AND campaign_asset.field_type = 'SITELINK'
  `;

  const searchResult = await googleAdsSearch(query);

  // Parse results — searchStream returns array of batches
  const rows = [];
  if (Array.isArray(searchResult)) {
    for (const batch of searchResult) {
      if (batch.results) rows.push(...batch.results);
    }
  }

  if (rows.length === 0) {
    console.log('  No sitelink assets found on campaign. Nothing to fix.');
    return;
  }

  console.log(`  Found ${rows.length} sitelinks on campaign:\n`);
  for (const row of rows) {
    const linkText = row.asset?.sitelinkAsset?.linkText || '(unknown)';
    const urls = row.asset?.finalUrls || [];
    console.log(`    "${linkText}" -> ${urls.join(', ')}`);
  }
  console.log('');

  // Step 2: Match broken sitelinks by linkText
  const targetTexts = SITELINK_FIXES.map(f => f.linkText.toLowerCase());
  let fixedCount = 0;

  for (const fix of SITELINK_FIXES) {
    const matchedRow = rows.find(r =>
      r.asset?.sitelinkAsset?.linkText?.toLowerCase() === fix.linkText.toLowerCase()
    );

    if (!matchedRow) {
      console.log(`  "${fix.linkText}" — NOT FOUND on campaign, creating fresh...`);

      // Just create new asset + link
      try {
        const assetResult = await googleAdsMutate({
          mutateOperations: [{
            assetOperation: {
              create: {
                sitelinkAsset: {
                  linkText: fix.linkText,
                  description1: fix.desc1,
                  description2: fix.desc2,
                },
                finalUrls: [fix.correctUrl],
              }
            }
          }]
        });

        const newAssetResource = assetResult.mutateOperationResponses[0].assetResult.resourceName;

        await googleAdsMutate({
          mutateOperations: [{
            campaignAssetOperation: {
              create: {
                campaign: `customers/${CONFIG.CUSTOMER_ID}/campaigns/${CONFIG.CAMPAIGN_ID}`,
                asset: newAssetResource,
                fieldType: 'SITELINK',
              }
            }
          }]
        });

        console.log(`    CREATED: "${fix.linkText}" -> ${fix.correctUrl}`);
        fixedCount++;
      } catch (e) {
        console.log(`    FAILED to create "${fix.linkText}":`, e.body?.error?.message || e);
      }
      continue;
    }

    // Found the broken sitelink — remove campaign link, then remove asset, then recreate
    const oldAssetResource = matchedRow.asset.resourceName;
    const campaignAssetResource = matchedRow.campaignAsset.resourceName;
    const oldUrl = (matchedRow.asset.finalUrls || []).join(', ');

    console.log(`  "${fix.linkText}" — FOUND (${oldUrl})`);
    console.log(`    Removing campaign link: ${campaignAssetResource}`);

    try {
      // Remove campaign<->asset link
      await googleAdsMutate({
        mutateOperations: [{
          campaignAssetOperation: {
            remove: campaignAssetResource,
          }
        }]
      });
      console.log('    Campaign link removed');

      // Remove old asset
      console.log(`    Removing old asset: ${oldAssetResource}`);
      await googleAdsMutate({
        mutateOperations: [{
          assetOperation: {
            remove: oldAssetResource,
          }
        }]
      });
      console.log('    Old asset removed');
    } catch (e) {
      // Asset removal may fail if shared — that's okay, we just unlinked it
      console.log('    Note: asset removal skipped (may be shared):', e.body?.error?.message || '');
    }

    // Create new asset with correct URL
    console.log(`    Creating new asset: "${fix.linkText}" -> ${fix.correctUrl}`);
    try {
      const assetResult = await googleAdsMutate({
        mutateOperations: [{
          assetOperation: {
            create: {
              sitelinkAsset: {
                linkText: fix.linkText,
                description1: fix.desc1,
                description2: fix.desc2,
              },
              finalUrls: [fix.correctUrl],
            }
          }
        }]
      });

      const newAssetResource = assetResult.mutateOperationResponses[0].assetResult.resourceName;

      // Link new asset to campaign
      await googleAdsMutate({
        mutateOperations: [{
          campaignAssetOperation: {
            create: {
              campaign: `customers/${CONFIG.CUSTOMER_ID}/campaigns/${CONFIG.CAMPAIGN_ID}`,
              asset: newAssetResource,
              fieldType: 'SITELINK',
            }
          }
        }]
      });

      console.log(`    FIXED: "${fix.linkText}" -> ${fix.correctUrl}\n`);
      fixedCount++;
    } catch (e) {
      console.log(`    FAILED to recreate "${fix.linkText}":`, e.body?.error?.message || e);
      console.log('');
    }
  }

  // Summary
  console.log('');
  console.log('=========================================================');
  console.log(`  DONE — ${fixedCount}/${SITELINK_FIXES.length} sitelinks fixed`);
  console.log('=========================================================');
  console.log('');
  for (const fix of SITELINK_FIXES) {
    console.log(`    "${fix.linkText}" -> ${fix.correctUrl}`);
  }
  console.log('');
}

fixSitelinks().catch(console.error);
