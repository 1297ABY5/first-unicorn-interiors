import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.env.SOVEREIGN_DATA_DIR || join(import.meta.dirname, '..', '..');
const BUSINESSES_DIR = join(ROOT, 'businesses');

/**
 * Parse a markdown field line like "- **field:** value" and return the value.
 * Returns null if the line doesn't match or value is a template placeholder.
 */
function parseField(line, fieldName) {
  const pattern = new RegExp(`^\\s*-\\s*\\*\\*${fieldName}:\\*\\*\\s*(.+)$`, 'i');
  const match = line.match(pattern);
  if (!match) return null;
  const val = match[1].trim();
  // Filter out unfilled template placeholders
  if (val.startsWith('[') && val.endsWith(']')) return null;
  return val;
}

/**
 * Check if a line is a field label with no value (introduces a sub-list).
 * e.g. "- **pain_points:**" with nothing after the colon.
 */
function isListFieldLabel(line, fieldName) {
  const pattern = new RegExp(`^\\s*-\\s*\\*\\*${fieldName}:\\*\\*\\s*$`, 'i');
  return pattern.test(line);
}

/**
 * Read brand.md for a business — full config for content generation.
 */
export async function readBrandConfig(slug) {
  const filePath = join(BUSINESSES_DIR, slug, 'brand.md');
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  const config = {
    slug,
    identity: {
      business_name: null, tagline: null, industry: null,
      years_experience: null, website: null, phone: null, email: null,
    },
    cta: {
      primary: null, primary_url: null, secondary: null, secondary_url: null,
    },
    voice: {
      tone: [],
      spelling: null, banned_words: null, preferred_words: null,
    },
    emoji: { style: null, greeting: null, closing: null },
    visual: {
      primary_colour: null, accent_colour: null,
      font_heading: null, font_body: null,
      logo_file: null, logo_placement: null,
    },
    posting: {
      timezone: null, morning_post: null, evening_post: null,
      weekend_days: null, weekend_content_style: null,
    },
    consultation: {
      type: null, quote_type: null, specialist_title: null, response_time: null,
    },
    trust_signals: [],
    hashtags: { primary: [], secondary: [], location: [] },
    process_steps: [],
    team: { founder: null, members: [] },
  };

  let currentSection = null;
  let hashtagSub = null;

  for (const line of lines) {
    // Track ## sections
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      currentSection = h2[1].trim().toLowerCase();
      hashtagSub = null;
      continue;
    }

    // Track ### subsections (hashtags)
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      hashtagSub = h3[1].trim().toLowerCase();
      continue;
    }

    // --- Identity ---
    config.identity.business_name ??= parseField(line, 'business_name');
    config.identity.tagline ??= parseField(line, 'tagline');
    config.identity.industry ??= parseField(line, 'industry');
    config.identity.years_experience ??= parseField(line, 'years_experience');
    config.identity.website ??= parseField(line, 'website');
    config.identity.phone ??= parseField(line, 'phone');
    config.identity.email ??= parseField(line, 'email');

    // --- CTA ---
    config.cta.primary ??= parseField(line, 'cta_primary');
    config.cta.primary_url ??= parseField(line, 'cta_primary_url');
    config.cta.secondary ??= parseField(line, 'cta_secondary');
    config.cta.secondary_url ??= parseField(line, 'cta_secondary_url');

    // --- Voice ---
    for (let i = 1; i <= 4; i++) {
      const tone = parseField(line, `tone_${i}`);
      if (tone && !config.voice.tone.includes(tone)) config.voice.tone.push(tone);
    }
    config.voice.spelling ??= parseField(line, 'spelling');
    config.voice.banned_words ??= parseField(line, 'banned_words');
    config.voice.preferred_words ??= parseField(line, 'preferred_words');

    // --- Emoji ---
    config.emoji.style ??= parseField(line, 'emoji_style');
    config.emoji.greeting ??= parseField(line, 'greeting_emoji');
    config.emoji.closing ??= parseField(line, 'closing_emoji');

    // --- Visual ---
    config.visual.primary_colour ??= parseField(line, 'primary_colour');
    config.visual.accent_colour ??= parseField(line, 'accent_colour');
    config.visual.font_heading ??= parseField(line, 'font_heading');
    config.visual.font_body ??= parseField(line, 'font_body');
    config.visual.logo_file ??= parseField(line, 'logo_file');
    config.visual.logo_placement ??= parseField(line, 'logo_placement');

    // --- Posting ---
    config.posting.timezone ??= parseField(line, 'timezone');
    config.posting.morning_post ??= parseField(line, 'morning_post');
    config.posting.evening_post ??= parseField(line, 'evening_post');
    config.posting.weekend_days ??= parseField(line, 'weekend_days');
    config.posting.weekend_content_style ??= parseField(line, 'weekend_content_style');

    // --- Consultation ---
    config.consultation.type ??= parseField(line, 'consultation_type');
    config.consultation.quote_type ??= parseField(line, 'quote_type');
    config.consultation.specialist_title ??= parseField(line, 'specialist_title');
    config.consultation.response_time ??= parseField(line, 'response_time');

    // --- Team ---
    config.team.founder ??= parseField(line, 'founder');
    for (let i = 1; i <= 3; i++) {
      const member = parseField(line, `team_member_${i}`);
      if (member && !config.team.members.includes(member)) config.team.members.push(member);
    }

    // --- Trust Signals (numbered list under ## Trust Signals) ---
    if (currentSection?.includes('trust signal')) {
      const numMatch = line.match(/^\d+\.\s+(.+)$/);
      if (numMatch) {
        const val = numMatch[1].trim();
        if (!val.startsWith('[')) config.trust_signals.push(val);
      }
    }

    // --- Hashtags (lines under ### Primary/Secondary/Location) ---
    if (currentSection?.includes('hashtag') && hashtagSub) {
      const tags = line.match(/#[\w\-]+/g);
      if (tags) {
        if (hashtagSub.includes('primary')) config.hashtags.primary.push(...tags);
        else if (hashtagSub.includes('secondary')) config.hashtags.secondary.push(...tags);
        else if (hashtagSub.includes('location')) config.hashtags.location.push(...tags);
      }
    }

    // --- Process Steps (numbered list under ## Process Steps) ---
    if (currentSection?.includes('process step')) {
      const numMatch = line.match(/^\d+\.\s+(.+)$/);
      if (numMatch) {
        const val = numMatch[1].trim();
        if (!val.startsWith('[')) config.process_steps.push(val);
      }
    }
  }

  return config;
}

/**
 * Read services.md for a business. Returns array of service objects.
 */
export async function readServicesConfig(slug) {
  const filePath = join(BUSINESSES_DIR, slug, 'services.md');
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  const services = [];
  let current = null;

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+Service\s+\d+:\s*(.+)$/i);
    if (headerMatch) {
      if (current) services.push(current);
      current = {
        name: headerMatch[1].trim().replace(/^\[|\]$/g, ''),
        slug: null, description: null, price_range: null,
        timeline: null, includes: null, ideal_for: null,
      };
      continue;
    }

    if (!current) continue;

    current.slug ??= parseField(line, 'slug');
    current.description ??= parseField(line, 'description');
    current.price_range ??= parseField(line, 'price_range');
    current.timeline ??= parseField(line, 'timeline');
    current.includes ??= parseField(line, 'includes');
    current.ideal_for ??= parseField(line, 'ideal_for');
  }

  if (current) services.push(current);

  return services.filter(s => s.name && !s.name.startsWith('[') && s.slug);
}

/**
 * Read audiences.md for a business. Returns array of audience objects.
 */
export async function readAudiencesConfig(slug) {
  const filePath = join(BUSINESSES_DIR, slug, 'audiences.md');
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  const audiences = [];
  let current = null;
  let listField = null; // 'pain_points' | 'trigger_moments' | null

  for (const line of lines) {
    // New audience section
    const headerMatch = line.match(/^##\s+Audience\s+\d+:\s*(.+)$/i);
    if (headerMatch) {
      if (current) audiences.push(current);
      current = {
        name: headerMatch[1].trim().replace(/^\[|\]$/g, ''),
        profile: null, locations: null, budget_range: null,
        pain_points: [], trigger_moments: [],
        content_angle: null, platforms: null,
      };
      listField = null;
      continue;
    }

    // Stop collecting on non-audience ## headers
    if (line.match(/^##\s+/) && !line.match(/^##\s+Audience/i)) {
      if (current) { audiences.push(current); current = null; }
      listField = null;
      continue;
    }

    if (!current) continue;

    // Detect sub-list labels (field name with no value after it)
    if (isListFieldLabel(line, 'pain_points')) { listField = 'pain_points'; continue; }
    if (isListFieldLabel(line, 'trigger_moments')) { listField = 'trigger_moments'; continue; }

    // Collect indented list items for the active sub-list
    if (listField) {
      const itemMatch = line.match(/^\s+-\s+(.+)$/);
      if (itemMatch) {
        const val = itemMatch[1].trim();
        if (!val.startsWith('[')) current[listField].push(val);
        continue;
      }
    }

    // Regular fields — any match resets listField
    const profile = parseField(line, 'profile');
    if (profile) { current.profile = profile; listField = null; continue; }

    const locations = parseField(line, 'locations');
    if (locations) { current.locations = locations; listField = null; continue; }

    const budget = parseField(line, 'budget_range');
    if (budget) { current.budget_range = budget; listField = null; continue; }

    const angle = parseField(line, 'content_angle');
    if (angle) { current.content_angle = angle; listField = null; continue; }

    const platforms = parseField(line, 'platforms');
    if (platforms) { current.platforms = platforms; listField = null; continue; }
  }

  if (current) audiences.push(current);

  return audiences.filter(a => a.name && !a.name.startsWith('['));
}
