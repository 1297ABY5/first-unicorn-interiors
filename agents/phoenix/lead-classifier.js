/**
 * Lead scoring and classification based on qualification-bot.md playbook.
 * Score = source_score + service_score + location_score + urgency_score
 */

const URGENCY_SCORES = {
  asap: 20,
  '1-3_months': 12,
  exploring: 3,
};

const RESCORE_TRIGGERS = {
  reply: 15,
  quote_request: 20,
  photos_sent: 25,
  meeting_booked: 30,
  silent_7d: -10,
  silent_30d: -30,
};

/**
 * Score a lead based on source, service interest, location, and urgency.
 * Returns { score, tier, sequence }.
 */
export function scoreLead(lead, targetsConfig, servicesConfig, locationsConfig) {
  // Source score — look up from targets config
  const sourceScore = targetsConfig.source_scores[lead.source] || 0;

  // Service score — match by slug
  let serviceScore = 0;
  if (lead.service_interest) {
    const slug = lead.service_interest.toLowerCase().replace(/\s+/g, '-');
    serviceScore = targetsConfig.service_scores[slug] || 0;
    // Also try matching against service names from services config
    if (serviceScore === 0) {
      for (const svc of servicesConfig) {
        if (svc.slug === slug || svc.name?.toLowerCase().replace(/\s+/g, '-') === slug) {
          serviceScore = targetsConfig.service_scores[svc.slug] || 0;
          break;
        }
      }
    }
  }

  // Location score — tier-based from locations config
  let locationScore = 0;
  if (lead.location) {
    const loc = lead.location.toLowerCase();
    if (locationsConfig.tier_1.some(t => loc.includes(t.toLowerCase()) || t.toLowerCase().includes(loc))) {
      locationScore = 15;
    } else if (locationsConfig.tier_2.some(t => loc.includes(t.toLowerCase()) || t.toLowerCase().includes(loc))) {
      locationScore = 10;
    } else if (locationsConfig.tier_3.some(t => loc.includes(t.toLowerCase()) || t.toLowerCase().includes(loc))) {
      locationScore = 5;
    }
  }

  // Urgency score
  const urgencyScore = URGENCY_SCORES[lead.urgency] || 0;

  const score = sourceScore + serviceScore + locationScore + urgencyScore;

  // Tier classification
  let tier;
  if (score >= targetsConfig.hot_threshold) tier = 'hot';
  else if (score >= targetsConfig.warm_threshold) tier = 'warm';
  else tier = 'cold';

  // Sequence selection
  let sequence;
  if (lead.event === 'quote_request' || lead.event === 'post_quote') {
    sequence = 'quote_chase';
  } else if (tier === 'hot') {
    sequence = 'immediate';
  } else if (tier === 'warm') {
    sequence = 'nurture';
  } else {
    sequence = 'reactivation';
  }

  return { score, tier, sequence };
}

/**
 * Re-score an existing lead based on a new event.
 * Returns the score delta to apply.
 */
export function rescoreLead(lead, event) {
  const delta = RESCORE_TRIGGERS[event] || 0;
  return { delta, new_score: (lead.score || 0) + delta };
}
