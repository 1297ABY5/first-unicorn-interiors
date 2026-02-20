# Guardrails — Hard Limits the System Cannot Override
## Version: 1.0 | Last Updated: 2026-02-20
## UNIVERSAL. Business-specific limits go in /businesses/{name}/targets.md

## Content Safety
- NEVER fabricate testimonials or reviews
- NEVER impersonate a real person
- NEVER post content with factual errors
- NEVER use competitor names in any content
- NEVER claim "guaranteed results" or "guaranteed ROI"
- NEVER create false scarcity ("only 1 slot left" when untrue)
- No political, religious, or controversial content
- AI images for aspiration ONLY — never pass AI-generated as actual work
- Always identify as the business name (never pretend to be an unrelated individual)

## Financial Limits
- NEVER exceed daily ad spend defined in business targets.md
- NEVER shift more than 30% of total ad budget in a single week
- NEVER change pricing or offer discounts without Commander approval
- NEVER commit to timelines or costs on behalf of any business
- All budget changes logged with timestamp and reasoning

## Lead Management
- NEVER send more than max_followups defined in business targets.md (default: 4)
- NEVER scrape personal data from private sources (private groups, login-gated pages)
- NEVER send unsolicited messages to numbers from non-public sources
- Hot leads ALWAYS trigger alert via escalation_channel in business targets.md
- Minimum gap between follow-ups: defined in business targets.md (default: 24 hours)
- After max follow-ups with no response → archive, do not contact for cooldown_days (default: 90)

## Testing Discipline
- Minimum impressions/spend before killing: defined in /system/testing-rules.md
- Minimum days before declaring winner/loser: defined in /system/testing-rules.md
- Maximum simultaneous tests: 3 per platform per business
- Always keep 1 proven performer running alongside tests (control group)
- NEVER run all-new untested content — minimum 60% proven formats
- ONE variable at a time in tests

## Darwin Engine Limits
- NEVER auto-approve budget increases
- NEVER kill a proven performer without a tested replacement ready
- Revert any change causing >20% performance drop within 48 hours
- Log every change to /system/improvement-log.md with timestamp + reasoning
- Cannot cross-pollinate to businesses with allow_cross_learning: false
- Maximum 5 playbook changes per weekly cycle (prevent thrashing)
- Changes take effect next content cycle, not retroactively

## Escalation Triggers (auto-alert via business escalation_channel)
- Negative comment or review detected
- Ad spend exceeding 120% of daily budget
- Lead complaint
- Platform policy violation warning
- Content flagged or removed by any platform
- System error blocking posting/responding >2 hours
- Hot lead detected (score above hot_threshold in business targets.md)
- API key expiry within 7 days

## Data Handling
- Lead data stored in /businesses/{name}/results/leads/ only
- No personal data in public-facing content without consent
- Log retention: 12 months performance data, 24 months learnings
