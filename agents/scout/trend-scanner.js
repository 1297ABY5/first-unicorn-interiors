import Anthropic from '@anthropic-ai/sdk';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { scrapeUrl } from './scraper.js';
import { readBrandConfig } from './config-reader.js';

const ROOT = process.env.SOVEREIGN_DATA_DIR || join(import.meta.dirname, '..', '..');
const BUSINESSES_DIR = join(ROOT, 'businesses');
const MODEL = process.env.SCOUT_MODEL || 'claude-sonnet-4-6';

const TREND_SEARCHES = [
  'villa renovation dubai trends 2026',
  'renovation marketing strategies',
  'dubai property market news today',
  'luxury home renovation middle east',
];

const FIRECRAWL_SEARCH_URL = 'https://api.firecrawl.dev/v1/search';

/**
 * Search via Firecrawl search endpoint and return combined markdown.
 */
async function firecrawlSearch(query) {
  const axios = (await import('axios')).default;
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY is not set');

  try {
    const response = await axios.post(
      FIRECRAWL_SEARCH_URL,
      { query, limit: 3, scrapeOptions: { formats: ['markdown'] } },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      }
    );

    const results = response.data?.data || [];
    return results
      .map(r => {
        const title = r.title || r.metadata?.title || 'Untitled';
        const url = r.url || '';
        const content = r.markdown || r.content || '';
        return `### ${title}\nSource: ${url}\n\n${content.slice(0, 2000)}`;
      })
      .join('\n\n---\n\n');
  } catch (err) {
    const status = err.response?.status;
    console.warn(`  [trends] Search failed for "${query}": ${status || err.message}`);
    return null;
  }
}

/**
 * Scan trending topics and market intelligence for a business.
 * Uses Firecrawl search + Claude analysis.
 */
export async function scanTrends(businessSlug) {
  const brand = await readBrandConfig(businessSlug);
  const businessName = brand.name || businessSlug;

  console.log(`  [${businessSlug}] Scanning market trends...`);

  // Scrape all trend sources
  const allContent = [];
  for (const query of TREND_SEARCHES) {
    console.log(`  [trends] Searching: "${query}"`);
    const content = await firecrawlSearch(query);
    if (content) {
      allContent.push(`## Search: "${query}"\n\n${content}`);
    }
    // Rate limit between searches
    await new Promise(r => setTimeout(r, 1500));
  }

  if (allContent.length === 0) {
    console.log(`  [${businessSlug}] No trend data collected — skipping analysis`);
    return null;
  }

  const combinedContent = allContent.join('\n\n========\n\n');
  console.log(`  [trends] Collected ${allContent.length} search results (${combinedContent.length} chars)`);

  // Send to Claude for analysis
  const client = new Anthropic();
  console.log(`  [trends] Analysing with ${MODEL}...`);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: `You are a digital marketing strategist for ${businessName}, a premium villa renovation company in Dubai. You analyse market intelligence and identify actionable opportunities. Respond with valid JSON only — no markdown fences, no explanation.`,
    messages: [{
      role: 'user',
      content: `Based on the following market intelligence scraped today, provide a JSON response with:
- trending_topics: 3 topics trending in our industry right now (each with "topic" and "why_relevant" fields)
- competitor_moves: any notable competitor activity spotted (array of strings, can be empty)
- content_opportunities: 3 specific content pieces we should create this week (each with "title", "format" like carousel/reel/story, and "angle")
- recommended_angles: 3 angles for today's content that would perform well right now (each a string)

Market intelligence:

${combinedContent.slice(0, 12000)}`,
    }],
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  const cleaned = text.replace(/^```json?\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  let trends;
  try {
    trends = JSON.parse(cleaned);
  } catch (err) {
    console.error(`  [trends] JSON parse failed: ${err.message}`);
    console.error(`  [trends] Raw: ${text.slice(0, 300)}`);
    return null;
  }

  // Add metadata
  trends.metadata = {
    business: businessSlug,
    generated_at: new Date().toISOString(),
    model: MODEL,
    searches: TREND_SEARCHES,
    sources_collected: allContent.length,
    input_tokens: response.usage?.input_tokens,
    output_tokens: response.usage?.output_tokens,
  };

  // Save to results/trends/{YYYY-MM-DD}.json
  const today = new Date().toISOString().split('T')[0];
  const dir = join(BUSINESSES_DIR, businessSlug, 'results', 'trends');
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, `${today}.json`);
  await writeFile(filePath, JSON.stringify(trends, null, 2), 'utf-8');
  console.log(`  [trends] Saved → trends/${today}.json`);

  return trends;
}
