import 'dotenv/config';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  readBrandConfig, readServicesConfig, readAudiencesConfig,
  readTargetsConfig, readLocationsConfig,
} from './config-reader.js';
import { scoreLead, rescoreLead } from './lead-classifier.js';
import { generateFollowUp } from './message-generator.js';
import {
  loadLeadInbox, loadExistingLead, saveLead, saveMessage, archiveInboxItem,
} from './lead-store.js';

const ROOT = process.env.SOVEREIGN_DATA_DIR || join(import.meta.dirname, '..', '..');
const BUSINESSES_DIR = join(ROOT, 'businesses');

const MAX_SEQUENCE_MESSAGES = {
  immediate: 4,
  nurture: 4,
  reactivation: 2,
  quote_chase: 3,
};

async function processLeads(slug, configs) {
  const { brand, services, audiences, targets, locations } = configs;
  const inbox = await loadLeadInbox(slug);

  if (inbox.length === 0) {
    console.log(`  [${slug}] No leads in inbox`);
    return { processed: 0, messages: 0, hot: 0 };
  }

  console.log(`  [${slug}] Found ${inbox.length} lead(s) in inbox`);

  let processed = 0;
  let messagesGenerated = 0;
  let hotLeads = 0;

  for (const inboxLead of inbox) {
    try {
      const leadId = inboxLead.lead_id;
      if (!leadId) {
        console.warn(`  [${slug}] Skipping lead with no lead_id`);
        continue;
      }

      // Check for existing lead record (follow-up / re-scoring)
      const existing = await loadExistingLead(slug, leadId);
      let lead;
      let messageNumber;

      if (existing) {
        // Re-score based on event
        const event = inboxLead.event || 'reply';
        const { delta, new_score } = rescoreLead(existing, event);
        existing.score = Math.max(0, new_score);

        // Re-classify tier
        if (existing.score >= targets.hot_threshold) existing.tier = 'hot';
        else if (existing.score >= targets.warm_threshold) existing.tier = 'warm';
        else existing.tier = 'cold';

        // Update sequence if event changes it
        if (event === 'quote_request') existing.sequence = 'quote_chase';
        else if (existing.tier === 'hot' && existing.sequence !== 'quote_chase') existing.sequence = 'immediate';

        existing.history = existing.history || [];
        existing.history.push({
          event,
          score_change: delta,
          new_score: existing.score,
          at: new Date().toISOString(),
        });
        existing.updated_at = new Date().toISOString();

        lead = existing;
        messageNumber = (existing.messages_sent || 0) + 1;
      } else {
        // New lead — score from scratch
        const { score, tier, sequence } = scoreLead(inboxLead, targets, services, locations);

        lead = {
          lead_id: leadId,
          business: slug,
          name: inboxLead.name || null,
          phone: inboxLead.phone || null,
          email: inboxLead.email || null,
          source: inboxLead.source || null,
          channel: inboxLead.channel || 'whatsapp',
          service_interest: inboxLead.service_interest || null,
          location: inboxLead.location || null,
          urgency: inboxLead.urgency || null,
          message: inboxLead.message || null,
          score,
          tier,
          sequence,
          messages_sent: 0,
          last_message_at: null,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          history: [{
            event: inboxLead.event || 'new_lead',
            score_change: score,
            new_score: score,
            at: new Date().toISOString(),
          }],
        };
        messageNumber = 1;
      }

      console.log(`  [${slug}] Lead ${leadId}: score=${lead.score}, tier=${lead.tier}, sequence=${lead.sequence}`);

      // Hot lead alert
      if (lead.tier === 'hot') {
        hotLeads++;
        console.log(`  [${slug}] 🔥 HOT LEAD: ${lead.name || leadId} (score: ${lead.score})`);
      }

      // Guardrail checks
      const maxMsgs = MAX_SEQUENCE_MESSAGES[lead.sequence] || targets.max_followups;
      if (lead.messages_sent >= maxMsgs) {
        console.log(`  [${slug}] Lead ${leadId}: max followups reached (${lead.messages_sent}/${maxMsgs}) — skipping`);
        lead.status = 'archived';
        await saveLead(slug, lead);
        await archiveInboxItem(slug, inboxLead._inbox_filename);
        processed++;
        continue;
      }

      // Gap hours check
      if (lead.last_message_at) {
        const hoursSinceLast = (Date.now() - new Date(lead.last_message_at).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLast < targets.followup_gap_hours) {
          console.log(`  [${slug}] Lead ${leadId}: too soon for next message (${hoursSinceLast.toFixed(1)}h < ${targets.followup_gap_hours}h) — skipping`);
          await archiveInboxItem(slug, inboxLead._inbox_filename);
          processed++;
          continue;
        }
      }

      // Cooldown check for archived leads
      if (existing && existing.status === 'archived' && existing.updated_at) {
        const daysSinceArchive = (Date.now() - new Date(existing.updated_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceArchive < targets.cooldown_days) {
          console.log(`  [${slug}] Lead ${leadId}: in cooldown (${daysSinceArchive.toFixed(0)}d < ${targets.cooldown_days}d) — skipping`);
          await archiveInboxItem(slug, inboxLead._inbox_filename);
          processed++;
          continue;
        }
        // Reactivate if past cooldown
        lead.status = 'active';
        lead.sequence = 'reactivation';
        messageNumber = 1;
      }

      // Generate message via Claude
      const message = await generateFollowUp(
        { ...lead, prior_messages: lead.prior_messages || [] },
        lead.sequence,
        messageNumber,
        brand, services, audiences,
      );

      // Save message
      await saveMessage(slug, leadId, message);

      // Update lead record
      lead.messages_sent = messageNumber;
      lead.last_message_at = new Date().toISOString();
      lead.updated_at = new Date().toISOString();
      await saveLead(slug, lead);

      // Archive inbox item
      await archiveInboxItem(slug, inboxLead._inbox_filename);

      messagesGenerated++;
      processed++;
    } catch (err) {
      console.error(`  [${slug}] Error processing lead ${inboxLead.lead_id || '(unknown)'}: ${err.message}`);
      processed++;
    }
  }

  return { processed, messages: messagesGenerated, hot: hotLeads };
}

async function main() {
  const startTime = Date.now();

  console.log(`[phoenix] Starting lead processing — ${new Date().toISOString()}`);

  // Discover businesses
  const entries = await readdir(BUSINESSES_DIR, { withFileTypes: true });
  const businesses = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name);

  if (businesses.length === 0) {
    console.log('[phoenix] No businesses found — nothing to do');
    console.log('[phoenix] Add a business: cp -r businesses/.template businesses/your-biz-slug');
    return;
  }

  console.log(`[phoenix] Found ${businesses.length} business(es): ${businesses.join(', ')}`);

  let totalProcessed = 0;
  let totalMessages = 0;
  let totalHot = 0;
  let successCount = 0;
  let failCount = 0;

  for (const slug of businesses) {
    try {
      console.log(`\n[phoenix] === ${slug} ===`);

      const brand = await readBrandConfig(slug);
      const services = await readServicesConfig(slug);
      const audiences = await readAudiencesConfig(slug);
      const targets = await readTargetsConfig(slug);
      const locations = await readLocationsConfig(slug);

      if (!brand.identity.business_name) {
        console.log(`  [${slug}] Brand config not filled in — skipping`);
        continue;
      }

      if (services.length === 0) {
        console.log(`  [${slug}] No services configured — skipping`);
        continue;
      }

      console.log(`  [${slug}] Brand: ${brand.identity.business_name}`);
      console.log(`  [${slug}] Services: ${services.length}, Audiences: ${audiences.length}`);
      console.log(`  [${slug}] Thresholds: hot≥${targets.hot_threshold}, warm≥${targets.warm_threshold}`);

      const result = await processLeads(slug, { brand, services, audiences, targets, locations });
      totalProcessed += result.processed;
      totalMessages += result.messages;
      totalHot += result.hot;
      successCount++;
    } catch (err) {
      failCount++;
      console.error(`[phoenix] Error processing ${slug}: ${err.message}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n[phoenix] === Summary ===');
  console.log(`[phoenix] Businesses processed: ${successCount}/${businesses.length}`);
  console.log(`[phoenix] Leads processed: ${totalProcessed}`);
  console.log(`[phoenix] Messages generated: ${totalMessages}`);
  if (totalHot > 0) console.log(`[phoenix] 🔥 Hot leads flagged: ${totalHot}`);
  if (failCount > 0) console.log(`[phoenix] Failures: ${failCount}`);
  console.log(`[phoenix] Duration: ${elapsed}s`);
  console.log(`[phoenix] Done — ${new Date().toISOString()}`);
}

main().catch(err => {
  console.error(`[phoenix] Fatal error: ${err.message}`);
  process.exit(1);
});
