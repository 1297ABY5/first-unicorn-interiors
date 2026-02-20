# Tools Stack — Sovereign Marketing System
## Version: 1.0 | Last Updated: 2026-02-20
## UNIVERSAL. No business-specific configuration here.

---

## Layer 1: Infrastructure

| Tool | Purpose | Cost |
|------|---------|------|
| DigitalOcean Droplet | Single VPS running all agents, cron, PM2 | $24/mo |
| GitHub | Code repo, version control, CI/CD | Free |
| Supabase | Postgres DB for leads, results, performance data | Free tier |
| Redis (via Upstash or self-hosted) | Queue for agent tasks, caching, rate limiting | Free tier |

**Why DigitalOcean:** Single $24/mo droplet runs everything. No Kubernetes, no Lambda, no multi-cloud. One box, SSH in, done. Scale vertically before adding complexity.

**Why Supabase:** Free Postgres with REST API, auth, and row-level security. Replaces a custom backend for lead storage and performance tracking. Migrate to self-hosted Postgres if limits are hit.

**Why Redis:** Agent task queue (inbox/ → active/ → completed/ flow), caching API responses, rate-limit tracking for platform APIs. Upstash free tier or self-hosted on the same droplet.

---

## Layer 2: AI Brains

| Tool | Purpose | Cost |
|------|---------|------|
| Claude API (Anthropic) | Primary brain for all agents — strategy, content, analysis, lead response | $10-25/mo |
| DeepSeek API | Bulk/commodity tasks — tagging, classification, summarisation, data extraction | $3-8/mo |

### Claude API — The Strategist
Used for tasks requiring judgement, creativity, and brand-voice adherence:
- **Factory:** Content generation, ad copy, blog writing, caption crafting
- **Scout:** Trend analysis, competitive intelligence synthesis, pattern recognition
- **Phoenix:** Lead qualification, personalised follow-up messages, objection handling
- **Darwin:** Performance analysis, playbook evolution, cross-pollination insights

Model selection:
- `claude-sonnet-4-6` — Default for all agent tasks (best cost/quality balance)
- `claude-opus-4-6` — Darwin weekly analysis, complex strategy decisions
- `claude-haiku-4-5` — High-volume simple tasks (tagging, formatting, classification fallback)

### DeepSeek API — The Workhorse
Used for high-volume tasks where cost matters more than nuance:
- Scraping result classification and deduplication
- Lead data extraction and normalisation
- Hashtag generation and keyword expansion
- Metrics aggregation and report formatting
- Content tagging (hook_style, content_type, topic)
- Bulk translation or localisation passes

### Routing Logic
```
IF task requires brand voice OR creativity OR strategy → Claude
IF task is bulk classification OR extraction OR formatting → DeepSeek
IF DeepSeek fails quality check → retry with Claude Haiku
```

---

## Layer 3: Content Creation

| Tool | Purpose | Cost |
|------|---------|------|
| Puppeteer | HTML → PNG branded graphics (carousels, stat cards, testimonials) | Free |
| Sharp (npm) | Image resize, crop, watermark, format conversion | Free |
| Flux via Replicate | Photorealistic AI image generation | ~$0.03/image |

### Puppeteer — Branded Graphics Engine
Renders HTML/CSS templates to pixel-perfect branded images:
- Carousel slides (1080x1080)
- Before/after split images
- Stat cards, testimonial cards
- Ad creatives (1200x628)
- Story slides (1080x1920)
- Listing graphics

Templates consume `brand.md` values (colours, fonts, logo) at runtime. Zero per-image cost.

### Sharp — Image Processing Pipeline
Post-processing for all generated and uploaded images:
- Resize to platform specs (see image-generation.md size table)
- Add watermark/logo overlay
- Convert formats (WebP for web, PNG for social)
- Compress for fast loading (<200KB target for web)

### Flux via Replicate — AI Image Generation
Photorealistic images for non-proof content only (see guardrails.md):
- Blog hero images
- Landing page lifestyle shots
- Inspiration/aspiration posts
- Ad backgrounds
- Concept renders

**Never** used for: actual work photos, team photos, testimonials, anything claimed as real.

---

## Layer 4: Publishing

| Tool | Purpose | Cost |
|------|---------|------|
| Meta Graph API | Post to Instagram + Facebook, manage ad campaigns | Free |
| LinkedIn API | Post to LinkedIn company/personal pages | Free |
| Google Ads API | Manage Search + PMax campaigns, pull performance data | Free |

### Meta Graph API
- **Publishing:** Create posts (image, carousel, reel, story) on Instagram and Facebook
- **Ads Manager:** Create/update/pause ad campaigns, ad sets, and ads
- **Insights:** Pull post performance, ad performance, audience data
- **Webhooks:** Receive comment/DM notifications for Phoenix

### LinkedIn API
- **Publishing:** Create posts on company pages and personal profiles
- **Analytics:** Pull post impressions, engagement, follower demographics
- Rate limits: 100 posts/day per organisation

### Google Ads API
- **Campaign management:** Create/update Search and PMax campaigns
- **Keyword management:** Add/remove keywords, update bids
- **Reporting:** Pull campaign performance, search terms, conversion data
- **Budget control:** Set/adjust daily budgets within guardrail limits

### Future (add when needed)
- TikTok Content Publishing API
- YouTube Data API v3
- Twitter/X API v2
- Google Business Profile API (for local SEO posts and review monitoring)

---

## Layer 5: Lead Capture

| Tool | Purpose | Cost |
|------|---------|------|
| WhatsApp Business API | Receive/send lead messages, qualification bot, follow-ups | Free tier |
| Telegram Bot API | Alternative lead channel, notifications, alerts | Free |

### WhatsApp Business API
Primary lead channel for most businesses:
- **Inbound:** Receive messages from CTA clicks (wa.me links)
- **Qualification:** Run qualification-bot.md flow (service → location → urgency)
- **Follow-ups:** Send sequence messages per follow-up-sequences.md
- **Templates:** Pre-approved message templates for outbound
- Free tier: 1,000 service conversations/month (business-initiated replies to user messages are free for 24h)

### Telegram Bot API
Used for:
- **Commander alerts:** Escalation notifications, hot lead alerts, daily reports
- **Internal comms:** Agent status updates, error alerts
- **Alternative lead channel:** For businesses where Telegram is primary
- Completely free, no rate limits for reasonable usage

---

## Layer 6: Scraping

| Tool | Purpose | Cost |
|------|---------|------|
| Firecrawl | Web scraping, lead extraction, competitor monitoring | $16/mo |

### Firecrawl
Cloud scraping API that handles JavaScript rendering, anti-bot, and rate limiting:
- **Lead scraping:** Extract listings from sources defined in business `scraping.md`
- **Competitor monitoring:** Track competitor social profiles, websites, reviews, ads
- **Market research:** Scrape industry directories, review sites, job boards
- **Trend detection:** Monitor platform blogs, industry news, algorithm change announcements

500 credits/month on Hobby plan. Each page scrape = 1 credit.

### Scraping Ethics (enforced by guardrails.md)
- Public data only — never scrape behind login walls
- Respect robots.txt
- Rate limit all requests
- Deduplicate against existing leads in Supabase
- Never scrape personal data from private sources

---

## Layer 7: Monitoring & Orchestration

| Tool | Purpose | Cost |
|------|---------|------|
| PM2 | Process manager for Phoenix (always-on) and agent lifecycle | Free |
| cron | Schedule Scout, Factory, and Darwin runs | Free |
| Sentry | Error tracking, alerting, performance monitoring | Free tier |

### PM2 — Process Manager
- Keeps Phoenix running 24/7 with auto-restart on crash
- Manages agent processes (start, stop, restart, logs)
- Memory/CPU monitoring per agent
- Log rotation and aggregation

### cron — Scheduling
All agent runs orchestrated via crontab (see full schedule below).

### Sentry — Error Tracking
- Captures unhandled exceptions across all agents
- Alerts on error spikes (Telegram integration)
- Performance monitoring for API call latency
- Free tier: 5K errors/month, 10K transactions/month

---

## Agent Cron Schedule

All times in GST (Gulf Standard Time, UTC+4). Configured via system crontab.

```
# ┌─────── minute
# │  ┌──── hour
# │  │  ┌─ day of month
# │  │  │ ┌ month
# │  │  │ │ ┌ day of week
# │  │  │ │ │

# === SCOUT — The Researcher (5x daily) ===
 0  6  * * *   /usr/bin/node /app/agents/scout.js >> /var/log/sovereign/scout.log 2>&1
 0  9  * * *   /usr/bin/node /app/agents/scout.js >> /var/log/sovereign/scout.log 2>&1
 0 12  * * *   /usr/bin/node /app/agents/scout.js >> /var/log/sovereign/scout.log 2>&1
 0 16  * * *   /usr/bin/node /app/agents/scout.js >> /var/log/sovereign/scout.log 2>&1
 0 20  * * *   /usr/bin/node /app/agents/scout.js >> /var/log/sovereign/scout.log 2>&1

# === FACTORY — The Creator (4x daily) ===
30  6  * * *   /usr/bin/node /app/agents/factory.js >> /var/log/sovereign/factory.log 2>&1
 0 10  * * *   /usr/bin/node /app/agents/factory.js >> /var/log/sovereign/factory.log 2>&1
 0 14  * * *   /usr/bin/node /app/agents/factory.js >> /var/log/sovereign/factory.log 2>&1
 0 18  * * *   /usr/bin/node /app/agents/factory.js >> /var/log/sovereign/factory.log 2>&1

# === PHOENIX — The Responder (always-on via PM2) ===
# Started via PM2, not cron. Auto-restarts on crash.
# pm2 start /app/agents/phoenix.js --name phoenix --max-restarts 50

# === DARWIN — The Evolver (weekly, Saturday 06:00 GST) ===
 0  6  * * 6   /usr/bin/node /app/agents/darwin.js >> /var/log/sovereign/darwin.log 2>&1
```

### Schedule Rationale

| Agent | Frequency | Why |
|-------|-----------|-----|
| Scout 06:00 | Morning scan | Catch overnight trends, competitor posts, new listings |
| Scout 09:00 | Mid-morning | Market opening activity, new ad launches |
| Scout 12:00 | Midday | Lunchtime content surge, engagement peaks |
| Scout 16:00 | Afternoon | Post-work browsing spike, new reviews posted |
| Scout 20:00 | Evening | End-of-day roundup, next-day prep intel |
| Factory 06:30 | Morning batch | Generate and schedule day's content (after Scout 06:00 intel) |
| Factory 10:00 | Mid-morning | Publish morning content, launch/adjust ads |
| Factory 14:00 | Afternoon | Publish afternoon content, respond to morning performance |
| Factory 18:00 | Evening | Schedule next-day content, evening posts |
| Phoenix — | Always-on | Leads don't wait. 5-minute response target for hot leads |
| Darwin 06:00 Sat | Weekly | Full analysis cycle before the new week's content generation |

### Agent Dependency Chain
```
Scout 06:00  →  Factory 06:30  (Factory uses Scout's fresh intel)
Scout *      →  data/trends/   (all Scout runs feed trend data)
Factory *    →  results/       (all Factory output feeds Darwin)
Phoenix *    →  results/leads/ (all lead interactions feed Darwin)
Darwin Sat   →  playbooks/     (Darwin evolves playbooks for next week)
```

---

## Total Monthly Cost (excluding ad spend)

| Layer | Tool | Cost |
|-------|------|------|
| Infrastructure | DigitalOcean | $24/mo |
| AI — Claude | Claude API | $10-25/mo |
| AI — DeepSeek | DeepSeek API | $3-8/mo |
| Content | Puppeteer + Sharp | Free |
| Content | Flux via Replicate | ~$10-15/mo (est. 300-500 images) |
| Publishing | Meta + LinkedIn + Google APIs | Free |
| Lead Capture | WhatsApp + Telegram | Free |
| Scraping | Firecrawl | $16/mo |
| Monitoring | PM2 + cron + Sentry | Free |
| **Total** | | **$63-88/mo** |

With heavier AI usage or image generation: **up to $103/mo**.

---

## Required Environment Variables

```bash
# === Layer 1: Infrastructure ===
DATABASE_URL=               # Supabase Postgres connection string
SUPABASE_URL=               # Supabase project URL
SUPABASE_ANON_KEY=          # Supabase anonymous/public key
SUPABASE_SERVICE_KEY=       # Supabase service role key (server-side only)
REDIS_URL=                  # Redis connection string (redis://...)

# === Layer 2: AI Brains ===
ANTHROPIC_API_KEY=          # Claude API key (sk-ant-...)
DEEPSEEK_API_KEY=           # DeepSeek API key

# === Layer 3: Content Creation ===
REPLICATE_API_TOKEN=        # Replicate API token (for Flux image generation)

# === Layer 4: Publishing ===
META_APP_ID=                # Meta Developer App ID
META_APP_SECRET=            # Meta Developer App Secret
META_ACCESS_TOKEN=          # Meta Graph API long-lived access token
LINKEDIN_CLIENT_ID=         # LinkedIn OAuth client ID
LINKEDIN_CLIENT_SECRET=     # LinkedIn OAuth client secret
LINKEDIN_ACCESS_TOKEN=      # LinkedIn OAuth access token
GOOGLE_ADS_DEVELOPER_TOKEN= # Google Ads API developer token
GOOGLE_ADS_CLIENT_ID=       # Google OAuth client ID
GOOGLE_ADS_CLIENT_SECRET=   # Google OAuth client secret
GOOGLE_ADS_REFRESH_TOKEN=   # Google OAuth refresh token
GOOGLE_ADS_CUSTOMER_ID=     # Google Ads MCC or account ID

# === Layer 5: Lead Capture ===
WHATSAPP_PHONE_NUMBER_ID=   # WhatsApp Business phone number ID
WHATSAPP_ACCESS_TOKEN=      # WhatsApp Business API access token
WHATSAPP_VERIFY_TOKEN=      # Webhook verification token
TELEGRAM_BOT_TOKEN=         # Telegram Bot API token
TELEGRAM_ALERT_CHAT_ID=     # Chat ID for Commander alerts

# === Layer 6: Scraping ===
FIRECRAWL_API_KEY=          # Firecrawl API key

# === Layer 7: Monitoring ===
SENTRY_DSN=                 # Sentry error tracking DSN

# === System ===
NODE_ENV=production         # Runtime environment
TZ=Asia/Dubai               # System timezone (GST = UTC+4)
SOVEREIGN_DATA_DIR=         # Path to unicorn-sovereign repo root
```

Store in `.env` at project root. **Never commit to Git.** Add `.env` to `.gitignore`.

---

*Sovereign Marketing System v1.0 — Tools Stack*
