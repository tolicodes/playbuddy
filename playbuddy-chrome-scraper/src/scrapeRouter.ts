import * as fetlife from './providers/fetlife';
import * as insta from './providers/instagram';
import { FETLIFE_HANDLES, INSTAGRAM_HANDLES } from './data';
import type { EventResult } from './types';
import { TEST_MODE } from './config';

export type ScrapeSource = 'fetlife' | 'fetlifeNearby' | 'instagram';

type ScrapeFn = () => Promise<EventResult[]>;

const fetlifeHandles = TEST_MODE ? ['Queens_Kinksters'] : FETLIFE_HANDLES;
const instagramHandles = TEST_MODE ? ['nightowlsig'] : INSTAGRAM_HANDLES;

const router: Record<ScrapeSource, ScrapeFn> = {
    fetlife: () => fetlife.scrapeEvents(fetlifeHandles),
    fetlifeNearby: () => fetlife.scrapeNearbyEvents(),
    instagram: () => insta.scrapeInstagram(instagramHandles),
};

export async function scrapeBySource(source: ScrapeSource): Promise<EventResult[]> {
    if (!router[source]) throw new Error(`Unknown source: ${source}`);
    return router[source]();
}
