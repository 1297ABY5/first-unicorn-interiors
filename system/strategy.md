# Sovereign Marketing System — Core Strategy
## Version: 1.0 | Last Updated: 2026-02-20
## THIS FILE IS BUSINESS-AGNOSTIC. DO NOT ADD BUSINESS-SPECIFIC CONTENT HERE.

## How This System Works
1. This /system/ folder contains universal marketing principles
2. /playbooks/ contains universal marketing tactics and frameworks
3. /businesses/{name}/ contains ALL business-specific configuration
4. Agents read: master playbooks + business config → produce business-specific output
5. Darwin evolves playbooks based on cross-business data
6. NEW BUSINESS = new folder in /businesses/ using the template. Master files untouched.

## Core Positioning Principles
- Educate first, sell second (consultant-first approach)
- Intercept leads during PLANNING phase, not after they have multiple quotes
- Let results speak — show proof, not promises
- Build trust through transparency (pricing, process, timelines)
- Specific always beats generic ("47 projects in X" beats "many projects")

## Content Principles
- Every piece of content must have a clear CTA
- Always include social proof (numbers, locations, client results)
- Before/after content outperforms everything — prioritise it
- Never post generic "we do [service]" content — always be specific: what, where, for whom
- Stories > Feed posts for engagement; Reels > Carousels for reach
- 60% proven content formats, 40% test formats

## Funnel Logic (universal)
1. Content stops the scroll (hook)
2. Content educates or inspires (value)
3. Content proves capability (social proof)
4. CTA drives to conversion channel (WhatsApp / form / trial)
5. Bot/agent qualifies and nurtures (automation)
6. Human closes the deal

## Pricing Rules
- Never discount below thresholds defined in business targets.md
- Always quote in currency specified in business brand.md
- Transparency builds trust — show breakdowns, not lump sums

## Testing Philosophy
- Data beats opinions. Always test, never assume.
- One variable at a time. Minimum data thresholds before decisions.
- Extract PATTERNS from wins/losses, not just "this worked"
- Cross-pollinate learnings between businesses (when enabled)

## Business Loading Order
When generating content or responding to leads, agents MUST read in this order:
1. /system/strategy.md (this file — universal principles)
2. /system/guardrails.md (hard limits)
3. /playbooks/{relevant}/*.md (universal tactics)
4. /businesses/{name}/brand.md (business voice, identity, trust signals)
5. /businesses/{name}/audiences.md (who we target)
6. /businesses/{name}/services.md (what we sell)
7. /businesses/{name}/locations.md (where we operate)
8. /businesses/{name}/targets.md (KPIs, budgets, system config)
9. /businesses/{name}/competitors.md (competitive intelligence)
10. /businesses/{name}/results/ (performance data for Darwin)
