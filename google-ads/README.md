# Google Ads Campaign Plan — First Unicorn Interiors
## For Claude Code Implementation

### STATUS: Ready for deployment
### Date: March 15, 2026
### Account ID: 169-013-0314

---

## WHAT THIS IS

Complete Google Ads campaign restructure based on analysis of 30,385 search terms (Jul 2020 - Mar 2026). Every search term has been classified as POSITIVE or NEGATIVE based on intent (not conversion data — tracking was broken).

## FILES IN THIS DIRECTORY

```
google-ads/
├── campaigns.json          # Complete campaign config (keywords, ads, negatives, extensions)
├── negative-keywords.csv   # 3,976 negative keyword phrases — upload to Google Ads
├── keywords-c1.csv         # C1 Swimming Pool keywords
├── keywords-c2.csv         # C2 Villa Renovation keywords
├── keywords-c3.csv         # C3 Home Renovation keywords
├── keywords-c4.csv         # C4 Kitchen keywords
├── keywords-c5.csv         # C5 Bathroom keywords
├── keywords-c6.csv         # C6 Apartment keywords
├── keywords-c7.csv         # C7 Fitout & Interior keywords
├── keywords-c8.csv         # C8 Renovation General keywords
├── keywords-c9.csv         # C9 Commercial keywords
└── README.md               # This file
```

## 9 CAMPAIGNS

| ID | Campaign | Budget | Keywords | Landing Page |
|----|----------|--------|----------|-------------|
| C1 | Swimming Pool Dubai | AED 35/day | 29 | /renovation/pool/ |
| C2 | Villa Renovation Dubai | AED 25/day | 18 | /renovation/full-villa/ |
| C3 | Home Renovation Dubai | AED 20/day | 15 | /renovation/home/ |
| C4 | Kitchen Renovation Dubai | AED 15/day | 9 | /renovation/kitchen/ |
| C5 | Bathroom Renovation Dubai | AED 15/day | 8 | /renovation/bathroom/ |
| C6 | Apartment Renovation Dubai | AED 10/day | 5 | /renovation/apartment/ |
| C7 | Fitout & Interior Dubai | AED 15/day | 160 | /renovation/full-villa/ |
| C8 | Renovation General Dubai | AED 10/day | 91 | /interior-renovation-company-dubai/ |
| C9 | Commercial Fitout Dubai | AED 10/day | 1 | /renovation/full-villa/ |
| **TOTAL** | | **AED 155/day (AED 4,650/mo)** | **336** | |

## KEY RULES

### Keywords
- ALL keywords are Dubai/UAE specific — NO generic terms without "dubai" or "uae"
- Match types: Exact for keywords with 5+ historical clicks, Phrase for 2-4 clicks
- Every keyword maps to a specific landing page
- Landing pages have sticky mobile WhatsApp + Call CTA already deployed

### Negative Keywords (3,976 phrases)
Upload ALL negatives at ACCOUNT level (applies to all campaigns):
- 3,400+ competitor brand names (AED 19,972 wasted historically)
- 57 wrong locations (Abu Dhabi, Sharjah, Kerala, India, Pakistan, etc.)
- 55 wrong intent phrases (maintenance, DIY, jobs, budget, education, etc.)

### Ad Copy
- Each campaign has 6 headlines (30 char max) + 2 descriptions (90 char max)
- All ads include WhatsApp CTA
- All ads mention "Dubai" in at least one headline
- Trust signals: 800+ projects, municipality licensed, in-house team, 3-year warranty

### Extensions (apply to all campaigns)
- 8 sitelinks (Free Design, Portfolio, Cost Guide, Calculator, Kitchen, Bathroom, Pool, Villa Extension)
- 8 callouts (800+ projects, licensed, in-house, warranty, free visit, updates, milestone, 15+ years)
- 2 structured snippets (Services + Neighborhoods)
- Call extension: +971 58 565 8002
- WhatsApp message extension: +971 58 565 8002
- Location extension: Regus, The Bridge, Sports City, Dubai

### Conversion Tracking
- WhatsApp Lead: AW-612864132/9wrRCKLwzIUcEIShnqQC (ACTIVE — 1 recording)
- Click to Call: AW-612864132/uJBqCKLwzIUcEIShnqQC (ACTIVE — awaiting first click)
- FIX NEEDED: 4 other conversion tags showing "No recent conversions"

### Geo Targeting
- Target: Dubai only (not all UAE — to avoid Abu Dhabi/Sharjah waste)
- Language: English + Arabic
- Device: All devices (mobile priority — most traffic is mobile)
- Schedule: 8AM-10PM Dubai time (remove midnight-6AM)

## IMPLEMENTATION ORDER

1. Upload negative-keywords.csv at ACCOUNT level
2. Pause all existing campaigns
3. Create 9 new campaigns from campaigns.json
4. Add keywords from each keywords-cX.csv
5. Add ad copy from campaigns.json
6. Add extensions (sitelinks, callouts, snippets, call, whatsapp, location)
7. Set geo targeting to Dubai only
8. Set ad schedule 8AM-10PM
9. Set bidding strategy: Maximize Clicks (until conversion tracking is fixed)
10. Once tracking works (30 days): switch to Target CPA or Maximize Conversions

## EXPECTED RESULTS

- Current: AED 85/day → 2-3 clicks at AED 39 → ~1 lead/week
- After: AED 155/day → 6-10 clicks at AED 15-25 → 3-5 leads/week → 10-15 leads/month
- CPC drops because negatives block 27% waste traffic
- Quality Score improves because keyword → ad → landing page alignment is tight
- After 30 days with clean tracking: switch to smart bidding for further optimization

## NOTES

- "bond interiors" is a COMPETITOR (not the Commander's company) — it's in negatives
- Pool campaign (C1) is #1 priority — highest historical conversion rate (4-9%)
- Villa campaign (C2) is highest value — AED 200-500K per project
- Fitout campaign (C7) has most keywords but lowest CPC — good volume driver
- Commercial (C9) needs building — only 1 keyword with clicks. Expand after launch.
