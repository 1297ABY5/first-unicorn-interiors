import TelegramBot from 'node-telegram-bot-api';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.env.SOVEREIGN_DATA_DIR || join(import.meta.dirname, '..');
const BUSINESSES_DIR = join(ROOT, 'businesses');

let bot = null;

function getBot() {
  if (bot) return bot;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  bot = new TelegramBot(token);
  return bot;
}

function getChatId() {
  return process.env.TELEGRAM_CHAT_ID || null;
}

/**
 * Send a plain text alert to the Commander chat.
 * Gracefully no-ops if token or chat ID are missing.
 */
export async function sendAlert(message) {
  const b = getBot();
  const chatId = getChatId();
  if (!b || !chatId) {
    console.log('[telegram] Skipping alert — TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
    return false;
  }
  try {
    await b.sendMessage(chatId, message, { parse_mode: 'HTML' });
    console.log('[telegram] Alert sent');
    return true;
  } catch (err) {
    console.error(`[telegram] Failed to send alert: ${err.message}`);
    return false;
  }
}

/**
 * Send a hot lead alert to Commander.
 */
export async function sendHotLeadAlert(lead, brand) {
  const businessName = brand?.identity?.business_name || lead.business || 'Unknown';
  const msg = [
    `🔥 <b>HOT LEAD</b> — ${businessName}`,
    ``,
    `<b>Name:</b> ${lead.name || 'Unknown'}`,
    `<b>Phone:</b> ${lead.phone || 'N/A'}`,
    `<b>Service:</b> ${lead.service_interest || 'General'}`,
    `<b>Location:</b> ${lead.location || 'Not specified'}`,
    `<b>Score:</b> ${lead.score} (${lead.tier})`,
    `<b>Urgency:</b> ${lead.urgency || 'Unknown'}`,
    `<b>Sequence:</b> ${lead.sequence}`,
    ``,
    `<b>Message:</b> "${(lead.message || '').slice(0, 200)}"`,
    ``,
    `Auto-reply queued ✅`,
  ].join('\n');

  return sendAlert(msg);
}

/**
 * Count files matching a pattern in a directory, created after a given date.
 */
async function countRecentFiles(dir, afterDate) {
  try {
    const files = await readdir(dir);
    let count = 0;
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const s = await stat(join(dir, f));
        if (s.mtime >= afterDate) count++;
      } catch { /* skip */ }
    }
    return count;
  } catch {
    return 0;
  }
}

/**
 * Count lead records with a specific tier, created after a given date.
 */
async function countLeadsByTier(leadsDir, tier, afterDate) {
  try {
    const files = await readdir(leadsDir);
    let count = 0;
    for (const f of files) {
      if (!f.endsWith('.json') || f.startsWith('.')) continue;
      try {
        const content = await readFile(join(leadsDir, f), 'utf-8');
        const lead = JSON.parse(content);
        if (lead.lead_id && (!tier || lead.tier === tier)) {
          const created = new Date(lead.created_at || lead.updated_at || 0);
          if (created >= afterDate) count++;
        }
      } catch { /* skip */ }
    }
    return count;
  } catch {
    return 0;
  }
}

/**
 * Check for high-urgency competitor intel created after a given date.
 */
async function getRecentCompetitorAlerts(intelDir, afterDate) {
  const alerts = [];
  try {
    const files = await readdir(intelDir);
    for (const f of files.sort().reverse().slice(0, 3)) {
      if (!f.endsWith('.json')) continue;
      try {
        const s = await stat(join(intelDir, f));
        if (s.mtime < afterDate) continue;
        const content = await readFile(join(intelDir, f), 'utf-8');
        const data = JSON.parse(content);
        const records = Array.isArray(data) ? data : data.records || [];
        for (const r of records) {
          if (r.urgency === 'high') {
            alerts.push(`⚠️ ${r.competitor}: ${(r.observation || '').slice(0, 100)}`);
          }
        }
      } catch { /* skip */ }
    }
  } catch { /* no intel dir */ }
  return alerts;
}

/**
 * Send the daily morning briefing to Commander.
 * Summarises leads, content, and competitor intel from the past 24 hours.
 */
export async function sendMorningBriefing() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const entries = await readdir(BUSINESSES_DIR, { withFileTypes: true }).catch(() => []);
  const businesses = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name);

  if (businesses.length === 0) {
    return sendAlert('☀️ <b>Morning Briefing</b>\n\nNo businesses configured yet.');
  }

  const sections = [];
  let totalLeads = 0;
  let totalHot = 0;
  let totalContent = 0;
  const allAlerts = [];

  for (const slug of businesses) {
    const base = join(BUSINESSES_DIR, slug);
    const leadsDir = join(base, 'results', 'leads');
    const contentDir = join(base, 'results', 'content');
    const intelDir = join(base, 'results', 'competitor-intel');

    const leads = await countRecentFiles(join(leadsDir, 'processed'), since)
                + await countRecentFiles(join(leadsDir, 'inbox'), since);
    const hot = await countLeadsByTier(leadsDir, 'hot', since);
    const content = await countRecentFiles(contentDir, since);
    const alerts = await getRecentCompetitorAlerts(intelDir, since);

    totalLeads += leads;
    totalHot += hot;
    totalContent += content;
    allAlerts.push(...alerts);

    if (leads > 0 || content > 0 || alerts.length > 0) {
      sections.push(
        `<b>${slug}</b>: ${leads} lead(s)${hot > 0 ? ` (${hot} 🔥)` : ''}, ${content} content, ${alerts.length} alert(s)`
      );
    }
  }

  const date = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
    timeZone: 'Asia/Dubai',
  });

  const lines = [
    `☀️ <b>Morning Briefing — ${date}</b>`,
    ``,
    `📊 <b>Last 24 hours</b>`,
    `• Leads received: ${totalLeads}${totalHot > 0 ? ` (${totalHot} hot 🔥)` : ''}`,
    `• Content generated: ${totalContent}`,
    `• Competitor alerts: ${allAlerts.length}`,
  ];

  if (sections.length > 0) {
    lines.push(``, `<b>By business:</b>`);
    lines.push(...sections.map(s => `• ${s}`));
  }

  if (allAlerts.length > 0) {
    lines.push(``, `<b>Competitor alerts:</b>`);
    lines.push(...allAlerts.slice(0, 5));
  }

  if (totalLeads === 0 && totalContent === 0 && allAlerts.length === 0) {
    lines.push(``, `All quiet. No activity in the last 24 hours.`);
  }

  return sendAlert(lines.join('\n'));
}

/**
 * Send the weekly summary (designed for Saturday).
 */
export async function sendWeeklySummary() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const entries = await readdir(BUSINESSES_DIR, { withFileTypes: true }).catch(() => []);
  const businesses = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name);

  let totalLeads = 0;
  let totalHot = 0;
  let totalContent = 0;
  let totalAlerts = 0;

  for (const slug of businesses) {
    const base = join(BUSINESSES_DIR, slug);
    const leadsDir = join(base, 'results', 'leads');
    const contentDir = join(base, 'results', 'content');
    const intelDir = join(base, 'results', 'competitor-intel');

    totalLeads += await countRecentFiles(join(leadsDir, 'processed'), since)
                + await countRecentFiles(join(leadsDir, 'inbox'), since);
    totalHot += await countLeadsByTier(leadsDir, 'hot', since);
    totalContent += await countRecentFiles(contentDir, since);
    totalAlerts += (await getRecentCompetitorAlerts(intelDir, since)).length;
  }

  const lines = [
    `📋 <b>Weekly Summary</b>`,
    ``,
    `<b>This week (${businesses.length} business${businesses.length !== 1 ? 'es' : ''}):</b>`,
    `• Total leads: ${totalLeads}${totalHot > 0 ? ` (${totalHot} hot 🔥)` : ''}`,
    `• Content pieces: ${totalContent}`,
    `• Competitor alerts: ${totalAlerts}`,
    ``,
    `Sovereign system operational ✅`,
  ];

  return sendAlert(lines.join('\n'));
}

/**
 * Send the Darwin weekly performance report to Commander.
 */
export async function sendWeeklyDarwinReport() {
  const entries = await readdir(BUSINESSES_DIR, { withFileTypes: true }).catch(() => []);
  const businesses = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name);

  for (const slug of businesses) {
    const darwinDir = join(BUSINESSES_DIR, slug, 'results', 'darwin');
    const today = new Date().toISOString().split('T')[0];

    // Try today, then yesterday (Darwin runs Saturday 8am, telegram 10am)
    let analysis = null;
    for (const date of [today, new Date(Date.now() - 86400000).toISOString().split('T')[0]]) {
      try {
        analysis = JSON.parse(await readFile(join(darwinDir, `${date}.json`), 'utf-8'));
        break;
      } catch { continue; }
    }

    if (!analysis) continue;

    const r = analysis.recommendations || {};
    const cp = analysis.content_performance || {};
    const lq = analysis.lead_quality || {};
    const grade = analysis.weekly_grade || '?';

    const lines = [
      `🧬 <b>Darwin Weekly Report — ${slug}</b>`,
      ``,
      `<b>Grade:</b> ${grade}`,
      `<b>Summary:</b> ${analysis.one_line_summary || 'N/A'}`,
      ``,
      `📊 <b>Content Performance</b>`,
      cp.summary ? cp.summary.slice(0, 200) : 'No data',
      `Variety: ${cp.content_variety_score || 'N/A'}`,
      ``,
      `👤 <b>Lead Quality</b>`,
      `Total: ${lq.total_leads ?? 0} | Hot: ${lq.hot_leads ?? 0}`,
      lq.summary ? lq.summary.slice(0, 150) : 'No leads this week',
      ``,
      `🎯 <b>Next Week</b>`,
      `• More: ${(r.create_more || 'N/A').slice(0, 100)}`,
      `• Stop: ${(r.stop_creating || 'N/A').slice(0, 100)}`,
      `• Focus: ${(r.focus_audience || 'N/A').slice(0, 80)}`,
      `• Experiment: ${(r.bold_experiment || 'N/A').slice(0, 100)}`,
    ];

    if (analysis.config_adjustments?.length) {
      lines.push(``, `⚙️ <b>Config Suggestions</b>`);
      analysis.config_adjustments.slice(0, 3).forEach(a => lines.push(`• ${a.slice(0, 120)}`));
    }

    await sendAlert(lines.join('\n'));
  }
}

// CLI mode: run briefing or alert directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  const { config } = await import('dotenv');
  config({ path: join(ROOT, '.env') });

  if (cmd === 'briefing') {
    await sendMorningBriefing();
  } else if (cmd === 'weekly') {
    await sendWeeklySummary();
    await sendWeeklyDarwinReport();
  } else if (cmd === 'darwin') {
    await sendWeeklyDarwinReport();
  } else if (cmd === 'test') {
    await sendAlert('🧪 <b>Test alert</b>\n\nSovereign Telegram integration is working.');
  } else {
    console.log('Usage: node integrations/telegram-bot.js [briefing|weekly|darwin|test]');
    console.log('  briefing  — send morning briefing');
    console.log('  weekly    — send weekly summary + Darwin report');
    console.log('  darwin    — send Darwin report only');
    console.log('  test      — send test alert');
  }
}
