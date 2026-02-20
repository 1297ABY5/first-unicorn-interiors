import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.env.SOVEREIGN_DATA_DIR || join(import.meta.dirname, '..', '..');
const MODEL = process.env.PHOENIX_MODEL || 'claude-sonnet-4-6';
const MAX_TOKENS = 2048;

let client = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

/**
 * Load the follow-up sequences playbook text.
 */
let playbookCache = null;
async function loadPlaybook() {
  if (playbookCache) return playbookCache;
  const filePath = join(ROOT, 'playbooks', 'conversion', 'follow-up-sequences.md');
  playbookCache = await readFile(filePath, 'utf-8');
  return playbookCache;
}

/**
 * Build system prompt with business context and guardrails.
 */
function buildSystemPrompt(brand, services, audiences) {
  const tones = brand.voice.tone.length > 0
    ? brand.voice.tone.map(t => `- ${t}`).join('\n')
    : '- Professional and approachable';

  const trustList = brand.trust_signals.length > 0
    ? brand.trust_signals.map((s, i) => `${i + 1}. ${s}`).join('\n')
    : '(none configured)';

  const servicesSummary = services
    .map(s => `- ${s.name}: ${s.description || s.slug} | ${s.price_range || 'price TBD'} | Timeline: ${s.timeline || 'TBD'}`)
    .join('\n');

  const audiencesSummary = audiences.map(a => {
    const pains = a.pain_points.length > 0
      ? a.pain_points.map(p => `  - ${p}`).join('\n')
      : '  (none listed)';
    return `${a.name}:\n  Pain points:\n${pains}`;
  }).join('\n');

  return `You are a lead follow-up specialist for ${brand.identity.business_name || 'the business'}.

## Your Role
Generate personalised follow-up messages for leads. Each message must feel hand-written, specific to the lead's situation, and match the business voice.

## Business Identity
- Name: ${brand.identity.business_name || 'N/A'}
- Industry: ${brand.identity.industry || 'N/A'}
- Tagline: ${brand.identity.tagline || 'N/A'}
- Experience: ${brand.identity.years_experience || 'N/A'}
- Phone: ${brand.identity.phone || 'N/A'}
- Website: ${brand.identity.website || 'N/A'}

## Voice & Tone
${tones}
- Spelling: ${brand.voice.spelling || 'British English'}
${brand.voice.banned_words ? `- BANNED words: ${brand.voice.banned_words}` : ''}
${brand.voice.preferred_words ? `- Preferred words: ${brand.voice.preferred_words}` : ''}

## Emoji Style
- Style: ${brand.emoji.style || 'moderate'}
- Greeting: ${brand.emoji.greeting || '👋'}
- Closing: ${brand.emoji.closing || '🙏'}

## CTA
- Primary: ${brand.cta.primary || 'Get in touch'}
- Secondary: ${brand.cta.secondary || 'Visit website'}

## Trust Signals
${trustList}

## Services
${servicesSummary}

## Audiences
${audiencesSummary}

## Consultation
- Type: ${brand.consultation.type || 'consultation'}
- Quote type: ${brand.consultation.quote_type || 'quote'}
- Specialist: ${brand.consultation.specialist_title || 'team member'}
- Response time: ${brand.consultation.response_time || 'within 24 hours'}

## Process Steps
${brand.process_steps.length > 0 ? brand.process_steps.map((s, i) => `${i + 1}. ${s}`).join('\n') : '(none configured)'}

## Team
- Founder: ${brand.team.founder || brand.identity.business_name || 'the team'}
${brand.team.members.length > 0 ? brand.team.members.map(m => `- ${m}`).join('\n') : ''}

## GUARDRAILS — STRICT
1. NEVER fabricate testimonials, reviews, or case studies
2. NEVER commit to specific pricing or timelines — offer to discuss
3. NEVER pretend to be a human — identify as the business, not an individual (unless using a team member name)
4. NEVER use competitor names
5. Keep WhatsApp messages under 300 words
6. Keep email messages under 500 words
7. Always include a clear but non-pushy CTA
8. Match the emoji style setting — do not over-use emojis`;
}

/**
 * Build user prompt for a specific sequence + message number.
 */
async function buildUserPrompt(lead, sequence, messageNumber, playbook) {
  const priorMessages = lead.prior_messages
    ? `\nPrior messages sent:\n${lead.prior_messages.map((m, i) => `  ${i + 1}. [${m.sequence} #${m.message_number}] ${m.message_text?.slice(0, 100)}...`).join('\n')}`
    : '';

  return `Generate a follow-up message for this lead.

## Lead Context
- Name: ${lead.name || 'there'}
- Service interest: ${lead.service_interest || 'general enquiry'}
- Location: ${lead.location || 'not specified'}
- Source: ${lead.source || 'unknown'}
- Channel: ${lead.channel || 'whatsapp'}
- Urgency: ${lead.urgency || 'exploring'}
- Score: ${lead.score || 0} (${lead.tier || 'unscored'})
- Original message: "${lead.message || 'No message provided'}"
${priorMessages}

## Sequence & Stage
- Sequence: ${sequence}
- Message number: ${messageNumber}

## Playbook Reference
${playbook}

## Instructions
1. Write a message for ${sequence} sequence, message #${messageNumber}
2. Personalise using the lead's name, service interest, and location
3. Match the business voice and tone exactly
4. Use the playbook templates as guidance but make it feel natural and personal
5. For WhatsApp/DM: keep it conversational, under 300 words
6. For email: include a subject line, keep body under 500 words
7. Return ONLY valid JSON in this exact schema:

{
  "message_text": "The complete message ready to send",
  "subject_line": "Email subject line or null for WhatsApp/DM",
  "channel": "${lead.channel || 'whatsapp'}",
  "tone": "warm|professional|casual",
  "variables_used": ["name", "service", "location"],
  "sequence": "${sequence}",
  "message_number": ${messageNumber}
}`;
}

/**
 * Generate a personalised follow-up message for a lead.
 */
export async function generateFollowUp(lead, sequence, messageNumber, brand, services, audiences) {
  const playbook = await loadPlaybook();
  const systemPrompt = buildSystemPrompt(brand, services, audiences);
  const userPrompt = await buildUserPrompt(lead, sequence, messageNumber, playbook);

  console.log(`  [phoenix] Calling ${MODEL} for ${sequence} #${messageNumber} → ${lead.name || lead.lead_id}...`);

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  const cleaned = text.replace(/^```json?\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  let result;
  try {
    result = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error(`  [phoenix] JSON parse failed. Raw response:\n${text.slice(0, 500)}`);
    throw new Error(`Failed to parse Claude response as JSON: ${parseErr.message}`);
  }

  // Ensure required fields
  result.sequence = sequence;
  result.message_number = messageNumber;
  result.channel = result.channel || lead.channel || 'whatsapp';
  result.lead_id = lead.lead_id;
  result.business = brand.slug;
  result.generated_at = new Date().toISOString();
  result.model = MODEL;
  result.status = 'pending_send';
  result.subject_line = result.subject_line || null;
  result.variables_used = result.variables_used || [];

  console.log(`  [phoenix] Generated ${sequence} #${messageNumber} (${response.usage?.output_tokens || '?'} tokens)`);
  return result;
}
