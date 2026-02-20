import { readCompetitorConfig, readBrandConfig } from './config-reader.js';
import { scrapeUrl } from './scraper.js';
import { saveIntel } from './store.js';

/**
 * Run competitor monitoring for a single business.
 * Scrapes each competitor's Instagram and website, produces intel records.
 * Returns count of records generated.
 */
export async function monitorCompetitors(businessSlug) {
  const competitors = await readCompetitorConfig(businessSlug);
  if (competitors.length === 0) {
    console.log(`  [${businessSlug}] No competitors configured — skipping`);
    return 0;
  }

  // Read own brand to avoid self-scraping
  const brand = await readBrandConfig(businessSlug);
  console.log(`  [${businessSlug}] Monitoring ${competitors.length} competitors`);

  const allRecords = [];
  const today = new Date().toISOString().split('T')[0];

  for (const competitor of competitors) {
    console.log(`  [${businessSlug}] Scraping: ${competitor.name}`);

    // --- Instagram ---
    if (competitor.instagram) {
      const handle = competitor.instagram.replace(/^@/, '');

      // Skip if this is the business's own handle
      if (brand.instagram && handle === brand.instagram.replace(/^@/, '')) {
        console.warn(`  [${businessSlug}] Skipping own Instagram handle: @${handle}`);
      } else {
        const records = await scrapeInstagram(businessSlug, competitor, handle, today);
        allRecords.push(...records);
      }
    }

    // --- Website ---
    if (competitor.website) {
      const records = await scrapeWebsite(businessSlug, competitor, today);
      allRecords.push(...records);
    }
  }

  // Persist all records
  if (allRecords.length > 0) {
    await saveIntel(businessSlug, allRecords);
  }

  return allRecords.length;
}

/**
 * Scrape a competitor's Instagram profile page and extract observations.
 */
async function scrapeInstagram(businessSlug, competitor, handle, date) {
  const url = `https://www.instagram.com/${handle}/`;
  const markdown = await scrapeUrl(url);
  if (!markdown) {
    return [makeRecord(businessSlug, competitor.name, 'instagram', date,
      `Failed to scrape Instagram profile @${handle}`,
      'Retry next cycle — may be rate-limited or private',
      'low'
    )];
  }

  const records = [];

  // Extract bio / description
  const bioSnippet = extractSection(markdown, 500);
  if (bioSnippet) {
    records.push(makeRecord(businessSlug, competitor.name, 'instagram', date,
      `Profile snapshot: ${bioSnippet}`,
      'Compare positioning against our brand.md — identify differentiation gaps',
      'low'
    ));
  }

  // Look for follower counts
  const followerMatch = markdown.match(/([\d,.]+[KkMm]?)\s*[Ff]ollowers/);
  if (followerMatch) {
    records.push(makeRecord(businessSlug, competitor.name, 'instagram', date,
      `Follower count: ${followerMatch[1]}`,
      'Track trend over time — growth or stagnation informs our strategy',
      'low'
    ));
  }

  // Look for recent post indicators
  const postIndicators = extractPostIndicators(markdown);
  if (postIndicators) {
    records.push(makeRecord(businessSlug, competitor.name, 'instagram', date,
      `Recent activity: ${postIndicators}`,
      'Analyse content types and posting frequency — inform Factory content calendar',
      'medium'
    ));
  }

  // If we got markdown but couldn't extract structured data, store the raw snapshot
  if (records.length === 0) {
    records.push(makeRecord(businessSlug, competitor.name, 'instagram', date,
      `Raw profile scraped (${markdown.length} chars) — no structured data extracted`,
      'Review raw data manually or wait for AI analysis layer',
      'low'
    ));
  }

  return records;
}

/**
 * Scrape a competitor's website and extract observations.
 */
async function scrapeWebsite(businessSlug, competitor, date) {
  const markdown = await scrapeUrl(competitor.website);
  if (!markdown) {
    return [makeRecord(businessSlug, competitor.name, 'website', date,
      `Failed to scrape website: ${competitor.website}`,
      'Retry next cycle — check if URL is valid',
      'low'
    )];
  }

  const records = [];

  // Look for pricing signals
  const pricingPatterns = /(\$|£|€|AED|USD|GBP)\s?[\d,]+|\d+\s*(per|\/)\s*(month|year|sqft|sq\.?\s*ft|hour|project)/gi;
  const priceMatches = [...markdown.matchAll(pricingPatterns)].slice(0, 5);
  if (priceMatches.length > 0) {
    const prices = priceMatches.map(m => m[0]).join(', ');
    records.push(makeRecord(businessSlug, competitor.name, 'website', date,
      `Pricing signals detected: ${prices}`,
      'Compare against our services.md pricing — identify positioning opportunity',
      'medium'
    ));
  }

  // Look for service/offering keywords
  const serviceSnippet = extractSection(markdown, 600);
  if (serviceSnippet) {
    records.push(makeRecord(businessSlug, competitor.name, 'website', date,
      `Homepage snapshot: ${serviceSnippet}`,
      'Compare service positioning — identify gaps in our messaging',
      'low'
    ));
  }

  // Look for social proof signals (reviews, testimonials, project counts)
  const proofPattern = /(\d+)\s*\+?\s*(projects?|clients?|customers?|reviews?|years?|homes?|properties|completed|happy|satisfied)/gi;
  const proofMatches = [...markdown.matchAll(proofPattern)].slice(0, 5);
  if (proofMatches.length > 0) {
    const proofs = proofMatches.map(m => m[0]).join(', ');
    records.push(makeRecord(businessSlug, competitor.name, 'website', date,
      `Social proof signals: ${proofs}`,
      'Ensure our trust signals in brand.md are competitive',
      'low'
    ));
  }

  // If nothing structured, store raw snapshot
  if (records.length === 0) {
    records.push(makeRecord(businessSlug, competitor.name, 'website', date,
      `Website scraped (${markdown.length} chars) — no structured signals extracted`,
      'Review raw data or wait for AI analysis layer',
      'low'
    ));
  }

  return records;
}

/**
 * Build a record matching the playbook output schema.
 */
function makeRecord(business, competitor, platform, date, observation, suggestedResponse, urgency) {
  return {
    business,
    competitor,
    platform,
    date,
    observation,
    suggested_response: suggestedResponse,
    urgency,
  };
}

/**
 * Extract the first N characters of meaningful text from markdown.
 * Strips headers, links, and excessive whitespace.
 */
function extractSection(markdown, maxLen) {
  const cleaned = markdown
    .replace(/^#+\s+.*$/gm, '')        // strip headers
    .replace(/!\[.*?\]\(.*?\)/g, '')    // strip images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → text
    .replace(/\n{3,}/g, '\n\n')         // collapse blank lines
    .trim();

  if (cleaned.length === 0) return null;
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen).replace(/\s+\S*$/, '') + '...';
}

/**
 * Look for indicators of recent posting activity in scraped markdown.
 */
function extractPostIndicators(markdown) {
  const indicators = [];

  // Count mentions of common engagement terms
  const likeMatches = markdown.match(/(\d[\d,.]*)\s*likes?/gi);
  const commentMatches = markdown.match(/(\d[\d,.]*)\s*comments?/gi);

  if (likeMatches) indicators.push(`${likeMatches.length} posts with visible likes`);
  if (commentMatches) indicators.push(`${commentMatches.length} posts with visible comments`);

  // Look for date/time patterns suggesting recent posts
  const recentDates = markdown.match(/(\d{1,2}\s*(hours?|days?|weeks?)\s*ago)/gi);
  if (recentDates) indicators.push(`Recent posts: ${recentDates.slice(0, 3).join(', ')}`);

  return indicators.length > 0 ? indicators.join('; ') : null;
}
