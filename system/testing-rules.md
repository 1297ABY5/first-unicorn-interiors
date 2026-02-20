# Testing Framework
## Version: 1.0 | Last Updated: 2026-02-20
## UNIVERSAL. Business-specific thresholds go in /businesses/{name}/targets.md

## What Gets Tested
- Hook formats (question vs statement vs statistic vs controversy vs POV vs before/after)
- Content types (reel vs carousel vs single image vs story vs short)
- Posting times (test in 30-min windows)
- CTA formats (test variations defined in business brand.md)
- Ad headlines (3 variations minimum per test)
- Ad audiences (test 2-3 segments per campaign)
- Follow-up message variants (test opening lines, CTAs, tone)
- Landing page hero sections (headline + image combinations)
- Image types (real photo vs AI-generated vs branded graphic)
- Caption length (short punchy vs medium story vs long educational)
- Hashtag sets (test different combinations)

## Testing Protocol
1. ONE variable at a time (never test hook AND time simultaneously)
2. Define success metric BEFORE launching test
3. Run for minimum data period (see thresholds below)
4. Log result in /businesses/{name}/results/ immediately after test concludes
5. Extract the PATTERN, not just "this post won" — understand WHY
6. Never run more than 3 simultaneous tests per platform per business
7. Always maintain 60% proven content, 40% test content

## Minimum Data Before Decisions

| Channel | Minimum Before Decision |
|---------|------------------------|
| Social media post (feed) | 48 hours + 500 reach |
| Short-form video (reel/short) | 72 hours + 1,000 reach |
| Google Ad | 1,000 impressions OR spend = 3x target CPL (whichever first) |
| Meta/Social Ad | 1,000 impressions OR spend = 2.5x target CPL (whichever first) |
| LinkedIn Ad | 500 impressions OR spend = 3x target CPL |
| Messaging template (WhatsApp/email/DM) | 20 sends |
| Email campaign | 50 sends |
| Landing page variant | 100 visits |
| Follow-up sequence | 15 leads through full sequence |
| Blog post SEO | 30 days indexed |

## Win/Loss Criteria

| Metric | Winner (top 20%) | Loser (bottom 30%) | Inconclusive |
|--------|-------------------|--------------------|--------------|
| Post saves/bookmarks | >80th percentile of last 30 posts | <30th percentile | Between |
| Video reach | >30-day rolling average | <50% of average | Between |
| Ad CTR | >2.5% | <1.0% | Between 1.0-2.5% |
| Ad CPL | Below target in targets.md | >2x target | Between 1-2x |
| Message reply rate | >15% | <5% | Between 5-15% |
| Landing page conversion | >3% | <1% | Between 1-3% |
| Follow-up reply rate | >20% | <8% | Between 8-20% |
| Email open rate | >25% | <10% | Between |
| Email click rate | >3% | <0.5% | Between |

## Post-Test Actions

### Winner
1. Promote to "PROVEN" status in relevant playbook section
2. Extract the PATTERN — tag with: hook_style, content_type, post_time, cta_format, topic, image_type
3. Generate 3-5 mutations for next round of testing
4. Log to /data/learnings/ with full context
5. If pattern applies across businesses → flag for cross-pollination

### Loser
1. Archive with death report: what was tested, what metric failed, hypothesis why
2. Add pattern to "AVOID" list in relevant playbook
3. Log to /data/learnings/

### Inconclusive
1. Extend test by 50% more data
2. If still inconclusive → force decision based on trend direction
3. If flat → archive as "neutral", move on

## Test Naming Convention
`{business}-{platform}-{variable}-{date}`
Example: `mybiz-instagram-hook_question_vs_statement-2026-02-20`
