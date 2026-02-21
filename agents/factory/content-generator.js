import Anthropic from '@anthropic-ai/sdk';
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.env.SOVEREIGN_DATA_DIR || join(import.meta.dirname, '..', '..');
const BUSINESSES_DIR = join(ROOT, 'businesses');
const MODEL = process.env.FACTORY_MODEL || 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;

let client = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

// --- Trend loader ---

/**
 * Load latest trend intelligence from Scout.
 * Checks today first, then yesterday. Returns null if none found.
 */
async function loadLatestTrends(businessSlug) {
  const trendsDir = join(BUSINESSES_DIR, businessSlug, 'results', 'trends');
  const today = new Date();
  const dates = [
    today.toISOString().split('T')[0],
    new Date(today - 86400000).toISOString().split('T')[0],
  ];

  for (const date of dates) {
    const filePath = join(trendsDir, `${date}.json`);
    try {
      await access(filePath);
      const data = JSON.parse(await readFile(filePath, 'utf-8'));
      console.log(`  [generator] Loaded trend intelligence from ${date}`);
      return data;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Build a trend context block for injection into prompts.
 */
function buildTrendContext(trends) {
  if (!trends) return '';

  const parts = [];

  if (trends.recommended_angles?.length) {
    parts.push('TRENDING ANGLES (use one of these to make content timely):');
    trends.recommended_angles.forEach((a, i) => parts.push(`${i + 1}. ${typeof a === 'string' ? a : a.angle || JSON.stringify(a)}`));
  }

  if (trends.trending_topics?.length) {
    parts.push('\nTRENDING TOPICS:');
    trends.trending_topics.forEach(t => {
      const topic = typeof t === 'string' ? t : t.topic || '';
      const why = typeof t === 'string' ? '' : t.why_relevant ? ` — ${t.why_relevant}` : '';
      parts.push(`- ${topic}${why}`);
    });
  }

  if (trends.content_opportunities?.length) {
    parts.push('\nCONTENT OPPORTUNITIES:');
    trends.content_opportunities.forEach(c => {
      const title = typeof c === 'string' ? c : c.title || '';
      const format = c.format ? ` (${c.format})` : '';
      parts.push(`- ${title}${format}`);
    });
  }

  return parts.length > 0
    ? '\n\n' + parts.join('\n') + '\n\nIncorporate a trending angle into the content if it fits naturally. Do not force it.'
    : '';
}

// --- Darwin performance loader ---

/**
 * Load latest Darwin performance recommendations (past 7 days).
 */
async function loadLatestDarwin(businessSlug) {
  const darwinDir = join(BUSINESSES_DIR, businessSlug, 'results', 'darwin');
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today - i * 86400000).toISOString().split('T')[0];
    const filePath = join(darwinDir, `${date}.json`);
    try {
      await access(filePath);
      const data = JSON.parse(await readFile(filePath, 'utf-8'));
      console.log(`  [generator] Loaded Darwin insights from ${date}`);
      return data;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Build a Darwin context block for injection into prompts.
 */
function buildDarwinContext(darwin) {
  if (!darwin?.recommendations) return '';

  const r = darwin.recommendations;
  const parts = [
    'PERFORMANCE INSIGHTS FROM LAST WEEK (from Darwin analysis):',
  ];

  if (r.create_more) parts.push(`- Create more: ${r.create_more}`);
  if (r.stop_creating) parts.push(`- Stop creating: ${r.stop_creating}`);
  if (r.focus_audience) parts.push(`- Focus audience: ${r.focus_audience}`);
  if (r.focus_platform) parts.push(`- Focus platform: ${r.focus_platform}`);
  if (r.bold_experiment) parts.push(`- Bold experiment: ${r.bold_experiment}`);

  if (darwin.content_performance?.topics_that_resonate?.length) {
    parts.push(`- Topics that resonated: ${darwin.content_performance.topics_that_resonate.join(', ')}`);
  }

  parts.push('\nApply these insights where relevant. Prioritise the recommended content types and audience focus.');

  return '\n\n' + parts.join('\n');
}

// --- Prompt builders ---

function buildSystemPrompt(brand, services, audiences) {
  const tones = brand.voice.tone.length > 0
    ? brand.voice.tone.map(t => `- ${t}`).join('\n')
    : '- Professional and approachable';

  const trustList = brand.trust_signals.length > 0
    ? brand.trust_signals.map((s, i) => `${i + 1}. ${s}`).join('\n')
    : '(none configured)';

  const servicesSummary = services
    .map(s => `- ${s.name}: ${s.description || s.slug} | ${s.price_range || 'price TBD'} | Ideal for: ${s.ideal_for || 'all audiences'}`)
    .join('\n');

  const audiencesSummary = audiences.map(a => {
    const pains = a.pain_points.length > 0
      ? a.pain_points.map(p => `  - ${p}`).join('\n')
      : '  (none listed)';
    const triggers = a.trigger_moments.length > 0
      ? a.trigger_moments.map(t => `  - ${t}`).join('\n')
      : '  (none listed)';
    return `${a.name}:
  Content angle: ${a.content_angle || 'general'}
  Pain points:\n${pains}
  Trigger moments:\n${triggers}`;
  }).join('\n\n');

  const hashtags = [
    ...brand.hashtags.primary,
    ...brand.hashtags.secondary,
    ...brand.hashtags.location,
  ].join(' ') || '(none configured)';

  return `You are a social media content creator for ${brand.identity.business_name || brand.slug}.
You generate Instagram content following strict brand and playbook rules.
You MUST respond with valid JSON only. No markdown fences, no explanation, no preamble.

CONTENT RULES (non-negotiable):
- NEVER fabricate testimonials or reviews
- NEVER use competitor names in any content
- NEVER claim "guaranteed results" or "guaranteed ROI"
- NEVER create false scarcity ("only 1 slot left" when untrue)
- No political, religious, or controversial content
- Every post must have a clear CTA
- Include social proof naturally (numbers, locations, results)
- Specific always beats generic

BUSINESS IDENTITY:
Name: ${brand.identity.business_name || brand.slug}
Tagline: ${brand.identity.tagline || '(none)'}
Industry: ${brand.identity.industry || '(none)'}
Years Experience: ${brand.identity.years_experience || '(none)'}

VOICE & TONE:
${tones}
Spelling: ${brand.voice.spelling || 'American English'}
Banned words: ${brand.voice.banned_words || '(none)'}
Emoji style: ${brand.emoji.style || 'moderate'}

TRUST SIGNALS (weave naturally — do not force all into one post):
${trustList}

PRIMARY CTA: ${brand.cta.primary || 'Contact us'} → ${brand.cta.primary_url || '(no URL)'}
SECONDARY CTA: ${brand.cta.secondary || '(none)'}

HASHTAGS (use a mix from these):
${hashtags}

SERVICES:
${servicesSummary}

TARGET AUDIENCES:
${audiencesSummary}`;
}

function buildCarouselPrompt(assignment, brand, services, audiences) {
  const { service, audience } = selectFocus(services, audiences, assignment.day);
  return `Generate an Instagram carousel post for Day ${assignment.day} (${assignment.theme} theme).
Topic focus: ${assignment.subtheme}.
Feature this service: ${service.name} (${service.description || service.slug})
Target audience: ${audience.name} — angle: ${audience.content_angle || 'general'}

CAROUSEL RULES:
- Slide 1: Hook (bold statement or question — NEVER start with company name)
- Slide 2: Context (before state, pain point, problem, or surprising fact)
- Slides 3-5: Details (one element per slide, include specifics from the service)
- Slide 6: Reveal/Result (emotional language about the outcome)
- Slide 7: CTA

HOOK FORMATS (pick the best one for this topic):
1. Question: "When was the last time your [area] made you smile?"
2. Statement: "This [location] [area] hadn't been touched since [year]."
3. POV: "POV: Your [provider] actually [positive action]"
4. Statistic: "[X]% of [industry] projects go [negative]. Here's why."
5. Before/After: "Swipe to see what [timeline] can do →"
6. Controversy: "[Common belief] is overrated. There, I said it."
7. How-to: "How to [result] without [pain]"
8. Listicle: "[N] things to check before [action]"

CAPTION STRUCTURE:
- 2-3 sentence story in brand voice
- Specific detail (materials, technique, data, or problem solved)
- CTA: ${brand.cta.primary || 'Contact us'}
- Hashtags from the brand hashtag sets
- Location tag if relevant

Respond with this exact JSON structure:
{
  "content_type": "carousel",
  "day_number": ${assignment.day},
  "day_theme": "${assignment.theme}",
  "hook_format": "question|statement|pov|statistic|before_after|controversy|how_to|listicle",
  "target_audience": "${audience.name}",
  "service_focus": "${service.slug || service.name}",
  "slides": [
    { "slide_number": 1, "purpose": "hook", "text": "..." },
    { "slide_number": 2, "purpose": "context", "text": "..." },
    { "slide_number": 3, "purpose": "detail", "text": "..." },
    { "slide_number": 4, "purpose": "detail", "text": "..." },
    { "slide_number": 5, "purpose": "detail", "text": "..." },
    { "slide_number": 6, "purpose": "reveal", "text": "..." },
    { "slide_number": 7, "purpose": "cta", "text": "..." }
  ],
  "caption": {
    "story": "2-3 sentence story",
    "detail": "specific detail sentence",
    "cta": "CTA line",
    "hashtags": "#tag1 #tag2 ...",
    "location_tag": "location or empty string"
  },
  "visual_direction": {
    "slide_1_image": "description of ideal visual for hook slide",
    "overall_style": "branded_graphic|real_photo|mixed"
  }
}`;
}

function buildReelPrompt(assignment, brand, services, audiences) {
  const { service, audience } = selectFocus(services, audiences, assignment.day);
  return `Generate an Instagram Reel script for Day ${assignment.day} (${assignment.theme} theme).
Topic focus: ${assignment.subtheme}.
Feature this service: ${service.name} (${service.description || service.slug})
Target audience: ${audience.name} — angle: ${audience.content_angle || 'general'}

REEL STRUCTURE:
- 0-3s: Hook (text overlay — strongest visual or provocative claim)
- 3-8s: Before/context with voiceover
- 8-20s: Transformation/process sequence
- 20-28s: Reveal — slow reveal of finished result
- 28-30s: CTA text overlay + logo
- Voiceover: First person, brand voice, UNDER 80 WORDS total
- Text overlays: Max 5 words per overlay

Respond with this exact JSON structure:
{
  "content_type": "reel",
  "day_number": ${assignment.day},
  "day_theme": "${assignment.theme}",
  "target_audience": "${audience.name}",
  "service_focus": "${service.slug || service.name}",
  "hook_text": "max 5 words for opening text overlay",
  "scenes": [
    { "timestamp": "0-3s", "visual": "description", "text_overlay": "max 5 words", "voiceover": null },
    { "timestamp": "3-8s", "visual": "description", "text_overlay": null, "voiceover": "script line" },
    { "timestamp": "8-20s", "visual": "description", "text_overlay": "optional overlay", "voiceover": "script line" },
    { "timestamp": "20-28s", "visual": "description", "text_overlay": null, "voiceover": "script line" },
    { "timestamp": "28-30s", "visual": "logo + CTA", "text_overlay": "${brand.cta.primary || 'Contact us'}", "voiceover": null }
  ],
  "voiceover_full": "complete voiceover script as one paragraph",
  "voiceover_word_count": 0,
  "caption": {
    "story": "2-3 sentence story",
    "detail": "specific detail",
    "cta": "CTA line",
    "hashtags": "#tag1 #tag2 ...",
    "location_tag": "location or empty string"
  }
}`;
}

function buildStoryPrompt(assignment, brand, services, audiences) {
  const { service, audience } = selectFocus(services, audiences, assignment.day);
  const isEngagement = assignment.theme === 'Engagement';
  return `Generate an Instagram Story sequence for Day ${assignment.day} (${assignment.theme} theme).
Topic focus: ${assignment.subtheme}.
Feature this service: ${service.name} (${service.description || service.slug})
Target audience: ${audience.name}
${isEngagement ? 'This is an ENGAGEMENT day — use polls, A vs B, and interactive stickers.' : 'This is a BEHIND-THE-SCENES day — show process, team, work in progress.'}

STORY RULES:
- 3-7 stories per sequence
- Use polls, sliders, question stickers for engagement
- Behind-the-scenes and process content performs best
- ALWAYS include primary CTA link on the final story
- Primary CTA: ${brand.cta.primary || 'Contact us'} → ${brand.cta.primary_url || '(URL)'}

sticker_type options: "poll", "slider", "question", "quiz", "link", null
For "poll": sticker_config = { "question": "...", "options": ["A", "B"] }
For "slider": sticker_config = { "question": "...", "emoji": "emoji" }
For "question": sticker_config = { "prompt": "..." }
For "link": sticker_config = { "url": "...", "label": "..." }

Respond with this exact JSON structure:
{
  "content_type": "story_sequence",
  "day_number": ${assignment.day},
  "day_theme": "${assignment.theme}",
  "target_audience": "${audience.name}",
  "service_focus": "${service.slug || service.name}",
  "stories": [
    {
      "story_number": 1,
      "visual_description": "what the viewer sees",
      "text_overlay": "short text on screen",
      "sticker_type": "poll|slider|question|quiz|link|null",
      "sticker_config": { ... } or null
    }
  ]
}`;
}

function buildSingleImagePrompt(assignment, brand, services, audiences) {
  const { service, audience } = selectFocus(services, audiences, assignment.day);
  return `Generate an Instagram single-image post for Day ${assignment.day} (${assignment.theme} theme).
Topic focus: ${assignment.subtheme}.
Feature this service: ${service.name} (${service.description || service.slug})
Target audience: ${audience.name} — angle: ${audience.content_angle || 'general'}

This is a TRUST post. Options:
- Client review/testimonial graphic (use trust signals)
- Detail shot of work with educational text
- Differentiation post (why us vs industry standard)

IMAGE GUIDELINES:
- Real work photos for results, testimonials, proof
- AI-generated for inspiration, lifestyle only
- Branded graphics for stat posts, review cards

Respond with this exact JSON structure:
{
  "content_type": "single_image",
  "day_number": ${assignment.day},
  "day_theme": "${assignment.theme}",
  "target_audience": "${audience.name}",
  "service_focus": "${service.slug || service.name}",
  "image_direction": "review_graphic|detail_shot|differentiation",
  "image_description": "detailed description of the image to create or source",
  "text_overlay": "short text for the image if applicable, or null",
  "caption": {
    "story": "2-3 sentence story",
    "detail": "specific detail",
    "cta": "CTA line",
    "hashtags": "#tag1 #tag2 ...",
    "location_tag": "location or empty string"
  }
}`;
}

const PROMPT_BUILDERS = {
  carousel: buildCarouselPrompt,
  reel: buildReelPrompt,
  story: buildStoryPrompt,
  single_image: buildSingleImagePrompt,
};

/**
 * Select a service and audience to feature. Round-robin by day number.
 */
function selectFocus(services, audiences, dayNumber) {
  const service = services[(dayNumber - 1) % services.length];
  const audience = audiences.length > 0
    ? audiences[(dayNumber - 1) % audiences.length]
    : { name: 'General', content_angle: 'general', pain_points: [], trigger_moments: [] };
  return { service, audience };
}

/**
 * Generate content for a single assignment (day + content type) and business.
 */
export async function generateContent(assignment, brand, services, audiences) {
  const systemPrompt = buildSystemPrompt(brand, services, audiences);

  const buildUserPrompt = PROMPT_BUILDERS[assignment.type];
  if (!buildUserPrompt) throw new Error(`Unknown content type: ${assignment.type}`);
  let userPrompt = buildUserPrompt(assignment, brand, services, audiences);

  // Inject trend intelligence if available
  const trends = await loadLatestTrends(brand.slug);
  if (trends) {
    userPrompt += buildTrendContext(trends);
  }

  // Inject Darwin performance insights if available
  const darwin = await loadLatestDarwin(brand.slug);
  if (darwin) {
    userPrompt += buildDarwinContext(darwin);
  }

  const flags = [trends && 'trend', darwin && 'darwin'].filter(Boolean).join('+');
  console.log(`  [generator] Calling ${MODEL} for ${assignment.type}${flags ? ` (${flags}-informed)` : ''}...`);

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  // Extract text
  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  // Parse JSON — strip markdown fences if Claude adds them
  const cleaned = text.replace(/^```json?\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  let content;
  try {
    content = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error(`  [generator] JSON parse failed. Raw response:\n${text.slice(0, 500)}`);
    throw new Error(`Failed to parse Claude response as JSON: ${parseErr.message}`);
  }

  // Attach metadata
  content.metadata = {
    ...(content.metadata || {}),
    generated_at: new Date().toISOString(),
    model: MODEL,
    business_slug: brand.slug,
    trend_informed: !!trends,
    darwin_informed: !!darwin,
    input_tokens: response.usage?.input_tokens,
    output_tokens: response.usage?.output_tokens,
  };

  console.log(`  [generator] Generated ${assignment.type} (${response.usage?.output_tokens || '?'} tokens)`);
  return content;
}
