#!/usr/bin/env node
/**
 * Google Ads Campaign Deployer - First Unicorn Interiors
 * Deploys full campaign structure via Google Ads REST API v20
 * 
 * Usage: node deploy.js
 * 
 * Prerequisites: .env file with Google Ads credentials
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  DEVELOPER_TOKEN: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  CUSTOMER_ID: process.env.GOOGLE_ADS_CUSTOMER_ID,
  CLIENT_ID: process.env.GOOGLE_ADS_CLIENT_ID,
  CLIENT_SECRET: process.env.GOOGLE_ADS_CLIENT_SECRET,
  REFRESH_TOKEN: process.env.GOOGLE_ADS_REFRESH_TOKEN,
  API_VERSION: 'v20',
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
  console.log('🔑 Getting access token...');
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
  console.log('✅ Access token obtained');
  return ACCESS_TOKEN;
}

// ============================================================
// GOOGLE ADS API CALLS
// ============================================================

function googleAdsHeaders() {
  return {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'developer-token': CONFIG.DEVELOPER_TOKEN,
    'Content-Type': 'application/json',
  };
}

async function googleAdsRequest(method, endpoint, body = null) {
  const customerId = CONFIG.CUSTOMER_ID;
  const pathStr = `/v20/customers/${customerId}/${endpoint}`;
  
  const options = {
    hostname: 'googleads.googleapis.com',
    path: pathStr,
    method: method,
    headers: googleAdsHeaders(),
  };

  const postData = body ? JSON.stringify(body) : null;
  if (postData) {
    options.headers['Content-Length'] = Buffer.byteLength(postData);
  }

  return httpsRequest(options, postData);
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
// CAMPAIGN BUILDER
// ============================================================

async function createCampaignBudget(name, amountMicros) {
  console.log(`💰 Creating budget: ${name} (AED ${amountMicros / 1000000}/day)...`);
  
  const result = await googleAdsMutate({
    mutateOperations: [{
      campaignBudgetOperation: {
        create: {
          name: name,
          amountMicros: String(amountMicros),
          deliveryMethod: 'STANDARD',
          explicitlyShared: false,
        }
      }
    }]
  });

  const resourceName = result.mutateOperationResponses[0].campaignBudgetResult.resourceName;
  console.log(`✅ Budget created: ${resourceName}`);
  return resourceName;
}

async function createCampaign(name, budgetResourceName, startDate) {
  console.log(`🚀 Creating campaign: ${name}...`);

  const result = await googleAdsMutate({
    mutateOperations: [{
      campaignOperation: {
        create: {
          name: name,
          status: 'PAUSED',
          advertisingChannelType: 'SEARCH',
          campaignBudget: budgetResourceName,
          maximizeConversions: {},
          containsEuPoliticalAdvertising: 2,
          startDate: startDate.replace(/-/g, ''),
          networkSettings: {
            targetGoogleSearch: true,
            targetSearchNetwork: false,
            targetContentNetwork: false,
            targetPartnerSearchNetwork: false,
          },
          geoTargetTypeSetting: {
            positiveGeoTargetType: 'PRESENCE',
            negativeGeoTargetType: 'PRESENCE',
          },
        }
      }
    }]
  });

  const resourceName = result.mutateOperationResponses[0].campaignResult.resourceName;
  console.log(`✅ Campaign created: ${resourceName}`);
  return resourceName;
}

async function addGeoTarget(campaignResourceName) {
  console.log('📍 Adding Dubai geo target...');
  
  // Dubai geo target constant ID: 1002140
  const result = await googleAdsMutate({
    mutateOperations: [{
      campaignCriterionOperation: {
        create: {
          campaign: campaignResourceName,
          location: {
            geoTargetConstant: 'geoTargetConstants/1002140'  // Dubai
          },
          negative: false,
        }
      }
    }]
  });

  console.log('✅ Dubai geo target added');
  return result;
}

async function addLanguageTarget(campaignResourceName) {
  console.log('🌐 Adding English language target...');
  
  const result = await googleAdsMutate({
    mutateOperations: [{
      campaignCriterionOperation: {
        create: {
          campaign: campaignResourceName,
          language: {
            languageConstant: 'languageConstants/1000'  // English
          },
          negative: false,
        }
      }
    }]
  });

  console.log('✅ English language target added');
  return result;
}

async function addNegativeKeywords(campaignResourceName, negativeKeywords) {
  console.log(`🚫 Adding ${negativeKeywords.length} negative keywords...`);
  
  const operations = negativeKeywords.map(kw => ({
    campaignCriterionOperation: {
      create: {
        campaign: campaignResourceName,
        keyword: {
          text: kw,
          matchType: 'BROAD',
        },
        negative: true,
      }
    }
  }));

  // Batch in groups of 20
  for (let i = 0; i < operations.length; i += 20) {
    const batch = operations.slice(i, i + 20);
    await googleAdsMutate({ mutateOperations: batch });
    console.log(`  ✅ Added negative keywords ${i + 1}-${Math.min(i + 20, operations.length)}`);
  }
}

async function createAdGroup(campaignResourceName, name) {
  console.log(`📂 Creating ad group: ${name}...`);

  const result = await googleAdsMutate({
    mutateOperations: [{
      adGroupOperation: {
        create: {
          name: name,
          campaign: campaignResourceName,
          status: 'ENABLED',
          type: 'SEARCH_STANDARD',
        }
      }
    }]
  });

  const resourceName = result.mutateOperationResponses[0].adGroupResult.resourceName;
  console.log(`✅ Ad group created: ${resourceName}`);
  return resourceName;
}

async function addKeywords(adGroupResourceName, keywords) {
  console.log(`🔤 Adding ${keywords.length} keywords...`);

  const operations = keywords.map(kw => ({
    adGroupCriterionOperation: {
      create: {
        adGroup: adGroupResourceName,
        keyword: {
          text: kw.text,
          matchType: kw.match,
        },
        status: 'ENABLED',
      }
    }
  }));

  // Batch in groups of 20
  for (let i = 0; i < operations.length; i += 20) {
    const batch = operations.slice(i, i + 20);
    await googleAdsMutate({ mutateOperations: batch });
    console.log(`  ✅ Added keywords ${i + 1}-${Math.min(i + 20, operations.length)}`);
  }
}

async function createResponsiveSearchAd(adGroupResourceName, ad, landingPage) {
  console.log(`📝 Creating Responsive Search Ad...`);

  const headlines = ad.headlines.map((h, i) => ({
    text: h,
    pinnedField: i < 3 ? undefined : undefined,  // Let Google optimise
  }));

  const descriptions = ad.descriptions.map(d => ({
    text: d,
  }));

  const result = await googleAdsMutate({
    mutateOperations: [{
      adGroupAdOperation: {
        create: {
          adGroup: adGroupResourceName,
          status: 'ENABLED',
          ad: {
            responsiveSearchAd: {
              headlines: headlines,
              descriptions: descriptions,
            },
            finalUrls: [landingPage],
          }
        }
      }
    }]
  });

  console.log(`✅ Responsive Search Ad created`);
  return result;
}

async function addCallExtension(campaignResourceName, phoneNumber, countryCode) {
  console.log(`📞 Adding call extension: ${phoneNumber}...`);
  
  try {
    // Create call asset
    const assetResult = await googleAdsMutate({
      mutateOperations: [{
        assetOperation: {
          create: {
            callAsset: {
              countryCode: countryCode,
              phoneNumber: phoneNumber,
              callConversionReportingState: 'DISABLED',
            }
          }
        }
      }]
    });

    const assetResourceName = assetResult.mutateOperationResponses[0].assetResult.resourceName;
    
    // Link to campaign
    await googleAdsMutate({
      mutateOperations: [{
        campaignAssetOperation: {
          create: {
            campaign: campaignResourceName,
            asset: assetResourceName,
            fieldType: 'CALL',
          }
        }
      }]
    });

    console.log('✅ Call extension added');
  } catch (e) {
    console.log('⚠️  Call extension failed (may need manual setup):', e.body?.error?.message || e);
  }
}

async function addCalloutExtensions(campaignResourceName, callouts) {
  console.log(`📌 Adding ${callouts.length} callout extensions...`);
  
  try {
    // Create callout assets
    const assetOps = callouts.map(text => ({
      assetOperation: {
        create: {
          calloutAsset: {
            calloutText: text,
          }
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
          campaign: campaignResourceName,
          asset: r.assetResult.resourceName,
          fieldType: 'CALLOUT',
        }
      }
    }));

    await googleAdsMutate({ mutateOperations: linkOps });
    console.log('✅ Callout extensions added');
  } catch (e) {
    console.log('⚠️  Callout extensions failed:', e.body?.error?.message || e);
  }
}

async function addSitelinkExtensions(campaignResourceName, sitelinks) {
  console.log(`🔗 Adding ${sitelinks.length} sitelink extensions...`);
  
  try {
    const assetOps = sitelinks.map(sl => ({
      assetOperation: {
        create: {
          sitelinkAsset: {
            linkText: sl.text,
            description1: sl.description1,
            description2: sl.description2,
          },
          finalUrls: [sl.url],
        }
      }
    }));

    const assetResult = await googleAdsMutate({
      mutateOperations: assetOps,
    });

    const linkOps = assetResult.mutateOperationResponses.map(r => ({
      campaignAssetOperation: {
        create: {
          campaign: campaignResourceName,
          asset: r.assetResult.resourceName,
          fieldType: 'SITELINK',
        }
      }
    }));

    await googleAdsMutate({ mutateOperations: linkOps });
    console.log('✅ Sitelink extensions added');
  } catch (e) {
    console.log('⚠️  Sitelink extensions failed:', e.body?.error?.message || e);
  }
}

// ============================================================
// MAIN DEPLOYMENT
// ============================================================

async function deploy() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  FIRST UNICORN INTERIORS — Google Ads Deployer');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  // Validate config
  const missing = Object.entries(CONFIG).filter(([k, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    console.error('Set them in .env file or export them');
    process.exit(1);
  }

  // Load campaign config
  const configPath = path.join(__dirname, 'campaign-config.json');
  const campaignConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  try {
    // Step 1: Auth
    await getAccessToken();

    // Step 2: Verify account access
    console.log('\n📋 Verifying account access...');
    try {
      const accountInfo = await googleAdsSearch(
        "SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1"
      );
      console.log('✅ Account access verified');
    } catch (e) {
      console.error('❌ Cannot access Google Ads account. Check customer ID and permissions.');
      process.exit(1);
    }

    // Step 3: Create budget
    const budgetResource = await createCampaignBudget(
      campaignConfig.campaign.budget_name,
      campaignConfig.campaign.budget_amount_micros
    );

    // Step 4: Create campaign
    const campaignResource = await createCampaign(
      campaignConfig.campaign.name,
      budgetResource,
      campaignConfig.campaign.start_date
    );

    // Step 5: Geo + Language targeting
    await addGeoTarget(campaignResource);
    await addLanguageTarget(campaignResource);

    // Step 6: Negative keywords
    await addNegativeKeywords(campaignResource, campaignConfig.negative_keywords);

    // Step 7: Extensions
    if (campaignConfig.extensions) {
      if (campaignConfig.extensions.call) {
        await addCallExtension(
          campaignResource,
          campaignConfig.extensions.call.phone_number,
          campaignConfig.extensions.call.country_code
        );
      }
      if (campaignConfig.extensions.callouts) {
        await addCalloutExtensions(campaignResource, campaignConfig.extensions.callouts);
      }
      if (campaignConfig.extensions.sitelinks) {
        await addSitelinkExtensions(campaignResource, campaignConfig.extensions.sitelinks);
      }
    }

    // Step 8: Ad groups with keywords + ads
    console.log(`\n📦 Creating ${campaignConfig.ad_groups.length} ad groups...\n`);
    
    for (const ag of campaignConfig.ad_groups) {
      console.log(`\n--- ${ag.name} ---`);
      
      // Create ad group
      const adGroupResource = await createAdGroup(campaignResource, ag.name);
      
      // Add keywords
      await addKeywords(adGroupResource, ag.keywords);
      
      // Create RSA
      await createResponsiveSearchAd(adGroupResource, ag.ad, ag.landing_page);
      
      console.log(`✅ ${ag.name} complete\n`);
    }

    // Done!
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  ✅ DEPLOYMENT COMPLETE');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log(`Campaign: ${campaignConfig.campaign.name}`);
    console.log(`Status: PAUSED (enable when ready)`);
    console.log(`Budget: AED ${campaignConfig.campaign.budget_amount_micros / 1000000}/day`);
    console.log(`Ad Groups: ${campaignConfig.ad_groups.length}`);
    console.log(`Total Keywords: ${campaignConfig.ad_groups.reduce((sum, ag) => sum + ag.keywords.length, 0)}`);
    console.log(`Negative Keywords: ${campaignConfig.negative_keywords.length}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Go to ads.google.com and review the campaign');
    console.log('2. Set up conversion tracking (WhatsApp clicks + calls)');
    console.log('3. Add billing/payment method');
    console.log('4. Enable the campaign when ready');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Deployment failed:', error);
    if (error.body) {
      console.error('API response:', JSON.stringify(error.body, null, 2));
    }
    process.exit(1);
  }
}

// Run
deploy().catch(console.error);
