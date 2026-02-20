# Competitor Monitoring Playbook — Universal
## Version: 1.0 | Last Updated: 2026-02-20
## Competitors to track defined in /businesses/{name}/competitors.md

## What Scout Tracks Per Competitor
1. Social media: latest posts (engagement, hooks, content types, frequency)
2. Ad library: active ads (creative types, copy, offers, landing pages)
3. Reviews: new reviews (sentiment, common praise, common complaints)
4. Pricing: any public pricing changes or signals
5. Content: blog posts, new pages, SEO changes

## How Darwin Uses Competitor Intelligence
- Competitor launches successful content type → test similar approach
- Competitor gets negative reviews → create content addressing that pain point
- Competitor raises prices → opportunity for value positioning
- Competitor stops advertising → increase spend in their territory
- Competitor launches new service → assess if we should respond

## Rules
- NEVER name competitors in any content
- NEVER copy competitor content directly
- Position against the PROBLEM, not the company
- Use competitor weaknesses to inform differentiation content

## Output Format
```json
{
  "business": "string",
  "competitor": "string",
  "platform": "string",
  "date": "date",
  "observation": "string",
  "suggested_response": "string",
  "urgency": "high|medium|low"
}
```
Stored in /businesses/{name}/results/competitor-intel/
