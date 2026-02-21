# Scraping Configuration
## Business: unicorn-renovations

## Source 1: Bayut Property Listings
- **url:** https://www.bayut.com/for-sale/villas/dubai/
- **type:** listing
- **frequency:** daily
- **signals:** "renovation needed", "handyman special", "fixer upper", "original condition", "needs work"
- **location_filter:** Dubai
- **output_fields:** title, location, price, description_snippet, listing_url

## Source 2: Property Finder Villa Sales
- **url:** https://www.propertyfinder.ae/en/buy/villas/dubai.html
- **type:** listing
- **frequency:** daily
- **signals:** "renovation", "dated", "original condition", "needs updating", "motivated seller"
- **location_filter:** Dubai — Palm Jumeirah, Emirates Hills, Arabian Ranches, Dubai Hills, Al Barari
- **output_fields:** title, location, price, description_snippet, listing_url

## Outreach Rules
- **outreach_method:** whatsapp
- **opening_reference:** "I noticed your villa listing on {source} in {location}"
- **max_attempts:** 3
- **cooldown_days:** 90

## Scraping Rules
- PUBLIC data only — respect robots.txt
- Rate limit: 1 request per 3 seconds
- Deduplicate against existing lead database
- Flag duplicate listings across sources
