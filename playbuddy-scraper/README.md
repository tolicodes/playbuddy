Here's a summary of the whole flow for the event scraping and processing system:

1. **Initialization**:

   - The process starts with the `scrapeEvents` function, which can be run on an hourly or daily basis.
   - A URL cache is initialized to help prevent duplicate event scraping.

2. **Scraping Phase**:

   - Multiple scraping functions are executed concurrently using `Promise.all`:
     - `scrapeKinkEventbrite`: Scrapes kink-related events from Eventbrite.
     - `scrapePlura`: Retrieves events from the Plura platform.
     - `scrapeOrganizerTantraNYEvents`: Fetches events from TantraNY's API.
     - `scrapeAcroFestivalsEvents`: Gathers acrobatic festival events.
     - `scrapeAcroFacebookEvents`: Collects acro-related events from Facebook (only run daily).
     - `scrapeWhatsappLinks`: Collects event links shared in WhatsApp groups.

3. **Data Collection**:

   - Each scraper writes its results to separate JSON files in the data/outputs directory:
     - kink_eventbrite_events.json
     - plura.json
     - tantra_ny.json
     - acro_festivals.json
     - acro_facebook.json
     - whatsapp_links.json

4. **Event Processing**:

   - The collected events are combined into a single array.
   - For acro events, the `filterAcroFacebookEvents` function is applied to only include retreats, festivals, and multi-day events.
   - WhatsApp links are filtered to only include Eventbrite and Partiful URLs.

5. **Database Operations**:

   - The `writeEventsToDB` function is called with the filtered events.
   - For each event:
     - The `upsertEvent` function is called, which:
       - Upserts the event's organizer.
       - Checks if the event already exists in the database.
       - Upserts the event's location.
       - Creates or updates the event in the database.
       - Attaches relevant communities to the event.

6. **Completion**:
   - The function returns the filtered events array.
   - Logging statements provide information about the number of events processed and successfully added.

This flow ensures that events from multiple sources are regularly scraped, processed, deduplicated, and stored in the database, keeping the event data up-to-date and consistent across different platforms and communities.

## Flow

1. `scraper.ts`
2. `scrapeWhatsappEvents`
3. `scrapeWhatsappLinks` - uses whatsapp.js to gather EB and partiful links from group
