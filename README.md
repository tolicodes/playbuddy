# Kink Buddy

## Layout

- playbuddy-web
- playbuddy-scraper
- playbuddy-mobile

## Configuration

### DNS

| Name                 | Priority | Type  | Value                   |
| -------------------- | -------- | ----- | ----------------------- |
| api.playbuddy.me     | 3600     | CAA   | 0 issue letsencrypt.org |
| playbuddy.me         | 3600     | CAA   | 0 issue pki.goog        |
| scraper.playbuddy.me | 3600     | CAA   | 0 issue letsencrypt.org |
| api.playbuddy.me     | 3600     | CNAME | ghs.googlehosted.com.   |
| scraper.playbuddy.me | 3600     | CNAME | ghs.googlehosted.com.   |

Configure static hosting for playbuddy.me

#### CloudRun

1. Cloud Run > Domain Mappings > Add Mapping > kinkbuddy-functions > Cloud Run Domain Mappings > Verify New Domain > View in Search Console > Domain > Add TXT Record > Go back to Mapping > Refresh > Select Domain > Subdomain (api) > Done
2. Same for scraper
