#!/usr/bin/env node
/**
 * Google Ads Expansion Deployer - First Unicorn Interiors
 * Deploys 7 NEW ad groups to existing campaign "Search - Villa Renovation Dubai" (ID: 23590913919)
 * Each ad group gets: PAUSED ad group, keywords, 2 RSAs with pinned headlines
 * Also adds: 15 new negative keywords, 4 new sitelinks
 *
 * Usage: node deploy-expansion.cjs
 *
 * Does NOT touch campaign-config.json — reads from expansion-campaign.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  DEVELOPER_TOKEN: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  CUSTOMER_ID: process.env.GOOGLE_ADS_CUSTOMER_ID || '1600550384',
  CLIENT_ID: process.env.GOOGLE_ADS_CLIENT_ID,
  CLIENT_SECRET: process.env.GOOGLE_ADS_CLIENT_SECRET,
  REFRESH_TOKEN: process.env.GOOGLE_ADS_REFRESH_TOKEN,
  API_VERSION: 'v20',
  CAMPAIGN_ID: '23590913919',
};

let ACCESS_TOKEN = null;

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

  const options = {
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const result = await httpsRequest(options, postData);
  ACCESS_TOKEN = result.access_token;
  console.log('  Access token obtained\n');
  return ACCESS_TOKEN;
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
  const customerId = CONFIG.CUSTOMER_ID;
  const postData = JSON.stringify(operations);

  const options = {
    hostname: 'googleads.googleapis.com',
    path: `/v20/customers/${customerId}/googleAds:mutate`,
    method: 'POST',
    headers: {
      ...googleAdsHeaders(),
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  return httpsRequest(options, postData);
}

async function googleAdsSearch(query) {
  const customerId = CONFIG.CUSTOMER_ID;
  const postData = JSON.stringify({ query });

  const options = {
    hostname: 'googleads.googleapis.com',
    path: `/v20/customers/${customerId}/googleAds:searchStream`,
    method: 'POST',
    headers: {
      ...googleAdsHeaders(),
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  return httpsRequest(options, postData);
}

// ============================================================
// DEPLOY HELPERS
// ============================================================

async function createAdGroup(campaignResource, name) {
  console.log(`    Creating ad group: ${name}...`);

  const result = await googleAdsMutate({
    mutateOperations: [{
      adGroupOperation: {
        create: {
          name: name,
          campaign: campaignResource,
          status: 'PAUSED',
          type: 'SEARCH_STANDARD',
        }
      }
    }]
  });

  const resourceName = result.mutateOperationResponses[0].adGroupResult.resourceName;
  console.log(`    Ad group created: ${resourceName}`);
  return resourceName;
}

async function addKeywords(adGroupResource, keywords) {
  const operations = keywords.map(kw => ({
    adGroupCriterionOperation: {
      create: {
        adGroup: adGroupResource,
        keyword: {
          text: kw.keyword,
          matchType: kw.match.toUpperCase(),
        },
        status: 'ENABLED',
      }
    }
  }));

  console.log(`    Adding ${operations.length} keywords...`);

  // Batch in groups of 20
  for (let i = 0; i < operations.length; i += 20) {
    const batch = operations.slice(i, i + 20);
    await googleAdsMutate({ mutateOperations: batch });
    console.log(`      Added ${Math.min(i + 20, operations.length)}/${operations.length}`);
  }
}

function buildHeadlines(headlines) {
  return headlines.map(h => {
    const obj = { text: h.text };
    if (h.pin === '1') obj.pinnedField = 'HEADLINE_1';
    if (h.pin === '2') obj.pinnedField = 'HEADLINE_2';
    if (h.pin === '3') obj.pinnedField = 'HEADLINE_3';
    return obj;
  });
}

function buildDescriptions(descriptions) {
  return descriptions.map(d => {
    const obj = { text: d.text };
    if (d.pin === '1') obj.pinnedField = 'DESCRIPTION_1';
    if (d.pin === '2') obj.pinnedField = 'DESCRIPTION_2';
    return obj;
  });
}

async function createRSA(adGroupResource, rsa, finalUrl, label) {
  console.log(`    Creating RSA "${label}" (${rsa.strategy})...`);

  const result = await googleAdsMutate({
    mutateOperations: [{
      adGroupAdOperation: {
        create: {
          adGroup: adGroupResource,
          status: 'ENABLED',
          ad: {
            responsiveSearchAd: {
              headlines: buildHeadlines(rsa.headlines),
              descriptions: buildDescriptions(rsa.descriptions),
            },
            finalUrls: [finalUrl],
          }
        }
      }
    }]
  });

  console.log(`    RSA "${label}" created`);
  return result;
}

async function addNegativeKeywords(campaignResource, negativeKeywords) {
  console.log(`  Adding ${negativeKeywords.length} negative keywords to campaign...`);

  const operations = negativeKeywords.map(nk => ({
    campaignCriterionOperation: {
      create: {
        campaign: campaignResource,
        keyword: {
          text: nk.keyword,
          matchType: nk.match.toUpperCase(),
        },
        negative: true,
      }
    }
  }));

  // Batch in groups of 20
  for (let i = 0; i < operations.length; i += 20) {
    const batch = operations.slice(i, i + 20);
    await googleAdsMutate({ mutateOperations: batch });
    console.log(`    Added ${Math.min(i + 20, operations.length)}/${operations.length}`);
  }
  console.log('  Negative keywords added\n');
}

async function addNewSitelinks(campaignResource, sitelinks) {
  console.log(`  Adding ${sitelinks.length} new sitelinks...`);

  try {
    // Create sitelink assets
    const assetOps = sitelinks.map(sl => ({
      assetOperation: {
        create: {
          sitelinkAsset: {
            linkText: sl.text,
            description1: sl.desc1,
            description2: sl.desc2,
          },
          finalUrls: [`https://${sl.url}`],
        }
      }
    }));

    const assetResult = await googleAdsMutate({
      mutateOperations: assetOps,
    });

    // Link all to campaign
    const linkOps = assetResult.mutateOperationResponses.map(r => ({
      campaignAssetOperation: {
        create: {
          campaign: campaignResource,
          asset: r.assetResult.resourceName,
          fieldType: 'SITELINK',
        }
      }
    }));

    await googleAdsMutate({ mutateOperations: linkOps });
    console.log('  Sitelinks added\n');
  } catch (e) {
    console.log('  WARNING: Sitelinks failed:', e.body?.error?.message || e);
    console.log('  (May need manual setup in Google Ads UI)\n');
  }
}

// ============================================================
// MAIN DEPLOYMENT
// ============================================================

async function deploy() {
  console.log('');
  console.log('=========================================================');
  console.log('  FIRST UNICORN INTERIORS — Expansion Campaign Deployer');
  console.log('=========================================================');
  console.log('');

  // Validate config
  const missing = Object.entries(CONFIG)
    .filter(([k, v]) => !v && k !== 'CAMPAIGN_ID')
    .map(([k]) => k);
  if (missing.length > 0) {
    console.error('ERROR: Missing environment variables:', missing.join(', '));
    console.error('Set them in .env file or export them');
    process.exit(1);
  }

  // Load expansion config
  const configPath = path.join(__dirname, 'expansion-campaign.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  const campaignResource = `customers/${CONFIG.CUSTOMER_ID}/campaigns/${CONFIG.CAMPAIGN_ID}`;

  console.log(`  Campaign: ${config.campaign_name}`);
  console.log(`  Target: campaign ${CONFIG.CAMPAIGN_ID}`);
  console.log(`  Ad groups: ${config.ad_groups.length}`);
  console.log(`  New keywords: ${config.total_new_keywords}`);
  console.log(`  New negative keywords: ${config.new_negative_keywords.length}`);
  console.log(`  New sitelinks: ${config.new_sitelinks.length}`);
  console.log('');

  try {
    // Step 1: Auth
    await getAccessToken();

    // Step 2: Verify account access
    console.log('  Verifying account access...');
    try {
      await googleAdsSearch(
        "SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1"
      );
      console.log('  Account access verified\n');
    } catch (e) {
      console.error('ERROR: Cannot access Google Ads account. Check customer ID and permissions.');
      process.exit(1);
    }

    // Step 3: Add negative keywords
    if (config.new_negative_keywords && config.new_negative_keywords.length > 0) {
      await addNegativeKeywords(campaignResource, config.new_negative_keywords);
    }

    // Step 4: Add new sitelinks
    if (config.new_sitelinks && config.new_sitelinks.length > 0) {
      await addNewSitelinks(campaignResource, config.new_sitelinks);
    }

    // Step 5: Deploy ad groups
    console.log(`  Deploying ${config.ad_groups.length} ad groups...\n`);

    const results = [];

    for (let i = 0; i < config.ad_groups.length; i++) {
      const ag = config.ad_groups[i];
      console.log(`  --- [${i + 1}/${config.ad_groups.length}] ${ag.name} (${ag.type}) ---`);

      // Create ad group (PAUSED)
      const adGroupResource = await createAdGroup(campaignResource, ag.name);

      // Add keywords
      await addKeywords(adGroupResource, ag.keywords);

      // Create RSA A
      await createRSA(adGroupResource, ag.rsa_a, ag.landing_page, 'A');

      // Create RSA B
      await createRSA(adGroupResource, ag.rsa_b, ag.landing_page, 'B');

      results.push({
        name: ag.name,
        type: ag.type,
        keywords: ag.keywords.length,
        landingPage: ag.landing_page,
        resource: adGroupResource,
      });

      console.log(`    ${ag.name} DONE\n`);
    }

    // Summary
    console.log('');
    console.log('=========================================================');
    console.log('  DEPLOYMENT COMPLETE');
    console.log('=========================================================');
    console.log('');
    console.log(`  Campaign: ${config.campaign_name}`);
    console.log(`  All ad groups deployed as: PAUSED`);
    console.log(`  Negative keywords added: ${config.new_negative_keywords.length}`);
    console.log(`  Sitelinks added: ${config.new_sitelinks.length}`);
    console.log('');
    console.log('  Ad groups deployed:');
    for (const r of results) {
      console.log(`    - ${r.name} (${r.type}) — ${r.keywords} keywords — ${r.landingPage}`);
    }
    console.log('');
    console.log('  Total keywords deployed:', results.reduce((sum, r) => sum + r.keywords, 0));
    console.log('');
    console.log('  Next steps:');
    console.log('  1. Go to ads.google.com and review the new ad groups');
    console.log('  2. Fix 4 broken sitelink URLs (see sitelink_fixes in config)');
    console.log('  3. Enable ad groups one by one in priority order');
    console.log('  4. Monitor CPA and adjust budgets after 7 days');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('DEPLOYMENT FAILED:', error);
    if (error.body) {
      console.error('API response:', JSON.stringify(error.body, null, 2));
    }
    process.exit(1);
  }
}

// Run
deploy().catch(console.error);
