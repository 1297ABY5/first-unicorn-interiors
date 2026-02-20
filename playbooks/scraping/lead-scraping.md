# Lead Scraping Playbook — Universal
## Version: 1.0 | Last Updated: 2026-02-20
## Sources, signals, and targets from /businesses/{name}/scraping.md

## How Business Scraping Config Works
Each business that uses scraping MUST have a scraping.md file in its folder defining:
- sources: list of URLs/platforms to scrape
- signals: keywords/patterns that indicate a qualified lead
- locations: geographic filters
- output_fields: what data to capture per lead
- outreach_rules: how to contact scraped leads
- frequency: how often to scrape each source

## Universal Scraping Rules
- PUBLIC listings and data only — never scrape behind login walls
- Public contact info from public listings = fair game for professional outreach
- Deduplicate against existing lead database before outreach
- Score leads using business lead-scoring criteria
- Log every batch to /businesses/{name}/results/scraping/
- Respect robots.txt and rate limits

## Universal Output Format
```json
{
  "batch_id": "string",
  "business": "string — from folder name",
  "source": "string — platform name",
  "scraped_at": "datetime ISO 8601",
  "listing_url": "string",
  "location": "string",
  "signal": "string — what qualified this lead",
  "contact_name": "string or null",
  "contact_phone": "string or null",
  "contact_email": "string or null",
  "lead_score": "hot|warm|cold",
  "outreach_status": "pending|sent|replied|booked|archived",
  "custom_fields": {}
}
```

## Outreach Rules (Universal)
- Professional tone matching business brand.md voice
- Identify as business name immediately
- Reference the specific listing/signal ("I saw your listing on {source}")
- One clear CTA
- Max outreach attempts: from business targets.md max_followups (default: 3)
- Cooldown after no response: from business targets.md cooldown_days (default: 90)
