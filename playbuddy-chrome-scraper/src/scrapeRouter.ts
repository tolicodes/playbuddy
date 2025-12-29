import * as fetlife from './providers/fetlife';
import * as insta from './providers/instagram';
import * as instaFollowing from './providers/instagramFollowing_native';
import * as pluraPromoStats from './providers/plura-promo-stats';
import { getFetlifeHandles, INSTAGRAM_HANDLES } from './data';
import FOLLOW_IG_HANDLES from './data/ig_follow.json';
import IG_FOLLOWING from './data/ig_follow.json';

import type { EventResult } from './types';
import { TEST_MODE } from './config';
import * as instaFollow from './providers/follow_instagram';

export type ScrapeSource = 'fetlife' | 'fetlifeNearby' | 'fetlifeFestivals' | 'fetlifeFriendsStage1' | 'fetlifeFriendsStage2' | 'fetlifeSingle' | 'instagram' | 'instagramFollowing' | 'pluraPromoStats';

type ScrapeFn = () => Promise<EventResult[]>;

const getFetlifeHandleList = async () => {
    if (TEST_MODE) return ['Queens_Kinksters'];
    return getFetlifeHandles();
};
const instagramHandles = TEST_MODE ? ['nightowls_ig'] : INSTAGRAM_HANDLES;
const followInstagramHandles = TEST_MODE ? ['nightowls_ig'] : FOLLOW_IG_HANDLES;

export const scrapeRouter: Record<ScrapeSource, ScrapeFn> = {
    fetlife: async () => fetlife.scrapeEvents(await getFetlifeHandleList()),
    fetlifeNearby: () => fetlife.scrapeNearbyEvents(),
    fetlifeFestivals: () => fetlife.scrapeFestivals(),
    fetlifeFriendsStage1: async () => fetlife.scrapeFriendsStage1(await getFetlifeHandleList()),
    fetlifeFriendsStage2: async () => fetlife.scrapeFriendsStage2FromStorage(),
    fetlifeSingle: async () => { throw new Error('fetlifeSingle requires a handle passed from the options UI'); },
    instagram: () => insta.scrapeInstagram(instagramHandles),
    instagramFollow: () => instaFollow.followInstagram(followInstagramHandles),
    // @ts-ignore
    instagramFollowing: () => instaFollowing.scrapeInstagramFollowing(IG_FOLLOWING),
    pluraPromoStats: () => pluraPromoStats.scrapePluraEvents(),
};

export async function scrapeBySource(source: ScrapeSource): Promise<EventResult[]> {
    if (!scrapeRouter[source]) throw new Error(`Unknown source: ${source}`);
    return scrapeRouter[source]();
}
