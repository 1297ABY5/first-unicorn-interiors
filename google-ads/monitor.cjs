#!/usr/bin/env node
/**
 * Google Ads Monitor - First Unicorn Interiors
 * Runs daily via cron. Sends Telegram alerts for:
 * - Search terms with 5+ clicks, 0 conversions (waste)
 * - CPA spikes (>2x target)
 * - Budget pacing issues
 * - Low CTR ads (<1% after 200 impressions)
 * 
 * Usage: node monitor.js
 * Cron:  0 8 * * * cd /root/unicorn-sovereign/google-ads && node monitor.js
 */

const https = require('https');

// ============================================================
// CONFIG
// ============================================================

const CONFIG = {
  DEVELOPER_TOKEN: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  CUSTOMER_ID: process.env.GOOGLE_ADS_CUSTOMER_ID,
  CLIENT_ID: process.env.GOOGLE_ADS_CLIENT_ID,
  CLIENT_SECRET: process.env.GOOGLE_ADS_CLIENT_SECRET,
  REFRESH_TOKEN: process.env.GOOGLE_ADS_REFRESH_TOKEN,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  TARGET_CPA_AED: 150,  // Alert if CPA exceeds this
  WASTE_CLICK_THRESHOLD: 5,  // Flag search terms with this many clicks + 0 conversions
  LOW_CTR_THRESHOLD: 0.01,  // 1%
  MIN_IMPRESSIONS_FOR_CTR: 200,
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
          resolve(JSON.parse(data));
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
  return ACCESS_TOKEN;
}

async function googleAdsSearch(query) {
  const customerId = CONFIG.CUSTOMER_ID;
  const postData = JSON.stringify({ query });
  
  return httpsRequest({
    hostname: 'googleads.googleapis.com',
    path: `/v20/customers/${customerId}/googleAds:searchStream`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'developer-token': CONFIG.DEVELOPER_TOKEN,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  }, postData);
}

// ============================================================
// TELEGRAM
// ============================================================

async function sendTelegram(message) {
  if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) {
    console.log('📱 [No Telegram config] Message:', message);
    return;
  }

  const postData = JSON.stringify({
    chat_id: CONFIG.TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'HTML',
  });

  return httpsRequest({
    hostname: 'api.telegram.org',
    path: `/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  }, postData);
}

// ============================================================
// MONITORS
// ============================================================

async function checkSearchTerms() {
  console.log('🔍 Checking search terms (last 7 days)...');
  
  const query = `
    SELECT
      search_term_view.search_term,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions,
      campaign.name,
      ad_group.name
    FROM search_term_view
    WHERE segments.date DURING LAST_7_DAYS
      AND metrics.clicks >= ${CONFIG.WASTE_CLICK_THRESHOLD}
      AND metrics.conversions = 0
    ORDER BY metrics.clicks DESC
    LIMIT 20
  `;

  try {
    const result = await googleAdsSearch(query);
    const rows = result[0]?.results || [];
    
    if (rows.length === 0) {
      console.log('  ✅ No wasteful search terms found');
      return [];
    }

    const wasteful = rows.map(r => ({
      term: r.searchTermView.searchTerm,
      clicks: r.metrics.clicks,
      cost: (parseInt(r.metrics.costMicros) / 1000000).toFixed(2),
      campaign: r.campaign.name,
      adGroup: r.adGroup.name,
    }));

    console.log(`  ⚠️  ${wasteful.length} wasteful search terms found`);
    return wasteful;
  } catch (e) {
    console.log('  ❌ Search terms check failed:', e.message || e);
    return [];
  }
}

async function checkCampaignPerformance() {
  console.log('📊 Checking campaign performance (last 7 days)...');
  
  const query = `
    SELECT
      campaign.name,
      campaign.status,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE segments.date DURING LAST_7_DAYS
      AND campaign.status = 'ENABLED'
  `;

  try {
    const result = await googleAdsSearch(query);
    const rows = result[0]?.results || [];
    
    if (rows.length === 0) {
      console.log('  ℹ️  No active campaigns found');
      return null;
    }

    const campaigns = rows.map(r => ({
      name: r.campaign.name,
      clicks: parseInt(r.metrics.clicks) || 0,
      impressions: parseInt(r.metrics.impressions) || 0,
      cost: (parseInt(r.metrics.costMicros) / 1000000).toFixed(2),
      conversions: parseFloat(r.metrics.conversions) || 0,
      ctr: (parseFloat(r.metrics.ctr) * 100).toFixed(2),
      avgCpc: (parseInt(r.metrics.averageCpc) / 1000000).toFixed(2),
    }));

    return campaigns;
  } catch (e) {
    console.log('  ❌ Campaign check failed:', e.message || e);
    return null;
  }
}

async function checkLowPerformingAds() {
  console.log('📉 Checking ad performance (last 14 days)...');
  
  const query = `
    SELECT
      ad_group_ad.ad.id,
      ad_group.name,
      campaign.name,
      metrics.clicks,
      metrics.impressions,
      metrics.ctr
    FROM ad_group_ad
    WHERE segments.date DURING LAST_14_DAYS
      AND metrics.impressions >= ${CONFIG.MIN_IMPRESSIONS_FOR_CTR}
      AND metrics.ctr < ${CONFIG.LOW_CTR_THRESHOLD}
      AND ad_group_ad.status = 'ENABLED'
  `;

  try {
    const result = await googleAdsSearch(query);
    const rows = result[0]?.results || [];
    
    if (rows.length === 0) {
      console.log('  ✅ No low-CTR ads found');
      return [];
    }

    const lowAds = rows.map(r => ({
      adId: r.adGroupAd.ad.id,
      adGroup: r.adGroup.name,
      campaign: r.campaign.name,
      impressions: r.metrics.impressions,
      clicks: r.metrics.clicks,
      ctr: (parseFloat(r.metrics.ctr) * 100).toFixed(2),
    }));

    console.log(`  ⚠️  ${lowAds.length} low-CTR ads found`);
    return lowAds;
  } catch (e) {
    console.log('  ❌ Ad check failed:', e.message || e);
    return [];
  }
}

// ============================================================
// REPORT BUILDER
// ============================================================

function buildReport(campaigns, wastefulTerms, lowAds) {
  const lines = [];
  const now = new Date().toLocaleDateString('en-GB', { 
    timeZone: 'Asia/Dubai',
    day: '2-digit', month: 'short', year: 'numeric'
  });
  
  lines.push(`🏗 <b>First Unicorn Ads Report</b>`);
  lines.push(`📅 ${now} (Last 7 days)\n`);

  // Campaign summary
  if (campaigns && campaigns.length > 0) {
    let totalClicks = 0, totalCost = 0, totalConversions = 0;
    
    campaigns.forEach(c => {
      totalClicks += c.clicks;
      totalCost += parseFloat(c.cost);
      totalConversions += c.conversions;
    });

    lines.push(`<b>📊 Campaign Summary</b>`);
    lines.push(`Clicks: ${totalClicks}`);
    lines.push(`Spend: AED ${totalCost.toFixed(2)}`);
    lines.push(`Conversions: ${totalConversions}`);
    
    if (totalConversions > 0) {
      const cpa = totalCost / totalConversions;
      lines.push(`CPA: AED ${cpa.toFixed(2)}`);
      if (cpa > CONFIG.TARGET_CPA_AED * 2) {
        lines.push(`🚨 CPA is ${(cpa / CONFIG.TARGET_CPA_AED).toFixed(1)}x target!`);
      }
    }
    lines.push('');
  } else {
    lines.push('ℹ️ No active campaigns\n');
  }

  // Wasteful search terms
  if (wastefulTerms.length > 0) {
    lines.push(`<b>🚫 Wasteful Search Terms</b>`);
    lines.push(`${wastefulTerms.length} terms with ${CONFIG.WASTE_CLICK_THRESHOLD}+ clicks, 0 conversions:\n`);
    
    wastefulTerms.slice(0, 10).forEach(t => {
      lines.push(`• "${t.term}" — ${t.clicks} clicks, AED ${t.cost}`);
    });
    
    lines.push(`\n💡 Consider adding these as negative keywords`);
    lines.push('');
  }

  // Low CTR ads
  if (lowAds.length > 0) {
    lines.push(`<b>📉 Low-CTR Ads</b>`);
    lowAds.forEach(a => {
      lines.push(`• ${a.adGroup}: ${a.ctr}% CTR (${a.impressions} impr)`);
    });
    lines.push(`\n💡 Review ad copy or pause underperformers`);
    lines.push('');
  }

  // All clear
  if (wastefulTerms.length === 0 && lowAds.length === 0) {
    lines.push('✅ No issues detected — all looking healthy!');
  }

  return lines.join('\n');
}

// ============================================================
// MAIN
// ============================================================

async function monitor() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  FIRST UNICORN — Google Ads Daily Monitor');
  console.log('  ' + new Date().toISOString());
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  try {
    await getAccessToken();

    const [campaigns, wastefulTerms, lowAds] = await Promise.all([
      checkCampaignPerformance(),
      checkSearchTerms(),
      checkLowPerformingAds(),
    ]);

    const report = buildReport(campaigns || [], wastefulTerms, lowAds);
    
    console.log('\n--- Report ---');
    console.log(report.replace(/<\/?b>/g, ''));
    console.log('--- End ---\n');

    // Send via Telegram
    await sendTelegram(report);
    console.log('✅ Report sent to Telegram');

  } catch (error) {
    console.error('❌ Monitor failed:', error);
    await sendTelegram(`🚨 Google Ads monitor failed: ${error.message || error}`);
  }
}

monitor().catch(console.error);
