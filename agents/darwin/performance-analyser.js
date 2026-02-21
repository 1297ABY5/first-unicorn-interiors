import Anthropic from '@anthropic-ai/sdk';
import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.env.SOVEREIGN_DATA_DIR || join(import.meta.dirname, '..', '..');
const BUSINESSES_DIR = join(ROOT, 'businesses');
const MODEL = process.env.DARWIN_MODEL || 'claude-sonnet-4-6';
const LOOKBACK_DAYS = 7;

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000);
}

function isRecent(filename, afterDate) {
  // Extract date from filename patterns like "2026-02-21.json" or timestamps like "T22-04-26Z"
  const isoMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return new Date(isoMatch[1]) >= afterDate;
  }
  return true; // include if we can't determine date
}

/**
 * Read all recent JSON files from a directory.
 */
async function loadRecentJsonFiles(dir, afterDate) {
  try {
    const files = await readdir(dir);
    const results = [];
    for (const f of files.sort().reverse()) {
      if (!f.endsWith('.json')) continue;
      if (!isRecent(f, afterDate)) continue;
      try {
        const data = JSON.parse(await readFile(join(dir, f), 'utf-8'));
        results.push({ filename: f, data });
      } catch { /* skip corrupt files */ }
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Load content history from the past 7 days.
 */
export async function loadContentHistory(slug) {
  const dir = join(BUSINESSES_DIR, slug, 'results', 'content');
  const cutoff = daysAgo(LOOKBACK_DAYS);
  const files = await loadRecentJsonFiles(dir, cutoff);
  console.log(`  [darwin] Content history: ${files.length} pieces from past ${LOOKBACK_DAYS} days`);
  return files;
}

/**
 * Load lead history from the past 7 days.
 */
export async function loadLeadHistory(slug) {
  const dir = join(BUSINESSES_DIR, slug, 'results', 'leads');
  const cutoff = daysAgo(LOOKBACK_DAYS);

  // Load lead records
  const leads = await loadRecentJsonFiles(dir, cutoff);

  // Load messages
  const messagesDir = join(dir, 'messages');
  const messages = await loadRecentJsonFiles(messagesDir, cutoff);

  // Load processed inbox items
  const processedDir = join(dir, 'processed');
  const processed = await loadRecentJsonFiles(processedDir, cutoff);

  const total = leads.length + messages.length + processed.length;
  console.log(`  [darwin] Lead history: ${leads.length} leads, ${messages.length} messages, ${processed.length} processed`);
  return { leads, messages, processed };
}

/**
 * Load trend history from the past 7 days.
 */
export async function loadTrendHistory(slug) {
  const dir = join(BUSINESSES_DIR, slug, 'results', 'trends');
  const cutoff = daysAgo(LOOKBACK_DAYS);
  const files = await loadRecentJsonFiles(dir, cutoff);
  console.log(`  [darwin] Trend history: ${files.length} reports from past ${LOOKBACK_DAYS} days`);
  return files;
}

/**
 * Build a compact summary of data for the Claude prompt.
 */
function buildDataSummary(content, leads, trends) {
  const parts = [];

  // Content summary
  if (content.length > 0) {
    parts.push('## Content Generated This Week');
    for (const item of content) {
      const d = item.data;
      const type = d.content_type || 'unknown';
      const day = d.day_number || '?';
      const theme = d.day_theme || '';
      const audience = d.target_audience || '';
      const service = d.service_focus || '';
      const trendInformed = d.metadata?.trend_informed ? ' [trend-informed]' : '';
      parts.push(`- Day ${day}: ${type} | Theme: ${theme} | Audience: ${audience} | Service: ${service}${trendInformed}`);

      // Include hook/caption for context
      if (d.hook_text) parts.push(`  Hook: "${d.hook_text}"`);
      if (d.slides?.[0]?.text) parts.push(`  Hook: "${d.slides[0].text.slice(0, 100)}"`);
      if (d.caption?.story) parts.push(`  Caption: "${d.caption.story.slice(0, 150)}..."`);
    }
  } else {
    parts.push('## Content Generated This Week\nNo content generated this week.');
  }

  // Lead summary
  parts.push('\n## Lead Activity This Week');
  if (leads.leads.length > 0) {
    const tiers = {};
    const sources = {};
    const services = {};
    for (const item of leads.leads) {
      const l = item.data;
      tiers[l.tier || 'unknown'] = (tiers[l.tier || 'unknown'] || 0) + 1;
      sources[l.source || 'unknown'] = (sources[l.source || 'unknown'] || 0) + 1;
      services[l.service_interest || 'general'] = (services[l.service_interest || 'general'] || 0) + 1;
    }
    parts.push(`Total leads: ${leads.leads.length}`);
    parts.push(`By tier: ${JSON.stringify(tiers)}`);
    parts.push(`By source: ${JSON.stringify(sources)}`);
    parts.push(`By service: ${JSON.stringify(services)}`);
    parts.push(`Messages sent: ${leads.messages.length}`);
  } else {
    parts.push('No leads received this week.');
  }

  // Trend summary
  if (trends.length > 0) {
    parts.push('\n## Trend Intelligence This Week');
    for (const item of trends) {
      const t = item.data;
      parts.push(`Date: ${item.filename}`);
      if (t.trending_topics?.length) {
        parts.push('Trending topics:');
        t.trending_topics.forEach(topic => {
          const name = typeof topic === 'string' ? topic : topic.topic;
          parts.push(`  - ${name}`);
        });
      }
      if (t.recommended_angles?.length) {
        parts.push('Recommended angles:');
        t.recommended_angles.forEach(a => {
          parts.push(`  - ${typeof a === 'string' ? a.slice(0, 120) : (a.angle || '').slice(0, 120)}`);
        });
      }
    }
  }

  return parts.join('\n');
}

/**
 * Main analysis function — loads all data sources, sends to Claude, saves report.
 */
export async function analysePerformance(slug) {
  console.log(`  [${slug}] Running Darwin performance analysis...`);

  // Load all data sources
  const content = await loadContentHistory(slug);
  const leads = await loadLeadHistory(slug);
  const trends = await loadTrendHistory(slug);

  // Read brand name
  let businessName = slug;
  try {
    const brandFile = await readFile(join(BUSINESSES_DIR, slug, 'brand.md'), 'utf-8');
    const nameMatch = brandFile.match(/\*\*business_name:\*\*\s*(.+)/i);
    if (nameMatch) businessName = nameMatch[1].trim();
  } catch { /* use slug */ }

  const dataSummary = buildDataSummary(content, leads, trends);

  // Send to Claude for analysis
  const client = new Anthropic();
  console.log(`  [darwin] Analysing with ${MODEL}...`);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: `You are a digital marketing performance analyst for ${businessName}. You analyse weekly marketing data and provide actionable recommendations. Respond with valid JSON only — no markdown fences, no explanation.`,
    messages: [{
      role: 'user',
      content: `Analyse the past week's marketing data for ${businessName} and provide a JSON response with these exact fields:

1. content_performance: { summary: string, top_performing_types: string[], topics_that_resonate: string[], content_variety_score: "excellent"|"good"|"needs_improvement" }
2. trend_accuracy: { summary: string, accurate_predictions: string[], missed_opportunities: string[] }
3. lead_quality: { summary: string, total_leads: number, hot_leads: number, top_sources: string[], top_services: string[] }
4. recommendations: {
     create_more: string (specific content types/topics to increase),
     stop_creating: string (what to deprioritise or stop),
     focus_audience: string (which audience segment to focus on next week),
     focus_platform: string (which platform to prioritise),
     bold_experiment: string (one creative experiment to try)
   }
5. config_adjustments: string[] (suggested changes to business config — targeting, messaging, posting times, etc. Empty array if no changes needed)
6. weekly_grade: "A"|"B"|"C"|"D" (overall grade for the week's marketing performance)
7. one_line_summary: string (one sentence summary of the week)

Here is the data:

${dataSummary}`,
    }],
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  const cleaned = text.replace(/^```json?\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  let analysis;
  try {
    analysis = JSON.parse(cleaned);
  } catch (err) {
    console.error(`  [darwin] JSON parse failed: ${err.message}`);
    console.error(`  [darwin] Raw: ${text.slice(0, 300)}`);
    return null;
  }

  // Add metadata
  analysis.metadata = {
    business: slug,
    generated_at: new Date().toISOString(),
    model: MODEL,
    data_window_days: LOOKBACK_DAYS,
    content_pieces_analysed: content.length,
    leads_analysed: leads.leads.length,
    trend_reports_analysed: trends.length,
    input_tokens: response.usage?.input_tokens,
    output_tokens: response.usage?.output_tokens,
  };

  // Save JSON report
  const today = new Date().toISOString().split('T')[0];
  const dir = join(BUSINESSES_DIR, slug, 'results', 'darwin');
  await mkdir(dir, { recursive: true });
  const jsonPath = join(dir, `${today}.json`);
  await writeFile(jsonPath, JSON.stringify(analysis, null, 2), 'utf-8');
  console.log(`  [darwin] Saved analysis → darwin/${today}.json`);

  return analysis;
}

/**
 * Generate a human-readable weekly markdown report.
 */
export async function generateWeeklyReport(slug) {
  // Load latest Darwin analysis
  const today = new Date().toISOString().split('T')[0];
  const dir = join(BUSINESSES_DIR, slug, 'results', 'darwin');
  let analysis;

  try {
    analysis = JSON.parse(await readFile(join(dir, `${today}.json`), 'utf-8'));
  } catch {
    console.log(`  [darwin] No analysis found for today — run analysis first`);
    return null;
  }

  let businessName = slug;
  try {
    const brandFile = await readFile(join(BUSINESSES_DIR, slug, 'brand.md'), 'utf-8');
    const nameMatch = brandFile.match(/\*\*business_name:\*\*\s*(.+)/i);
    if (nameMatch) businessName = nameMatch[1].trim();
  } catch { /* use slug */ }

  const r = analysis.recommendations || {};
  const cp = analysis.content_performance || {};
  const lq = analysis.lead_quality || {};
  const ta = analysis.trend_accuracy || {};
  const grade = analysis.weekly_grade || '?';

  const lines = [
    `# Weekly Performance Report — ${businessName}`,
    `**Week ending:** ${today}`,
    `**Grade:** ${grade}`,
    `**Summary:** ${analysis.one_line_summary || 'No summary available.'}`,
    ``,
    `---`,
    ``,
    `## Content Performance`,
    cp.summary || 'No data.',
    ``,
    `**Top performing types:** ${(cp.top_performing_types || []).join(', ') || 'N/A'}`,
    `**Topics that resonate:** ${(cp.topics_that_resonate || []).join(', ') || 'N/A'}`,
    `**Content variety:** ${cp.content_variety_score || 'N/A'}`,
    ``,
    `## Trend Accuracy`,
    ta.summary || 'No data.',
    ``,
    `**Accurate predictions:** ${(ta.accurate_predictions || []).join(', ') || 'None tracked'}`,
    `**Missed opportunities:** ${(ta.missed_opportunities || []).join(', ') || 'None identified'}`,
    ``,
    `## Lead Quality`,
    lq.summary || 'No data.',
    ``,
    `- Total leads: ${lq.total_leads ?? 0}`,
    `- Hot leads: ${lq.hot_leads ?? 0}`,
    `- Top sources: ${(lq.top_sources || []).join(', ') || 'N/A'}`,
    `- Top services: ${(lq.top_services || []).join(', ') || 'N/A'}`,
    ``,
    `## Recommendations for Next Week`,
    ``,
    `**Create more:** ${r.create_more || 'N/A'}`,
    ``,
    `**Stop creating:** ${r.stop_creating || 'N/A'}`,
    ``,
    `**Focus audience:** ${r.focus_audience || 'N/A'}`,
    ``,
    `**Focus platform:** ${r.focus_platform || 'N/A'}`,
    ``,
    `**Bold experiment:** ${r.bold_experiment || 'N/A'}`,
    ``,
    `## Config Adjustments`,
    ...(analysis.config_adjustments?.length
      ? analysis.config_adjustments.map(a => `- ${a}`)
      : ['- No changes recommended this week.']),
    ``,
    `---`,
    `*Generated by Darwin at ${analysis.metadata?.generated_at || 'unknown'}*`,
  ];

  const mdPath = join(dir, `weekly-${today}.md`);
  await writeFile(mdPath, lines.join('\n'), 'utf-8');
  console.log(`  [darwin] Saved weekly report → darwin/weekly-${today}.md`);

  return { path: mdPath, content: lines.join('\n'), analysis };
}

/**
 * Load the latest Darwin recommendations for Factory integration.
 * Checks past 7 days.
 */
export async function loadLatestDarwinReport(slug) {
  const dir = join(BUSINESSES_DIR, slug, 'results', 'darwin');
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today - i * 86400000).toISOString().split('T')[0];
    const filePath = join(dir, `${date}.json`);
    try {
      await access(filePath);
      return JSON.parse(await readFile(filePath, 'utf-8'));
    } catch {
      continue;
    }
  }
  return null;
}
