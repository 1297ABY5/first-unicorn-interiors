# Qualification Bot Playbook — Universal
## Version: 1.0 | Last Updated: 2026-02-20

## Auto-Qualification Flow (3 questions max)

### Step 1: Service Interest
"Hi! {greeting_emoji} Thanks for reaching out to {business_name}.
I'd love to help. Quick question — what are you interested in?
{numbered_list_from_services.md}
Just reply with the number!"

### Step 2: Location
"{acknowledgment}! Where is your {property_type/location_prompt}?
Just type the {location_type} name."

### Step 3: Urgency
"Perfect! When are you looking to {action_verb}?
1️⃣ ASAP (within 2 weeks)
2️⃣ Next 1-3 months
3️⃣ Just exploring for now"

### Step 4: Handoff
"Thanks {name}! Details passed to our team.
A {specialist_title} will reach out within {response_time} with ideas and examples.
{attach_relevant_portfolio_piece}
{business_name} {phone} | {website}"

## Lead Scoring Logic
Score = source_score + service_score + location_score + urgency_score
- Source scores: defined in business targets.md
- Service scores: defined in business targets.md  
- Location scores: from business locations.md (tier 1 = highest)
- Urgency: ASAP = 20, 1-3 months = 12, exploring = 3

## Re-scoring Triggers (Universal)
- Replies to follow-up: +15
- Asks for quote/proposal: +20
- Sends photos/details: +25
- Books meeting/visit: +30 (auto → HOT)
- Silent 7+ days: -10
- Silent 30+ days: -30
