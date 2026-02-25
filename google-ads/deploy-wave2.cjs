#!/usr/bin/env node
/**
 * Google Ads Wave 2 Deployer - First Unicorn Interiors
 * Deploys 11 NEW ad groups to existing campaign "Search - Villa Renovation Dubai" (ID: 23590913919)
 * Each ad group gets: PAUSED ad group, Phrase+Exact keywords, 2 RSAs with pinned headlines
 *
 * Usage: node deploy-wave2.cjs
 */

const https = require('https');

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
  FINAL_URL: 'https://www.firstunicorninteriors.com/get-quote/villa-renovation',
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
  // Each keyword gets both PHRASE and EXACT match
  const operations = [];
  for (const kw of keywords) {
    operations.push({
      adGroupCriterionOperation: {
        create: {
          adGroup: adGroupResource,
          keyword: { text: kw, matchType: 'PHRASE' },
          status: 'ENABLED',
        }
      }
    });
    operations.push({
      adGroupCriterionOperation: {
        create: {
          adGroup: adGroupResource,
          keyword: { text: kw, matchType: 'EXACT' },
          status: 'ENABLED',
        }
      }
    });
  }

  console.log(`    Adding ${operations.length} keywords (${keywords.length} phrases + ${keywords.length} exact)...`);

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
    if (h.pin === 'Pos 1') obj.pinnedField = 'HEADLINE_1';
    if (h.pin === 'Pos 2') obj.pinnedField = 'HEADLINE_2';
    return obj;
  });
}

function buildDescriptions(descriptions) {
  return descriptions.map(d => {
    const obj = { text: d.text };
    if (d.pin === 'Pos 1') obj.pinnedField = 'DESCRIPTION_1';
    if (d.pin === 'Pos 2') obj.pinnedField = 'DESCRIPTION_2';
    return obj;
  });
}

async function createRSA(adGroupResource, rsa, label) {
  console.log(`    Creating RSA "${label}"...`);

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
            finalUrls: [CONFIG.FINAL_URL],
          }
        }
      }
    }]
  });

  console.log(`    RSA "${label}" created`);
  return result;
}

// ============================================================
// AD GROUP DATA — 11 NEW AD GROUPS
// ============================================================

const AD_GROUPS = [
  // 1. Swimming Pool Renovation (AED 30/day - HIGHEST PRIORITY)
  {
    name: 'Swimming Pool Renovation',
    keywords: [
      'swimming pool installation dubai',
      'swimming pool companies dubai',
      'pool contractor dubai',
      'swimming pool construction dubai',
      'swimming pool builder dubai',
      'custom swimming pools dubai',
      'pool renovation dubai',
      'pool tiling dubai',
      'infinity pool dubai',
      'swimming pool cost dubai',
      'build pool dubai villa',
      'pool renovation contractors dubai',
      'fiberglass pool dubai',
    ],
    rsa_a: {
      headlines: [
        { text: 'Swimming Pool Dubai', pin: 'Pos 1' },
        { text: 'Licensed Pool Contractor', pin: 'Pos 2' },
        { text: 'Pool Build From AED 100K', pin: null },
        { text: 'New Build or Renovation', pin: null },
        { text: 'Tiling Plumbing Decking', pin: null },
        { text: 'All Trades Under 1 Roof', pin: null },
        { text: '15+ Years Pool Experts', pin: null },
        { text: 'Free Pool Site Assessment', pin: null },
        { text: 'Infinity Overflow Custom', pin: null },
        { text: 'Pool Chiller Installation', pin: null },
        { text: 'Filtration System Experts', pin: null },
        { text: 'Transparent Pool Pricing', pin: null },
        { text: 'In-House Team No Subs', pin: null },
        { text: 'WhatsApp for Pool Quote', pin: null },
        { text: 'Book Free Visit Today', pin: null },
      ],
      descriptions: [
        { text: 'Licensed pool contractor. Excavation to first swim. Tiling, plumbing, decking done.', pin: 'Pos 1' },
        { text: 'New pool from AED 100K. Renovation from AED 40K. Transparent pricing. Free visit.', pin: null },
        { text: 'We handle it all: excavation, structure, plumbing, tiling, decking, chiller, filter.', pin: null },
        { text: '15+ years building Dubai villa pools. Ranches to Palm Jumeirah. WhatsApp for quote.', pin: null },
      ],
    },
    rsa_b: {
      headlines: [
        { text: 'Build Your Dream Pool', pin: 'Pos 1' },
        { text: 'Your Villa Needs a Pool', pin: 'Pos 2' },
        { text: 'Swimming Pool Installation', pin: null },
        { text: 'Custom Pools From AED 100K', pin: null },
        { text: 'Infinity Pool Specialists', pin: null },
        { text: 'Pool Renovation Experts', pin: null },
        { text: 'Concrete or Fiberglass', pin: null },
        { text: 'Pool Chiller Included', pin: null },
        { text: 'Decking and Landscaping', pin: null },
        { text: '800+ Outdoor Projects Done', pin: null },
        { text: 'Licensed Dubai Contractor', pin: null },
        { text: 'Free Pool Design Consult', pin: null },
        { text: 'Milestone Payments Only', pin: null },
        { text: 'WhatsApp Us Your Garden', pin: null },
        { text: 'Call +971 52 645 5121', pin: null },
      ],
      descriptions: [
        { text: 'Concrete, fiberglass, or infinity. We design and build the pool your villa deserves.', pin: 'Pos 1' },
        { text: 'Dubai villa without a pool? Custom pools from excavation to first swim. From AED 100K.', pin: null },
        { text: 'Pool chiller, filtration, tiling, decking included. One team. One price. No extras.', pin: null },
        { text: 'WhatsApp a photo of your garden. We send a free pool concept with transparent pricing.', pin: null },
      ],
    },
  },

  // 2. Solar Panels Dubai (AED 15/day)
  {
    name: 'Solar Panels Dubai',
    keywords: [
      'solar panels dubai',
      'solar panel installation villa dubai',
      'shams dubai solar',
      'solar installation dubai',
      'solar panels villa dubai',
      'solar energy dubai',
      'solar panel cost dubai',
      'dewa solar panels',
      'rooftop solar dubai',
    ],
    rsa_a: {
      headlines: [
        { text: 'Solar Panels Dubai Villa', pin: 'Pos 1' },
        { text: 'Cut DEWA Bills by 50-90%', pin: 'Pos 2' },
        { text: 'Shams Dubai Certified', pin: null },
        { text: 'From AED 25K Installed', pin: null },
        { text: 'ROI in 2-4 Years', pin: null },
        { text: 'Free Roof Assessment', pin: null },
        { text: 'Net Metering Included', pin: null },
        { text: '15+ Years UAE Experience', pin: null },
        { text: 'Licensed Installer Dubai', pin: null },
        { text: '5-10kW Villa Systems', pin: null },
        { text: 'Premium Tier-1 Panels', pin: null },
        { text: 'Full Electrical Upgrade', pin: null },
        { text: 'DEWA Application Handled', pin: null },
        { text: 'WhatsApp for Free Quote', pin: null },
        { text: 'Book Assessment Today', pin: null },
      ],
      descriptions: [
        { text: 'Solar panels for Dubai villas. Cut DEWA bills 50-90%. Shams Dubai. From AED 25K.', pin: 'Pos 1' },
        { text: 'We handle everything: roof assessment, install, DEWA application, net metering setup.', pin: null },
        { text: 'Premium Tier-1 panels. Full electrical upgrade. Licensed installer. 25-year warranty.', pin: null },
        { text: 'Free roof assessment this week. Custom system design. Transparent pricing. WhatsApp.', pin: null },
      ],
    },
    rsa_b: {
      headlines: [
        { text: 'Solar Panels for Villas', pin: 'Pos 1' },
        { text: 'Save AED 15K per Year', pin: 'Pos 2' },
        { text: 'Solar Installation Dubai', pin: null },
        { text: 'DEWA Shams Dubai Approved', pin: null },
        { text: 'Pays For Itself in 3 Years', pin: null },
        { text: 'Free Solar Assessment', pin: null },
        { text: 'Roof to Grid in 2 Weeks', pin: null },
        { text: 'We Handle DEWA Paperwork', pin: null },
        { text: 'Premium European Panels', pin: null },
        { text: 'Full Turnkey Installation', pin: null },
        { text: 'Structural Roof Assessment', pin: null },
        { text: 'Clean Energy Dubai Villa', pin: null },
        { text: 'Licensed Dubai Contractor', pin: null },
        { text: 'Transparent Fixed Pricing', pin: null },
        { text: 'Call +971 52 645 5121', pin: null },
      ],
      descriptions: [
        { text: 'Dubai villas save AED 10-25K per year with solar. We install from AED 25K. Call us.', pin: 'Pos 1' },
        { text: 'Full turnkey solar: roof check, structural assess, install, DEWA connection. One team.', pin: null },
        { text: 'Shams Dubai net metering means DEWA pays YOU for excess. We handle the full process.', pin: null },
        { text: 'Free roof assessment. Custom system design. Transparent pricing. No obligation. Call.', pin: null },
      ],
    },
  },

  // 3. Solar Water Heater Dubai (AED 10/day)
  {
    name: 'Solar Water Heater Dubai',
    keywords: [
      'solar water heater dubai',
      'solar heater installation dubai',
      'solar geyser dubai',
      'solar hot water system dubai',
      'solar water heater villa',
      'solar heater replacement dubai',
      'ariston solar heater dubai',
      'solar water heater cost dubai',
    ],
    rsa_a: {
      headlines: [
        { text: 'Solar Water Heater Dubai', pin: 'Pos 1' },
        { text: 'Cut Hot Water Bills 80%', pin: 'Pos 2' },
        { text: 'From AED 6K Installed', pin: null },
        { text: '1-Day Installation', pin: null },
        { text: 'Pays Back in 18 Months', pin: null },
        { text: 'European Brands Only', pin: null },
        { text: 'Free Assessment Today', pin: null },
        { text: 'Licensed Plumber Installs', pin: null },
        { text: '15-20 Year Lifespan', pin: null },
        { text: '150L to 400L Systems', pin: null },
        { text: 'Villa Rooftop Install', pin: null },
        { text: 'Saves AED 500 per Month', pin: null },
        { text: 'No Electricity Needed', pin: null },
        { text: 'WhatsApp for Fast Quote', pin: null },
        { text: 'Book Install This Week', pin: null },
      ],
      descriptions: [
        { text: 'European brands like Ariston. 15-20 year lifespan. Licensed plumber installs on roof.', pin: 'Pos 1' },
        { text: 'Solar water heater for Dubai villas. Installed in 1 day. Saves AED 400-800 per month.', pin: null },
        { text: 'From AED 6K installed. Pays for itself in 18 months. Free hot water for 15-20 years.', pin: null },
        { text: 'Free roof assessment today. We recommend the right size for your family. WhatsApp us.', pin: null },
      ],
    },
    rsa_b: {
      headlines: [
        { text: 'Solar Heater From AED 6K', pin: 'Pos 1' },
        { text: 'Free Hot Water for 20 Years', pin: 'Pos 2' },
        { text: 'Solar Water Heater Dubai', pin: null },
        { text: 'Installed in Just 1 Day', pin: null },
        { text: 'Save AED 500 Every Month', pin: null },
        { text: 'Ariston and European Only', pin: null },
        { text: '150L 250L 400L Options', pin: null },
        { text: 'Perfect for Dubai Villas', pin: null },
        { text: 'Licensed and Insured', pin: null },
        { text: 'Rooftop Installation', pin: null },
        { text: 'No Maintenance Hassle', pin: null },
        { text: 'Annual Service Available', pin: null },
        { text: '15+ Years UAE Experience', pin: null },
        { text: 'Free Home Assessment', pin: null },
        { text: 'Call +971 52 645 5121', pin: null },
      ],
      descriptions: [
        { text: 'Free hot water for 20 years. Solar heater installed in 1 day. From AED 6K. Call now.', pin: 'Pos 1' },
        { text: 'Most Dubai villa families save AED 400-800 per month. Pays itself in 18 months flat.', pin: null },
        { text: '150L for couples, 300L for families, 400L for large villas. We recommend size free.', pin: null },
        { text: 'Licensed plumber installation. European brands. Annual service option. WhatsApp us.', pin: null },
      ],
    },
  },

  // 4. Tilal Al Ghaf (AED 10/day)
  {
    name: 'Tilal Al Ghaf',
    keywords: [
      'villa renovation tilal al ghaf',
      'tilal al ghaf renovation',
      'tilal al ghaf contractor',
      'tilal al ghaf fitout',
      'tilal al ghaf villa upgrade',
      'tilal al ghaf post handover',
    ],
    rsa_a: {
      headlines: [
        { text: 'Tilal Al Ghaf Renovation', pin: 'Pos 1' },
        { text: 'Just Got Handover Keys?', pin: 'Pos 2' },
        { text: 'Post-Handover Specialists', pin: null },
        { text: 'Upgrade Before You Move In', pin: null },
        { text: 'Majlis-Worthy Interiors', pin: null },
        { text: 'In-House Team No Subs', pin: null },
        { text: 'Kitchen Bath Flooring', pin: null },
        { text: 'Done in 4-6 Weeks', pin: null },
        { text: 'Free Villa Site Visit', pin: null },
        { text: '800+ Dubai Villas Done', pin: null },
        { text: '1-Year Written Warranty', pin: null },
        { text: 'Milestone Payments Only', pin: null },
        { text: 'Premium Finishes Standard', pin: null },
        { text: 'WhatsApp for Portfolio', pin: null },
        { text: 'Book Free Consult Today', pin: null },
      ],
      descriptions: [
        { text: 'Tilal Al Ghaf handover upgrades. Kitchen, bath, flooring done in 4 weeks by our team.', pin: 'Pos 1' },
        { text: 'In-house design, tiling, joinery, glass. One team for your villa. No subs. Fixed price.', pin: null },
        { text: 'Upgrade your new Tilal villa before moving in. 800+ projects. Free consultation today.', pin: null },
        { text: 'Milestone payments only. Full material breakdown. 1-year warranty. WhatsApp for quote.', pin: null },
      ],
    },
    rsa_b: {
      headlines: [
        { text: 'Tilal Al Ghaf Upgrades', pin: 'Pos 1' },
        { text: 'Make It Yours Before Day 1', pin: 'Pos 2' },
        { text: 'Premium Villa Fitout Dubai', pin: null },
        { text: 'Italian Materials Direct', pin: null },
        { text: 'Frameless Glass Showers', pin: null },
        { text: 'Custom Kitchen Cabinetry', pin: null },
        { text: 'Smart Home Ready Wiring', pin: null },
        { text: 'Pool Installation Option', pin: null },
        { text: '15+ Years Villa Experts', pin: null },
        { text: 'Transparent Fixed Pricing', pin: null },
        { text: 'Direct Material Sourcing', pin: null },
        { text: 'No Hidden Costs Ever', pin: null },
        { text: 'In-House Design Team', pin: null },
        { text: 'Free 3D Design Concept', pin: null },
        { text: 'Call +971 52 645 5121', pin: null },
      ],
      descriptions: [
        { text: 'Your Tilal Al Ghaf villa is a blank canvas. We transform it before you move in.', pin: 'Pos 1' },
        { text: 'Custom kitchens, spa bathrooms, premium flooring. One team does all. No coordination.', pin: null },
        { text: 'Direct Italian marble sourcing. No middleman markup. Premium finishes. Honest prices.', pin: null },
        { text: 'Free site visit at your Tilal villa. 3D design. Fixed quote. No obligation. WhatsApp.', pin: null },
      ],
    },
  },

  // 5. Damac Hills (AED 10/day)
  {
    name: 'Damac Hills',
    keywords: [
      'villa renovation damac hills',
      'damac hills renovation',
      'damac hills contractor',
      'damac hills villa upgrade',
      'damac hills fitout',
      'damac hills 2 renovation',
    ],
    rsa_a: {
      headlines: [
        { text: 'Damac Hills Renovation', pin: 'Pos 1' },
        { text: 'We Know Damac Layouts', pin: 'Pos 2' },
        { text: 'Post-Handover Upgrades', pin: null },
        { text: 'Kitchen Bath Flooring', pin: null },
        { text: 'Done in 4-6 Weeks Flat', pin: null },
        { text: 'In-House Team No Subs', pin: null },
        { text: 'From AED 80K Full Reno', pin: null },
        { text: 'Free Damac Villa Consult', pin: null },
        { text: '800+ Villas Transformed', pin: null },
        { text: 'Golf Course Views Deserve', pin: null },
        { text: '1-Year Written Warranty', pin: null },
        { text: 'Milestone Payments Only', pin: null },
        { text: 'No Hidden Costs Ever', pin: null },
        { text: 'WhatsApp for Before/After', pin: null },
        { text: 'Book Free Visit Today', pin: null },
      ],
      descriptions: [
        { text: 'Damac Hills villa renovation. We know the layouts. Kitchen, bath, full reno. Call us.', pin: 'Pos 1' },
        { text: 'In-house design, tiling, joinery, glass. One team for your Damac Hills transformation.', pin: null },
        { text: 'From AED 80K full villa renovation. Transparent pricing. Milestone payments. No surprises.', pin: null },
        { text: 'Free consultation at your Damac Hills villa. 3D concept included. No obligation at all.', pin: null },
      ],
    },
    rsa_b: {
      headlines: [
        { text: 'Damac Hills Villa Experts', pin: 'Pos 1' },
        { text: 'Your Golf View Deserves More', pin: 'Pos 2' },
        { text: 'Full Turnkey Renovation', pin: null },
        { text: 'Premium Italian Finishes', pin: null },
        { text: 'Pool Renovation Too', pin: null },
        { text: 'Modern Open Plan Kitchens', pin: null },
        { text: 'Spa Bathroom Upgrades', pin: null },
        { text: 'Smart Home Integration', pin: null },
        { text: '15+ Years Dubai Experts', pin: null },
        { text: 'Direct Material Sourcing', pin: null },
        { text: 'Transparent Fixed Pricing', pin: null },
        { text: 'No Subcontractors Used', pin: null },
        { text: 'Licensed Dubai Contractor', pin: null },
        { text: 'Free Design Consultation', pin: null },
        { text: 'WhatsApp Us Right Now', pin: null },
      ],
      descriptions: [
        { text: 'Your Damac Hills golf view deserves interiors to match. We make it happen. Call today.', pin: 'Pos 1' },
        { text: 'Full villa or room by room. Fixed price. In-house team. Daily WhatsApp updates. Easy.', pin: null },
        { text: 'Premium Italian marble, custom joinery, frameless glass. Direct sourcing. Better price.', pin: null },
        { text: 'Free villa visit this week. 3D design concept. Fixed price quote. Zero obligation.', pin: null },
      ],
    },
  },

  // 6. JVC and JVT (AED 10/day)
  {
    name: 'JVC and JVT',
    keywords: [
      'villa renovation jvc',
      'jvc renovation dubai',
      'jumeirah village renovation',
      'jvt villa renovation',
      'jvc villa upgrade',
      'jumeirah village circle contractor',
    ],
    rsa_a: {
      headlines: [
        { text: 'JVC Villa Renovation', pin: 'Pos 1' },
        { text: 'Quality Without Overpaying', pin: 'Pos 2' },
        { text: 'Transparent Fixed Pricing', pin: null },
        { text: 'From AED 80K Full Reno', pin: null },
        { text: 'Kitchen From AED 45K', pin: null },
        { text: 'Bathroom From AED 25K', pin: null },
        { text: 'In-House Team No Subs', pin: null },
        { text: 'Done in 4-6 Weeks', pin: null },
        { text: 'Free JVC Villa Consult', pin: null },
        { text: '800+ Dubai Villas Done', pin: null },
        { text: '1-Year Written Warranty', pin: null },
        { text: 'Milestone Payments Only', pin: null },
        { text: 'No Hidden Costs Ever', pin: null },
        { text: 'WhatsApp for Quote Today', pin: null },
        { text: 'Book Free Visit Now', pin: null },
      ],
      descriptions: [
        { text: 'You see every AED in the quote. No allowances. No surprises. Milestone payments standard.', pin: 'Pos 1' },
        { text: 'JVC villa renovation from AED 80K. Transparent pricing. In-house team. No subcontractors.', pin: null },
        { text: 'Kitchen, bathroom, flooring, painting. One team. One price. One WhatsApp group. No stress.', pin: null },
        { text: 'Free site visit at your JVC villa. Full quote within 5 days. No obligation whatsoever.', pin: null },
      ],
    },
    rsa_b: {
      headlines: [
        { text: 'JVC Villa Transformation', pin: 'Pos 1' },
        { text: 'Upgrade Your JVC Home', pin: 'Pos 2' },
        { text: 'Rental Value Boost Too', pin: null },
        { text: 'Investor-Friendly Pricing', pin: null },
        { text: 'Fast 4-Week Turnaround', pin: null },
        { text: 'Before and After Photos', pin: null },
        { text: 'In-House Design Build', pin: null },
        { text: '15+ Years Dubai Experts', pin: null },
        { text: 'Quality That Photographs', pin: null },
        { text: 'Tenant-Ready Finishes', pin: null },
        { text: 'Direct Material Sourcing', pin: null },
        { text: 'No Middleman Markup', pin: null },
        { text: 'Licensed Dubai Contractor', pin: null },
        { text: 'Free Design Consultation', pin: null },
        { text: 'WhatsApp Us Right Now', pin: null },
      ],
      descriptions: [
        { text: 'JVC villa renovation that boosts rental value. Quality finishes that photograph well.', pin: 'Pos 1' },
        { text: 'Investor or owner. We deliver quality fast. 4-6 week turnaround. In-house team only.', pin: null },
        { text: 'Kitchen to full villa. Fixed price. In-house team. Milestone payments. No hidden fees.', pin: null },
        { text: 'Free villa consultation this week. Full material breakdown. Fixed quote. WhatsApp us.', pin: null },
      ],
    },
  },

  // 7. Jumeirah Golf Estates (AED 10/day)
  {
    name: 'Jumeirah Golf Estates',
    keywords: [
      'villa renovation jumeirah golf estates',
      'jge renovation',
      'jumeirah golf estates contractor',
      'jge villa upgrade',
      'jumeirah golf estates fitout',
      'renovation jge dubai',
    ],
    rsa_a: {
      headlines: [
        { text: 'JGE Villa Renovation', pin: 'Pos 1' },
        { text: 'Golf Estate Specialists', pin: 'Pos 2' },
        { text: 'Fire Lime Tree Earth Pros', pin: null },
        { text: 'Premium In-House Team', pin: null },
        { text: 'Full Turnkey Service', pin: null },
        { text: 'Italian Materials Direct', pin: null },
        { text: '15+ Years Dubai Luxury', pin: null },
        { text: '800+ Villas Transformed', pin: null },
        { text: 'Free JGE Villa Consult', pin: null },
        { text: '1-Year Written Warranty', pin: null },
        { text: 'Milestone Payments Only', pin: null },
        { text: 'No Subcontractors Used', pin: null },
        { text: 'Pool Renovation Too', pin: null },
        { text: 'WhatsApp for Portfolio', pin: null },
        { text: 'Book Free Visit Today', pin: null },
      ],
      descriptions: [
        { text: 'Jumeirah Golf Estates villa renovation. Fire, Lime Tree, Earth layouts. We know them.', pin: 'Pos 1' },
        { text: 'In-house design, tiling, joinery, glass. One team for your JGE villa. Premium only.', pin: null },
        { text: 'Your golf estate villa deserves a team that matches its standard. 15 years. 800+ done.', pin: null },
        { text: 'Free consultation at your JGE villa. 3D design. Full material quote. No obligation.', pin: null },
      ],
    },
    rsa_b: {
      headlines: [
        { text: 'Luxury JGE Villa Reno', pin: 'Pos 1' },
        { text: 'Your Golf View Deserves It', pin: 'Pos 2' },
        { text: 'Architect-Led Renovation', pin: null },
        { text: 'Custom Kitchen Joinery', pin: null },
        { text: 'Spa Bathroom Upgrades', pin: null },
        { text: 'Smart Home Integration', pin: null },
        { text: 'Pool and Landscape Too', pin: null },
        { text: 'Direct Material Sourcing', pin: null },
        { text: 'One Team Start to Finish', pin: null },
        { text: 'Transparent Fixed Pricing', pin: null },
        { text: 'Licensed Dubai Contractor', pin: null },
        { text: 'WhatsApp Photo Updates', pin: null },
        { text: 'No Hidden Costs Ever', pin: null },
        { text: 'Free Design Consultation', pin: null },
        { text: 'Call +971 52 645 5121', pin: null },
      ],
      descriptions: [
        { text: 'JGE villas deserve magazine-worthy interiors. Italian marble. Custom joinery and glass.', pin: 'Pos 1' },
        { text: 'Full villa or room by room. Fixed price. In-house team. Daily WhatsApp updates. Easy.', pin: null },
        { text: 'Premium countertops and marble sourced direct from Italy. No middleman. Better quality.', pin: null },
        { text: 'Free private consultation at your JGE villa. 3D concept. Fixed quote. WhatsApp us.', pin: null },
      ],
    },
  },

  // 8. Springs and Meadows (AED 10/day)
  {
    name: 'Springs and Meadows',
    keywords: [
      'villa renovation springs dubai',
      'meadows renovation dubai',
      'springs villa upgrade',
      'meadows villa contractor',
      'the springs renovation',
      'the meadows renovation dubai',
    ],
    rsa_a: {
      headlines: [
        { text: 'Springs Meadows Reno', pin: 'Pos 1' },
        { text: 'Your Villa Needs a Refresh', pin: 'Pos 2' },
        { text: 'We Know These Layouts', pin: null },
        { text: 'From AED 80K Full Reno', pin: null },
        { text: 'Kitchen From AED 45K', pin: null },
        { text: 'Bathroom From AED 25K', pin: null },
        { text: 'In-House Team No Subs', pin: null },
        { text: 'Done in 4-6 Weeks', pin: null },
        { text: 'Free Villa Site Visit', pin: null },
        { text: '800+ Dubai Villas Done', pin: null },
        { text: '1-Year Written Warranty', pin: null },
        { text: 'Milestone Payments Only', pin: null },
        { text: 'Room-by-Room Available', pin: null },
        { text: 'WhatsApp for Before/After', pin: null },
        { text: 'Book Free Visit Today', pin: null },
      ],
      descriptions: [
        { text: 'Springs and Meadows villas ready for a refresh. We know layouts. Fixed price. AED 80K.', pin: 'Pos 1' },
        { text: 'In-house design, tiling, joinery, glass. One team for your Springs or Meadows reno.', pin: null },
        { text: 'Room-by-room or full villa. Transparent pricing. Milestone payments. No subs. Call us.', pin: null },
        { text: 'Free consultation at your villa this week. 3D design concept. Full quote. No obligation.', pin: null },
      ],
    },
    rsa_b: {
      headlines: [
        { text: 'Modernise Your Springs Home', pin: 'Pos 1' },
        { text: 'Built in 2005? Time to Reno', pin: 'Pos 2' },
        { text: 'Open Plan Kitchen Upgrade', pin: null },
        { text: 'Spa Bathroom From AED 25K', pin: null },
        { text: 'New Flooring Throughout', pin: null },
        { text: 'We Work While You Travel', pin: null },
        { text: 'Summer Reno Slots Open', pin: null },
        { text: 'Transparent Fixed Pricing', pin: null },
        { text: '15+ Years Dubai Experts', pin: null },
        { text: 'Your Neighbours Chose Us', pin: null },
        { text: 'No Subcontractors Used', pin: null },
        { text: 'WhatsApp Daily Updates', pin: null },
        { text: 'Direct Material Sourcing', pin: null },
        { text: 'Free 3D Design Included', pin: null },
        { text: 'Call +971 52 645 5121', pin: null },
      ],
      descriptions: [
        { text: 'Springs and Meadows villas built 2003-2008 are overdue. We refresh in 6-8 weeks.', pin: 'Pos 1' },
        { text: 'Travel for summer. Come back to a brand new home. We renovate while you are away.', pin: null },
        { text: 'Kitchen, bathroom, flooring, painting. One team. Fixed price. Milestone payments.', pin: null },
        { text: 'Your neighbours used us. Ask around then WhatsApp us for your own free consultation.', pin: null },
      ],
    },
  },

  // 9. Al Barsha and Mirdif (AED 10/day)
  {
    name: 'Al Barsha and Mirdif',
    keywords: [
      'villa renovation al barsha',
      'mirdif villa renovation',
      'al barsha contractor',
      'mirdif renovation contractor',
      'villa upgrade al barsha',
      'renovation mirdif dubai',
    ],
    rsa_a: {
      headlines: [
        { text: 'Al Barsha Mirdif Reno', pin: 'Pos 1' },
        { text: 'Quality at Honest Prices', pin: 'Pos 2' },
        { text: 'Transparent Fixed Pricing', pin: null },
        { text: 'From AED 80K Full Reno', pin: null },
        { text: 'Kitchen From AED 45K', pin: null },
        { text: 'Bathroom From AED 25K', pin: null },
        { text: 'In-House Team No Subs', pin: null },
        { text: 'Done in 4-6 Weeks', pin: null },
        { text: 'Free Villa Site Visit', pin: null },
        { text: '800+ Dubai Villas Done', pin: null },
        { text: '1-Year Written Warranty', pin: null },
        { text: 'Milestone Payments Only', pin: null },
        { text: 'No Hidden Costs Ever', pin: null },
        { text: 'WhatsApp for Quote Today', pin: null },
        { text: 'Book Free Visit Now', pin: null },
      ],
      descriptions: [
        { text: 'Al Barsha and Mirdif villa renovation. Transparent pricing from AED 80K. No subs.', pin: 'Pos 1' },
        { text: 'In-house design, tiling, joinery, glass, painting. One team. One contract. One number.', pin: null },
        { text: 'Every AED itemised in your quote. No allowances. No hidden charges. Milestone payments.', pin: null },
        { text: 'Free site visit at your villa this week. Full quote within 5 days. No obligation.', pin: null },
      ],
    },
    rsa_b: {
      headlines: [
        { text: 'Villa Renovation Al Barsha', pin: 'Pos 1' },
        { text: 'Premium Without the Premium', pin: 'Pos 2' },
        { text: 'Mirdif Villa Experts Too', pin: null },
        { text: 'Italian Stone From AED 45K', pin: null },
        { text: 'Modern Kitchen Renovation', pin: null },
        { text: 'Spa Bathroom Upgrades', pin: null },
        { text: 'Direct Material Sourcing', pin: null },
        { text: 'No Middleman Markup', pin: null },
        { text: '15+ Years Dubai Experts', pin: null },
        { text: 'Trusted Villa Contractor', pin: null },
        { text: 'No Subcontractors Used', pin: null },
        { text: 'WhatsApp Daily Updates', pin: null },
        { text: 'Licensed Dubai Contractor', pin: null },
        { text: 'Free Design Consultation', pin: null },
        { text: 'WhatsApp Us Right Now', pin: null },
      ],
      descriptions: [
        { text: 'Premium renovation at honest prices. Al Barsha and Mirdif villa specialists. AED 80K.', pin: 'Pos 1' },
        { text: 'Direct material sourcing from Italy. No middleman. Premium finishes at fair prices.', pin: null },
        { text: 'Full villa or room by room. Fixed price. In-house team. Daily updates. No surprises.', pin: null },
        { text: 'Free villa visit this week. Full material breakdown. Fixed price quote. WhatsApp us.', pin: null },
      ],
    },
  },

  // 10. Al Barari (AED 10/day)
  {
    name: 'Al Barari',
    keywords: [
      'villa renovation al barari',
      'al barari renovation',
      'al barari contractor',
      'al barari villa upgrade',
      'al barari interior design',
      'luxury renovation al barari',
    ],
    rsa_a: {
      headlines: [
        { text: 'Al Barari Villa Renovation', pin: 'Pos 1' },
        { text: 'Luxury Meets Nature Here', pin: 'Pos 2' },
        { text: 'Premium In-House Team', pin: null },
        { text: 'Italian Marble Experts', pin: null },
        { text: 'Custom Joinery In-House', pin: null },
        { text: 'Pool and Garden Too', pin: null },
        { text: '15+ Years Dubai Luxury', pin: null },
        { text: '800+ Premium Villas Done', pin: null },
        { text: 'Free Al Barari Consult', pin: null },
        { text: '1-Year Written Warranty', pin: null },
        { text: 'Milestone Payments Only', pin: null },
        { text: 'No Subcontractors Used', pin: null },
        { text: 'Transparent Fixed Pricing', pin: null },
        { text: 'WhatsApp for Portfolio', pin: null },
        { text: 'Book Free Visit Today', pin: null },
      ],
      descriptions: [
        { text: 'Al Barari villas demand interiors as refined as the gardens. Our team delivers.', pin: 'Pos 1' },
        { text: 'Premium Italian marble, custom joinery, frameless glass. One team. No subcontractors.', pin: null },
        { text: 'Al Barari luxury renovation. Concept to completion. 15 years. 800+ Dubai villa projects.', pin: null },
        { text: 'Free consultation at your Al Barari villa. 3D concept. Full quote. No obligation.', pin: null },
      ],
    },
    rsa_b: {
      headlines: [
        { text: 'Reimagine Your Al Barari', pin: 'Pos 1' },
        { text: 'Your Sanctuary Reimagined', pin: 'Pos 2' },
        { text: 'Al Barari Specialists', pin: null },
        { text: 'Architect-Led Renovation', pin: null },
        { text: 'Premium Materials Only', pin: null },
        { text: 'Full Villa or Key Rooms', pin: null },
        { text: 'Smart Home Integration', pin: null },
        { text: 'Direct Material Sourcing', pin: null },
        { text: 'One Team Start to Finish', pin: null },
        { text: 'Licensed Dubai Contractor', pin: null },
        { text: 'WhatsApp Photo Updates', pin: null },
        { text: 'Discreet Professional Team', pin: null },
        { text: 'Transparent Fixed Price', pin: null },
        { text: 'Free Private Consultation', pin: null },
        { text: 'Call +971 52 645 5121', pin: null },
      ],
      descriptions: [
        { text: 'Your Al Barari sanctuary deserves interiors to match the landscape. We deliver it.', pin: 'Pos 1' },
        { text: 'Full villa or key rooms. In-house team. Premium materials. Fixed price. No drama.', pin: null },
        { text: 'Italian marble. German hardware. Expert project management. Your villa. Our focus.', pin: null },
        { text: 'Free private villa consultation. 3D design concept. Full material quote. WhatsApp.', pin: null },
      ],
    },
  },

  // 11. Landscaping and Outdoor (AED 10/day)
  {
    name: 'Landscaping and Outdoor',
    keywords: [
      'landscaping dubai villa',
      'garden design dubai',
      'outdoor living dubai',
      'pergola installation dubai',
      'decking dubai villa',
      'outdoor kitchen dubai',
      'villa garden renovation dubai',
      'landscape contractor dubai',
      'hardscape dubai',
    ],
    rsa_a: {
      headlines: [
        { text: 'Landscaping Dubai Villa', pin: 'Pos 1' },
        { text: 'Transform Your Outdoor Space', pin: 'Pos 2' },
        { text: 'Pergola Decking BBQ Area', pin: null },
        { text: 'Outdoor Kitchen Experts', pin: null },
        { text: 'Hardscape and Softscape', pin: null },
        { text: 'Garden Design and Build', pin: null },
        { text: 'In-House Build Team', pin: null },
        { text: '15+ Years Dubai Outdoors', pin: null },
        { text: 'Free Garden Assessment', pin: null },
        { text: 'Pool Area Included', pin: null },
        { text: 'Lighting and Irrigation', pin: null },
        { text: 'Misting System Option', pin: null },
        { text: '1-Year Warranty Included', pin: null },
        { text: 'WhatsApp for Ideas', pin: null },
        { text: 'Book Free Visit Today', pin: null },
      ],
      descriptions: [
        { text: 'Complete outdoor transformation. Pergola, decking, BBQ, lighting, irrigation. Done.', pin: 'Pos 1' },
        { text: 'Dubai villa garden design and build. Hardscape, softscape, outdoor kitchen. Call us.', pin: null },
        { text: 'Your garden is half your villa. We make it liveable year round. Misting and lighting.', pin: null },
        { text: 'Free garden assessment this week. Design concept included. Fixed price. No obligation.', pin: null },
      ],
    },
    rsa_b: {
      headlines: [
        { text: 'Outdoor Living Dubai', pin: 'Pos 1' },
        { text: 'Live Outside Year Round', pin: 'Pos 2' },
        { text: 'Villa Garden Renovation', pin: null },
        { text: 'Pergola From AED 15K', pin: null },
        { text: 'Outdoor Kitchen Built', pin: null },
        { text: 'Teak Decking Experts', pin: null },
        { text: 'Pool and Garden Combined', pin: null },
        { text: 'Misting Cooling Systems', pin: null },
        { text: 'LED Garden Lighting', pin: null },
        { text: 'Natural Stone Pavers', pin: null },
        { text: 'Direct Material Sourcing', pin: null },
        { text: 'No Subcontractors Used', pin: null },
        { text: 'Licensed Dubai Contractor', pin: null },
        { text: 'Free Design Consultation', pin: null },
        { text: 'WhatsApp Us a Photo', pin: null },
      ],
      descriptions: [
        { text: 'Turn your villa garden into a five-star outdoor living space. We design and build it.', pin: 'Pos 1' },
        { text: 'Pergola, decking, outdoor kitchen, lighting, irrigation. One team. Fixed price. Done.', pin: null },
        { text: 'From barren garden to outdoor retreat. Pool area, BBQ, seating, landscaping. Call us.', pin: null },
        { text: 'WhatsApp a photo of your garden. We send a free design concept. No obligation at all.', pin: null },
      ],
    },
  },
];

// ============================================================
// MAIN DEPLOYMENT
// ============================================================

async function deploy() {
  console.log('');
  console.log('=====================================================');
  console.log('  WAVE 2 DEPLOY — 11 New Ad Groups');
  console.log('  Campaign: Search - Villa Renovation Dubai');
  console.log('  Campaign ID: ' + CONFIG.CAMPAIGN_ID);
  console.log('=====================================================');
  console.log('');

  // Validate config
  const missing = Object.entries(CONFIG)
    .filter(([k, v]) => !v && k !== 'API_VERSION')
    .map(([k]) => k);
  if (missing.length > 0) {
    console.error('Missing env vars:', missing.join(', '));
    process.exit(1);
  }

  const campaignResource = `customers/${CONFIG.CUSTOMER_ID}/campaigns/${CONFIG.CAMPAIGN_ID}`;

  try {
    // Step 1: Auth
    await getAccessToken();

    // Step 2: Verify account + campaign
    console.log('Verifying account access...');
    const accountInfo = await googleAdsSearch(
      `SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.id = ${CONFIG.CAMPAIGN_ID}`
    );
    if (accountInfo && accountInfo[0] && accountInfo[0].results) {
      const camp = accountInfo[0].results[0].campaign;
      console.log(`  Campaign found: "${camp.name}" (status: ${camp.status})\n`);
    } else {
      console.log('  Campaign verified\n');
    }

    // Step 3: Deploy each ad group
    let totalKeywords = 0;
    let totalRSAs = 0;
    const results = [];

    for (let i = 0; i < AD_GROUPS.length; i++) {
      const ag = AD_GROUPS[i];
      console.log(`\n[${i + 1}/${AD_GROUPS.length}] === ${ag.name} ===`);

      // Create ad group (PAUSED)
      const adGroupResource = await createAdGroup(campaignResource, ag.name);

      // Add keywords (Phrase + Exact for each)
      await addKeywords(adGroupResource, ag.keywords);
      totalKeywords += ag.keywords.length * 2;

      // Create RSA A
      await createRSA(adGroupResource, ag.rsa_a, `${ag.name} - RSA A`);
      totalRSAs++;

      // Create RSA B
      await createRSA(adGroupResource, ag.rsa_b, `${ag.name} - RSA B`);
      totalRSAs++;

      results.push({ name: ag.name, resource: adGroupResource, keywords: ag.keywords.length * 2 });
      console.log(`  [${i + 1}/${AD_GROUPS.length}] ${ag.name} DONE\n`);
    }

    // Summary
    console.log('');
    console.log('=====================================================');
    console.log('  WAVE 2 DEPLOYMENT COMPLETE');
    console.log('=====================================================');
    console.log('');
    console.log(`Campaign: Search - Villa Renovation Dubai (${CONFIG.CAMPAIGN_ID})`);
    console.log(`New Ad Groups: ${AD_GROUPS.length}`);
    console.log(`Total Keywords: ${totalKeywords} (${totalKeywords / 2} phrases + ${totalKeywords / 2} exact)`);
    console.log(`Total RSAs: ${totalRSAs}`);
    console.log(`All ad groups: PAUSED`);
    console.log(`Final URL: ${CONFIG.FINAL_URL}`);
    console.log('');
    console.log('Ad Groups deployed:');
    results.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.name} — ${r.keywords} keywords — ${r.resource}`);
    });
    console.log('');
    console.log('Next: Review in ads.google.com, then enable ad groups as needed.');
    console.log('WhatsApp CTA: wa.me/971526455121');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('Deployment failed:', error);
    if (error.body) {
      console.error('API response:', JSON.stringify(error.body, null, 2));
    }
    process.exit(1);
  }
}

// Run
deploy().catch(console.error);
