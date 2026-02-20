# Targets & System Config
## Business: [YOUR-BUSINESS-SLUG]
## ⚠️ This file controls how the system operates for this business.

## === FINANCIAL TARGETS ===
- **monthly_revenue_target:** [e.g., "AED 400K" or "$50K"]
- **monthly_profit_target:** [e.g., "AED 200K"]
- **average_deal_value:** [e.g., "AED 80K" or "$349/month"]
- **deals_per_month_target:** [e.g., 4]

## === MARKETING TARGETS ===
- **cpl_target:** [Target cost per lead — e.g., "AED 80" or "$25"]
- **cpl_kill:** [Kill threshold — default 2x target — e.g., "AED 160"]
- **monthly_ad_budget:** [Total across all channels — e.g., "AED 10,000"]
- **ad_daily_cap:** [Max daily spend — e.g., "AED 500"]

## === LEAD TARGETS ===
- **leads_per_month:** [e.g., 30]
- **qualified_leads_per_month:** [e.g., 15]
- **meetings_per_month:** [e.g., 8]
- **close_rate:** [e.g., "30%"]

## === SOCIAL TARGETS ===
- **follower_growth_monthly:** [e.g., 200]
- **reviews_per_month:** [e.g., 5]
- **review_platform:** [e.g., "Google" or "Trustpilot" or "G2"]
- **website_traffic_monthly:** [e.g., 2000]

## === CONTENT FREQUENCY ===
- **content_frequency:** [e.g., "2 feed posts/day + daily stories" or "1 post/day"]
- **blog_frequency:** [e.g., "1 post/week" or "2 posts/month"]
- **email_frequency:** [e.g., "weekly newsletter" or "none"]

## === LEAD MANAGEMENT CONFIG ===
- **max_followups:** [Max messages before archiving — default: 4]
- **followup_gap_hours:** [Minimum hours between messages — default: 24]
- **cooldown_days:** [Days before re-contacting archived lead — default: 90]
- **hot_threshold:** [Lead score above this = HOT — default: 80]
- **warm_threshold:** [Lead score above this = WARM — default: 50]
- **review_request_delay_days:** [Days after completion to ask for review — default: 3]

## === SOURCE SCORES (for lead scoring) ===
| Source | Score |
|--------|-------|
| Referral | 30 |
| Organic inbound (WhatsApp/DM) | 25 |
| Paid ad click → CTA | 25 |
| Social DM (organic) | 20 |
| Ad → form fill | 20 |
| Website form | 15 |
| Cold outreach reply | 10 |
| Scraped listing | 5 |

## === SERVICE SCORES (for lead scoring) ===
| Service | Score |
|---------|-------|
| [Your highest-value service] | 30 |
| [Second highest] | 25 |
| [Third] | 20 |
| [Lower value] | 15 |
| [Exploratory/general] | 5 |

## === SYSTEM FLAGS ===
- **allow_cross_learning:** [true | false — receive learnings from other businesses]
- **share_learnings_from:** [list of business slugs to learn from — e.g., ["other-biz-1", "other-biz-2"]]
- **auto_approve_level:** [none | low_risk | medium | full]
  - none: all content needs Commander approval
  - low_risk: auto-approve creative rotation, posting times, story posts
  - medium: auto-approve all content within proven formats
  - full: full autonomy within guardrails (Month 4+ recommended)
- **escalation_channel:** [telegram | email | whatsapp | slack]
- **escalation_contact:** [Phone/email/chat ID for alerts]

## === NEGATIVE KEYWORDS (for paid ads) ===
[Comma-separated words to exclude from ad targeting]
[e.g., "cheap, free, DIY, jobs, salary, course, training"]

## === SEASONAL CALENDAR ===
| Month | Event/Season | Marketing Angle |
|-------|-------------|-----------------|
| [e.g., March] | [e.g., "Pre-summer"] | [e.g., "Get it done before you travel"] |
| [e.g., June] | [e.g., "Eid"] | [e.g., "Ready for hosting season"] |
<!-- Add your business-specific seasonal opportunities -->
