# Scraping Configuration (OPTIONAL)
## Business: [YOUR-BUSINESS-SLUG]
## ⚠️ Only fill this in if your business benefits from lead scraping.
## Delete this file if scraping is not applicable.

## Source 1: [Platform Name — e.g., "Bayut", "LinkedIn", "Craigslist"]
- **url:** [Base URL to scrape]
- **type:** [listing | directory | social | job_board]
- **frequency:** [daily | twice_daily | weekly]
- **signals:** [Keywords that indicate a qualified lead]
  - Hot: ["keyword1", "keyword2"]
  - Warm: ["keyword3", "keyword4"]
- **location_filter:** [Geographic filter — e.g., "Dubai", "New York", "all"]
- **output_fields:**
  - listing_url
  - contact_name
  - contact_phone
  - contact_email
  - [custom_field_1]
  - [custom_field_2]

## Source 2: [Platform Name]
- **url:** [URL]
- **type:** [type]
- **frequency:** [frequency]
- **signals:**
  - Hot: ["keywords"]
  - Warm: ["keywords"]
- **location_filter:** [filter]
- **output_fields:** [fields]

## Outreach Rules (for scraped leads)
- **outreach_method:** [email | phone | whatsapp | linkedin_dm]
- **opening_reference:** [e.g., "I saw your listing on {source}"]
- **max_attempts:** [default: 3]
- **cooldown_days:** [default: 90]

## Scraping Rules
- PUBLIC data only
- Respect robots.txt
- Rate limit: max [X] requests per minute
- Deduplicate against existing lead database
