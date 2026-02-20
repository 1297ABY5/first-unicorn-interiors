import axios from 'axios';

const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v1';
const RETRY_DELAY_MS = 3000;
const REQUEST_TIMEOUT_MS = 30000;

let apiKey = null;

function getApiKey() {
  if (!apiKey) {
    apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error('FIRECRAWL_API_KEY is not set');
  }
  return apiKey;
}

/**
 * Scrape a single URL via Firecrawl and return the markdown content.
 * Retries once on transient failure. Returns null on permanent failure.
 */
export async function scrapeUrl(url) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await axios.post(
        `${FIRECRAWL_BASE}/scrape`,
        {
          url,
          formats: ['markdown'],
        },
        {
          headers: {
            'Authorization': `Bearer ${getApiKey()}`,
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT_MS,
        }
      );

      const markdown = response.data?.data?.markdown;
      if (!markdown) {
        console.warn(`  [scraper] No markdown returned for ${url}`);
        return null;
      }

      return markdown;
    } catch (err) {
      const status = err.response?.status;

      // Don't retry on client errors (except 429 rate limit)
      if (status && status >= 400 && status < 500 && status !== 429) {
        console.warn(`  [scraper] ${status} for ${url} — skipping`);
        return null;
      }

      if (attempt < 2) {
        const delay = status === 429 ? RETRY_DELAY_MS * 3 : RETRY_DELAY_MS;
        console.warn(`  [scraper] Attempt ${attempt} failed for ${url} — retrying in ${delay}ms`);
        await sleep(delay);
      } else {
        console.error(`  [scraper] Failed after 2 attempts for ${url}: ${err.message}`);
        return null;
      }
    }
  }
  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
