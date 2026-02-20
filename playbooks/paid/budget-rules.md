# Budget Rules — Universal
## Version: 1.0 | Last Updated: 2026-02-20
## Per-business budgets, CPL targets, and caps defined in /businesses/{name}/targets.md

## Universal Rules
1. Never exceed daily cap defined in business targets.md ad_daily_cap
2. Never shift >30% of budget between channels in one week
3. Scale winners: +20% budget every 3 days if CPL holds below target
4. Kill losers: pause if spending >2x target CPL after minimum data threshold
5. Weekly budget review during Saturday Darwin cycle
6. Monthly reallocation based on Darwin channel performance data
7. Emergency pause: any channel >120% daily budget triggers auto-pause + alert

## Channel Budget Split (starting recommendation — Darwin optimises)
| Scenario | Channel A (Search) | Channel B (Social) | Channel C (Retarget) |
|----------|-------------------|-------------------|---------------------|
| New business, no data | 50% | 35% | 15% |
| 30+ days data | Based on CPL performance | Shift to winners | Scale retarget if converting |
| 90+ days data | Darwin auto-allocates within guardrails | | |

## CPL Tracking
- Target CPL: from business targets.md cpl_target
- Kill threshold: from business targets.md cpl_kill (default: 2x target)
- Review weekly, adjust monthly
- Compare across channels: shift budget to lowest CPL channel
