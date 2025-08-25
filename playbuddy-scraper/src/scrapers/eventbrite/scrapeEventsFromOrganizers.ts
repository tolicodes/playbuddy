import cheerio from 'cheerio';
import TurndownService from 'turndown';
import Table from 'cli-table3';


import { addURLToQueue } from "../../helpers/getUsingProxy.js";

import { EventbriteEvent } from './types.js';
import { ScraperParams } from "../types.js";
import { NormalizedEventInput } from "../../commonTypes.js";

const filterByRegion = (event: EventbriteEvent, region: string) => {
  return event.venue?.address?.region === region;
}

const isRetreat = (event: EventbriteEvent) => {
  return new Date(event.end.utc).getTime() - new Date(event.start.utc).getTime() > 24 * 60 * 60 * 1000;
}

const mapEventbriteEventToEvent = (eventbriteEvents: EventbriteEvent[], eventDefaults: Partial<NormalizedEventInput>): NormalizedEventInput[] => {
  const nyEvents = eventbriteEvents.filter(event => filterByRegion(event, 'NY'));
  console.log('Organizer', eventbriteEvents[0]?.organizer?.name);
  console.log('FILTER: Total Events: ', eventbriteEvents.length, ' to NY Events:', nyEvents.length);

  return eventbriteEvents.map((event) => {
    const start_date = event.start.utc;
    const end_date = event.end.utc;

    const isRetreatEvent = isRetreat(event);
    const isNonNyEvent = !filterByRegion(event, 'NY');

    return {
      ...eventDefaults,
      recurring: 'none',
      original_id: `eventbrite-${event.id}`,
      organizer: {
        name: event.organizer.name,
        url: event.organizer.url,
        original_id: `eventbrite-${event.organizer.id}`,
      },
      name: event.name.text,
      start_date,
      end_date,
      ticket_url: event.url,
      image_url: event.logo?.url,
      event_url: event.url,
      description: '',
      // This is the shorter description, we will scraper the full description later
      short_description: event.description.text,

      location: event.venue?.address?.localized_address_display,
      price: event.ticket_availability?.minimum_ticket_price?.display,

      tags: event.category ? [event.category.name] : [], // Using category as a tag since tags are not present in the new structure

      source_ticketing_platform: "Eventbrite",
      communities: eventDefaults.communities || [],

      non_ny: isNonNyEvent,
      type: isRetreatEvent ? 'retreat' : 'event',
    };
  });
}

const scrapeDescriptionFromEventPage = async (eventPageUrl: string): Promise<string> => {
  try {
    const data = await addURLToQueue({ url: eventPageUrl, json: false, label: 'Get Eventbrite Event Page: ' + eventPageUrl });
    const $ = cheerio.load(data);

    const description = $('.event-description__content--expanded').html();

    if (!description) {
      return '';
    }

    const turndownService = new TurndownService();
    const markdown = turndownService.turndown(description);

    return markdown;
  } catch (error) {
    console.error(`SCRAPE ORGANIZER: Error scraping description from event page ${eventPageUrl}:`, error);
    return '';
  }
}

const scrapeOrganizerPage = async ({
  url,
  eventDefaults,
}: ScraperParams): Promise<NormalizedEventInput[]> => {
  const allEvents: NormalizedEventInput[] = [];

  try {
    const organizerId = url.split('/').pop()?.split('-').pop();
    if (!organizerId) {
      console.error(`SCRAPE ORGANIZER: Could not extract organizer ID from URL: ${url}`);
      return [];
    }

    for (let page = 1; page <= 3; page++) {
      const apiUrl = `https://www.eventbrite.com/api/v3/organizers/${organizerId}/events/?expand=ticket_availability,organizer,venue&status=live&only_public=true&page=${page}`;

      const response = await addURLToQueue({
        url: apiUrl,
        json: true,
        label: `Get Eventbrite Organizer page ${page}: ${apiUrl}`
      });

      if (!response || (!response.events || response.events?.length === 0)) {
        console.error(`SCRAPE ORGANIZER: No events found for organizer ${url}`);
        return [];
      }
      const rawEvents = response.events;

      const filteredEvents = rawEvents.filter((event: EventbriteEvent) => !event.is_series_parent);
      const events = mapEventbriteEventToEvent(filteredEvents, eventDefaults);

      const descriptions = await Promise.all(events.map((event) => scrapeDescriptionFromEventPage(event.event_url!)));

      for (let i = 0; i < events.length; i++) {
        events[i].description = descriptions[i];
      }

      allEvents.push(...events);

      if (!response.pagination?.has_more_items) {
        break;
      }
    }
  } catch (error) {
    console.error(`Error scraping Eventbrite API`, error);
  }

  return allEvents;
};

function printTable(rows: Record<string, any>[]) {
  if (rows.length === 0) {
    console.log('(no data)');
    return;
  }

  const headers = Object.keys(rows[0]);

  const table = new Table({ head: headers });

  const sortedRows = rows.sort((a, b) => a.name?.localeCompare(b.name));

  for (const row of sortedRows) {
    table.push(headers.map(header => row[header]));
  }

  console.log(table.toString());
}


function extractOrganizerSlug(url: string): string {
  const match = url.match(/eventbrite\.com\/o\/(.*)-\d+$/);
  return match ? match[1] : 'unknown';
}

export const scrapeEventsFromOrganizers = async ({
  organizerURLs,
  eventDefaults,
}: {
  organizerURLs: string[];
  eventDefaults: Partial<NormalizedEventInput>;
}): Promise<NormalizedEventInput[]> => {
  console.time(`⏱️ scrapeEventsFromOrganizers (${organizerURLs.length} organizers)`);

  const organizerResults: {
    url: string;
    promise: PromiseSettledResult<NormalizedEventInput[]>;
  }[] = [];

  // ✅ SEQUENTIAL: one organizer at a time
  for (const organizerURL of organizerURLs) {
    try {
      const events = await scrapeOrganizerPage({ url: organizerURL, eventDefaults }); // waits for all its queued work
      organizerResults.push({ url: organizerURL, promise: { status: 'fulfilled', value: events } });
    } catch (err) {
      organizerResults.push({ url: organizerURL, promise: { status: 'rejected', reason: err } as PromiseRejectedResult });
    }
  }

  // (unchanged) stats + return
  const organizerStats: Record<string, { success: number; failed: number }> = {};
  for (const { url, promise } of organizerResults) {
    const slug = extractOrganizerSlug(url);
    if (!organizerStats[slug]) organizerStats[slug] = { success: 0, failed: 0 };
    if (promise.status === 'fulfilled') organizerStats[slug].success += (promise as PromiseFulfilledResult<NormalizedEventInput[]>).value.length;
    else organizerStats[slug].failed += 1;
  }

  const tableData = Object.entries(organizerStats).map(([organizer, { success, failed }]) => ({ organizer, success, failed }));
  console.log('\n📊 Organizer scrape results (grouped by slug):');
  printTable(tableData);
  const totalSuccess = tableData.reduce((s, r) => s + r.success, 0);
  const totalFailed = tableData.reduce((s, r) => s + r.failed, 0);
  console.log(`✅ total success: ${totalSuccess}`);
  console.log(`❌ total failed:  ${totalFailed}`);
  console.timeEnd(`⏱️ scrapeEventsFromOrganizers (${organizerURLs.length} organizers)`);

  return organizerResults
    .filter(r => r.promise.status === 'fulfilled')
    .flatMap(r => (r.promise as PromiseFulfilledResult<NormalizedEventInput[]>).value);
};


export default scrapeEventsFromOrganizers;
