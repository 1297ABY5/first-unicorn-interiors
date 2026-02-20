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
  if (val.startsWith('[') && val.endsWith(']')) return null;
  return val;
}

/**
 * Check if a line is a field label with no value (introduces a sub-list).
 */
function isListFieldLabel(line, fieldName) {
  const pattern = new RegExp(`^\\s*-\\s*\\*\\*${fieldName}:\\*\\*\\s*$`, 'i');
  return pattern.test(line);
}

/**
 * Read brand.md — full config for content generation.
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
    consultation: {
      type: null, quote_type: null, specialist_title: null, response_time: null,
    },
    trust_signals: [],
    process_steps: [],
    team: { founder: null, members: [] },
  };

  let currentSection = null;

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) { currentSection = h2[1].trim().toLowerCase(); continue; }

    config.identity.business_name ??= parseField(line, 'business_name');
    config.identity.tagline ??= parseField(line, 'tagline');
    config.identity.industry ??= parseField(line, 'industry');
    config.identity.years_experience ??= parseField(line, 'years_experience');
    config.identity.website ??= parseField(line, 'website');
    config.identity.phone ??= parseField(line, 'phone');
    config.identity.email ??= parseField(line, 'email');

    config.cta.primary ??= parseField(line, 'cta_primary');
    config.cta.primary_url ??= parseField(line, 'cta_primary_url');
    config.cta.secondary ??= parseField(line, 'cta_secondary');
    config.cta.secondary_url ??= parseField(line, 'cta_secondary_url');

    for (let i = 1; i <= 4; i++) {
      const tone = parseField(line, `tone_${i}`);
      if (tone && !config.voice.tone.includes(tone)) config.voice.tone.push(tone);
    }
    config.voice.spelling ??= parseField(line, 'spelling');
    config.voice.banned_words ??= parseField(line, 'banned_words');
    config.voice.preferred_words ??= parseField(line, 'preferred_words');

    config.emoji.style ??= parseField(line, 'emoji_style');
    config.emoji.greeting ??= parseField(line, 'greeting_emoji');
    config.emoji.closing ??= parseField(line, 'closing_emoji');

    config.consultation.type ??= parseField(line, 'consultation_type');
    config.consultation.quote_type ??= parseField(line, 'quote_type');
    config.consultation.specialist_title ??= parseField(line, 'specialist_title');
    config.consultation.response_time ??= parseField(line, 'response_time');

    config.team.founder ??= parseField(line, 'founder');
    for (let i = 1; i <= 3; i++) {
      const member = parseField(line, `team_member_${i}`);
      if (member && !config.team.members.includes(member)) config.team.members.push(member);
    }

    if (currentSection?.includes('trust signal')) {
      const numMatch = line.match(/^\d+\.\s+(.+)$/);
      if (numMatch) {
        const val = numMatch[1].trim();
        if (!val.startsWith('[')) config.trust_signals.push(val);
      }
    }

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
 * Read services.md — returns array of service objects.
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
 * Read audiences.md — returns array of audience objects.
 */
export async function readAudiencesConfig(slug) {
  const filePath = join(BUSINESSES_DIR, slug, 'audiences.md');
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  const audiences = [];
  let current = null;
  let listField = null;

  for (const line of lines) {
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

    if (line.match(/^##\s+/) && !line.match(/^##\s+Audience/i)) {
      if (current) { audiences.push(current); current = null; }
      listField = null;
      continue;
    }

    if (!current) continue;

    if (isListFieldLabel(line, 'pain_points')) { listField = 'pain_points'; continue; }
    if (isListFieldLabel(line, 'trigger_moments')) { listField = 'trigger_moments'; continue; }

    if (listField) {
      const itemMatch = line.match(/^\s+-\s+(.+)$/);
      if (itemMatch) {
        const val = itemMatch[1].trim();
        if (!val.startsWith('[')) current[listField].push(val);
        continue;
      }
    }

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

/**
 * Read targets.md — lead management config, source/service scores, escalation.
 */
export async function readTargetsConfig(slug) {
  const filePath = join(BUSINESSES_DIR, slug, 'targets.md');
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  const config = {
    max_followups: 4,
    followup_gap_hours: 24,
    cooldown_days: 90,
    hot_threshold: 80,
    warm_threshold: 50,
    escalation_channel: null,
    escalation_contact: null,
    source_scores: {},
    service_scores: {},
  };

  // Map readable source names to lead JSON source values
  const SOURCE_NAME_MAP = {
    'referral': 'referral',
    'organic inbound (whatsapp/dm)': 'organic_inbound',
    'organic inbound': 'organic_inbound',
    'paid ad click → cta': 'paid_ad',
    'paid ad click -> cta': 'paid_ad',
    'paid ad': 'paid_ad',
    'social dm (organic)': 'social_dm',
    'social dm': 'social_dm',
    'ad → form fill': 'paid_ad',
    'ad -> form fill': 'paid_ad',
    'website form': 'website_form',
    'cold outreach reply': 'cold_outreach',
    'cold outreach': 'cold_outreach',
    'scraped listing': 'scraped',
    'scraped': 'scraped',
  };

  let currentSection = null;
  let inTable = false;

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      currentSection = h2[1].trim().toLowerCase();
      inTable = false;
      continue;
    }

    // Scalar fields
    const maxF = parseField(line, 'max_followups');
    if (maxF) { config.max_followups = parseInt(maxF, 10) || 4; continue; }

    const gapH = parseField(line, 'followup_gap_hours');
    if (gapH) { config.followup_gap_hours = parseInt(gapH, 10) || 24; continue; }

    const coolD = parseField(line, 'cooldown_days');
    if (coolD) { config.cooldown_days = parseInt(coolD, 10) || 90; continue; }

    const hotT = parseField(line, 'hot_threshold');
    if (hotT) { config.hot_threshold = parseInt(hotT, 10) || 80; continue; }

    const warmT = parseField(line, 'warm_threshold');
    if (warmT) { config.warm_threshold = parseInt(warmT, 10) || 50; continue; }

    config.escalation_channel ??= parseField(line, 'escalation_channel');
    config.escalation_contact ??= parseField(line, 'escalation_contact');

    // Parse markdown tables for source/service scores
    if (currentSection?.includes('source scores')) {
      // Skip header separator lines
      if (line.match(/^\|[\s-|]+\|$/)) { inTable = true; continue; }
      // Skip table header
      if (line.match(/^\|\s*Source\s*\|/i)) { continue; }
      // Parse table rows
      const rowMatch = line.match(/^\|\s*(.+?)\s*\|\s*(\d+)\s*\|$/);
      if (rowMatch && inTable) {
        const sourceName = rowMatch[1].trim().toLowerCase();
        const score = parseInt(rowMatch[2], 10);
        // Map to canonical source name
        const key = SOURCE_NAME_MAP[sourceName] || sourceName.replace(/\s+/g, '_');
        config.source_scores[key] = score;
      }
    }

    if (currentSection?.includes('service scores')) {
      if (line.match(/^\|[\s-|]+\|$/)) { inTable = true; continue; }
      if (line.match(/^\|\s*Service\s*\|/i)) { continue; }
      const rowMatch = line.match(/^\|\s*(.+?)\s*\|\s*(\d+)\s*\|$/);
      if (rowMatch && inTable) {
        const serviceName = rowMatch[1].trim();
        if (serviceName.startsWith('[')) continue; // template placeholder
        const score = parseInt(rowMatch[2], 10);
        // Use lowercase slug-like key
        const key = serviceName.toLowerCase().replace(/\s+/g, '-');
        config.service_scores[key] = score;
      }
    }
  }

  return config;
}

/**
 * Read locations.md — tier lists for lead scoring.
 */
export async function readLocationsConfig(slug) {
  const filePath = join(BUSINESSES_DIR, slug, 'locations.md');
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  const config = {
    tier_1: [],
    tier_2: [],
    tier_3: [],
  };

  let currentTier = null;

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      const section = h2[1].trim().toLowerCase();
      if (section.includes('tier 1')) currentTier = 'tier_1';
      else if (section.includes('tier 2')) currentTier = 'tier_2';
      else if (section.includes('tier 3')) currentTier = 'tier_3';
      else currentTier = null;
      continue;
    }

    if (!currentTier) continue;

    const itemMatch = line.match(/^-\s+(.+)$/);
    if (itemMatch) {
      const val = itemMatch[1].trim();
      if (!val.startsWith('[')) config[currentTier].push(val);
    }
  }

  return config;
}
