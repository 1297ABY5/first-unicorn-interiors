import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.env.SOVEREIGN_DATA_DIR || join(import.meta.dirname, '..', '..');
const BUSINESSES_DIR = join(ROOT, 'businesses');

/**
 * Parse a markdown field line like "- **field:** value" and return the value.
 * Returns null if the line doesn't match.
 */
function parseField(line, fieldName) {
  const pattern = new RegExp(`^\\s*-\\s*\\*\\*${fieldName}:\\*\\*\\s*(.+)$`, 'i');
  const match = line.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Read brand.md for a business and extract identity + social handles.
 */
export async function readBrandConfig(slug) {
  const filePath = join(BUSINESSES_DIR, slug, 'brand.md');
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  const config = {
    slug,
    name: null,
    instagram: null,
    linkedin: null,
    facebook: null,
    tiktok: null,
    youtube: null,
    twitter: null,
    google_business: null,
  };

  for (const line of lines) {
    // Identity fields
    config.name ??= parseField(line, 'business_name');

    // Social accounts
    config.instagram ??= parseField(line, 'instagram');
    config.linkedin ??= parseField(line, 'linkedin');
    config.facebook ??= parseField(line, 'facebook');
    config.tiktok ??= parseField(line, 'tiktok');
    config.youtube ??= parseField(line, 'youtube');
    config.twitter ??= parseField(line, 'twitter');
    config.google_business ??= parseField(line, 'google_business');
  }

  return config;
}

/**
 * Read competitors.md for a business and extract competitor entries.
 * Returns an array of competitor objects.
 */
export async function readCompetitorConfig(slug) {
  const filePath = join(BUSINESSES_DIR, slug, 'competitors.md');
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  const competitors = [];
  let current = null;

  for (const line of lines) {
    // New competitor section: "## Competitor N: Name" or "## Competitor N: [Company Name]"
    const headerMatch = line.match(/^##\s+Competitor\s+\d+:\s*(.+)$/i);
    if (headerMatch) {
      if (current) competitors.push(current);
      current = {
        name: headerMatch[1].trim().replace(/^\[|\]$/g, ''),
        website: null,
        instagram: null,
        google_business: null,
        known_strengths: null,
        known_weaknesses: null,
        our_advantage: null,
      };
      continue;
    }

    if (!current) continue;

    // Parse fields within a competitor section
    current.website ??= parseField(line, 'website');
    current.instagram ??= parseField(line, 'instagram');
    current.google_business ??= parseField(line, 'google_business');
    current.known_strengths ??= parseField(line, 'known_strengths');
    current.known_weaknesses ??= parseField(line, 'known_weaknesses');
    current.our_advantage ??= parseField(line, 'our_advantage');
  }

  // Push the last competitor
  if (current) competitors.push(current);

  // Filter out unfilled template entries
  return competitors.filter(c =>
    c.name && !c.name.startsWith('[') &&
    (c.website || c.instagram)
  );
}
