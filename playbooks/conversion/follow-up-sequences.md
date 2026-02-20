# Follow-Up Sequences Playbook — Universal
## Version: 1.0 | Last Updated: 2026-02-20
## Business voice, CTAs, service details from /businesses/{name}/ config.

## Sequence Selection
| Lead Score | Sequence | Messages | Duration |
|-----------|----------|----------|----------|
| Hot (above hot_threshold) | Immediate Response | 4 messages | 7 days |
| Warm (between warm/hot) | Nurture | 4 messages | 14 days |
| Cold (below warm, or stale 30+ days) | Reactivation | 2 messages | 7 days |
| Post-Quote (quote sent, no response) | Quote Chase | 3 messages | 10 days |

## SEQUENCE 1: HOT LEAD — Immediate Response

### Message 1 — Instant Reply (within 5 minutes)
**Template A (inbound from social/messaging):**
"Hi {name} {greeting_emoji}
Thanks for reaching out to {business_name}! I saw you're interested in {service} for your {location} {property_type}.
I'd love to understand your vision — could you share:
1. What's the main thing you want to {change_verb}?
2. Do you have a rough timeline in mind?
3. Happy to send examples from {location} — would that help?
Best, {team_member_name}
{business_name}"

**Template B (inbound from ad/website):**
"Hi {name} {greeting_emoji}
Thanks for your enquiry about {service} — we specialise in exactly this across {location} and similar areas.
Quick question: looking to start soon, or still planning? Either way, I can send recent examples from the area.
{business_name} {phone}"

### Message 2 — Value Add (24 hours)
"Hi {name} — following up {greeting_emoji}
I put together some {service} examples we've done in {location} recently.
[Attach 2-3 before/after or portfolio images]
Each completed in {timeline} with our {differentiator}.
Would you like a free {consultation_type}? We can discuss ideas and give you a detailed {quote_type} — no obligation.
Let me know! {closing_emoji}"

### Message 3 — Soft Close (Day 3)
"Hi {name} — hope your week is going well!
We have {n} {consultation_type} slots available this {timeframe} for {location}.
Our process:
✅ {step_1}
✅ {step_2}
✅ {step_3}
✅ No obligation
Shall I book you in?
Best, {business_name}"

### Message 4 — Last Chance (Day 7)
"Hi {name} {greeting_emoji}
Just checking if you're still thinking about your {service}?
If timing isn't right, I can:
📌 Save your details and follow up in {n} months
📌 Send a guide so you can plan at your pace
📌 Add you to our newsletter for inspiration
Just let me know. We're here when you're ready! {closing_emoji}"

---

## SEQUENCE 2: WARM LEAD — Nurture

### Message 1 — Personalised Value (Day 1)
Share relevant example + offer to create initial ideas. No pressure.

### Message 2 — Social Proof (Day 4)
Share recent testimonial from similar location/service. Build credibility.

### Message 3 — Education + Authority (Day 8)
Share 3 insider tips for choosing a provider. Position as expert, not salesperson.

### Message 4 — Seasonal/Timely Hook (Day 14)
Connect to relevant timing (season, event, deadline). Soft CTA to book.

---

## SEQUENCE 3: COLD REACTIVATION (30+ days no response)

### Message 1 — Pattern Interrupt
"Not a sales message" opener. Reference original enquiry. Share new availability. Offer to stop if not interested.

### Message 2 — Pure Value, Zero CTA (Day 7)
Share impressive recent work similar to their interest. No ask. Let them come to you.

---

## SEQUENCE 4: POST-QUOTE CHASE

### Message 1 — Check-In (48 hours)
Ask if they reviewed. Offer clarification call. No pressure.

### Message 2 — Objection Handler (Day 5)
Address top 3 common objections for the business (from brand.md or audiences.md pain points).

### Message 3 — Scarcity + Deadline (Day 10)
Remaining capacity for {period}. First priority since already quoted. Material/pricing may change.

---

## Variables (populated from business config at runtime)
- {name} — lead first name
- {business_name} — from brand.md
- {service} — from their enquiry, mapped to services.md
- {location} — from their enquiry, mapped to locations.md
- {greeting_emoji} — from brand.md emoji_style (default: 👋)
- {closing_emoji} — from brand.md (default: 🙏)
- {differentiator} — top differentiator from brand.md
- {consultation_type} — from brand.md (site visit / demo / consultation / call)
- {quote_type} — from brand.md (quote / proposal / estimate)
- {team_member_name} — from brand.md team or default business name
