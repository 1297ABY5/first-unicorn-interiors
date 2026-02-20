# Google Search Ads Playbook — Universal
## Version: 1.0 | Last Updated: 2026-02-20
## Keywords, budgets, locations from /businesses/{name}/ config.

## Campaign Structure
- One campaign per business
- Ad groups: one per service category (from business services.md)
- Keywords: generated from services.md × locations.md matrix
- Match types: exact + phrase match (never broad without modifier)

## Keyword Generation Logic
```
For each service in services.md:
  For each location in locations.md (tier 1 + tier 2):
    → ["{service} {location}"]
    → ["{service} {city}"]
    → ["{service} near me"]
    → ["{service} contractor/company/agency {city}"]
```

## Negative Keywords (Universal)
cheap, free, DIY, jobs, salary, course, training, how to become, internship

## Additional Negatives
- From business targets.md negative_keywords (location-specific exclusions, etc.)

## Ad Copy Template
```
Headline 1: {Service} in {City} (30 chars)
Headline 2: {Key Trust Signal} (30 chars)  
Headline 3: {CTA — Free consultation/quote/trial} (30 chars)
Description 1: {Trust signals from brand.md} (90 chars)
Description 2: {Service details + CTA} (90 chars)
Display path: {domain}/{service}
```

## Bidding Strategy
- Start: Manual CPC (control while learning)
- After 15+ conversions: switch to Target CPA
- Max CPC: from business targets.md max_cpc
- Device adjustment: +20% mobile if business is mobile-primary
- Time adjustment: +15% during business peak hours (from brand.md)

## Landing Page Requirements
- Primary CTA as sticky element on mobile
- Mobile-optimised, load <3 seconds
- Social proof above fold (reviews, project count, credentials)
- Form: max 4 fields (name, contact, location, interest)
- Match ad headline to landing page H1
