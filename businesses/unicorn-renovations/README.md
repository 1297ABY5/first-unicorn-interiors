# HOW TO ADD A NEW BUSINESS
## Time required: 15-30 minutes

## Steps:
1. Copy this entire .template/ folder
2. Rename it to your business slug (lowercase, hyphens): e.g., /businesses/my-new-company/
3. Fill in ALL 7 files below with your business-specific details
4. Add your logo and any photos to /assets/
5. Done. The system reads your config and generates everything automatically.

## Files to fill in:
| File | What It Contains | Required? |
|------|-----------------|-----------|
| brand.md | Identity, voice, colours, CTAs, trust signals | YES |
| audiences.md | Who you target, their pain points, triggers | YES |
| services.md | What you sell, pricing, key features | YES |
| locations.md | Where you operate, target areas | YES |
| targets.md | KPIs, budgets, system config flags | YES |
| competitors.md | Who to monitor (Scout auto-updates) | YES |
| scraping.md | Lead sources to scrape (optional) | OPTIONAL |

## Auto-created folders:
| Folder | Purpose |
|--------|---------|
| assets/ | Your logo, photos, videos |
| results/ | Performance data (auto-populated by agents) |
| results/leads/ | Lead database (auto-populated) |
| results/competitor-intel/ | Competitor data (auto-populated by Scout) |
| results/proven-patterns.json | What works for THIS business (auto by Darwin) |

## What happens next:
- Factory reads your brand.md + playbooks → generates content in your voice
- Scout reads your competitors.md + scraping.md → gathers intelligence
- Phoenix reads your brand.md + follow-up playbooks → responds to leads
- Darwin reads your results/ → evolves what works for YOUR business
- Cross-pollination shares learnings with other businesses (if enabled in targets.md)
