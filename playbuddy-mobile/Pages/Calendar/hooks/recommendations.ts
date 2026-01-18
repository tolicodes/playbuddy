import moment from "moment-timezone";

import type { EventWithMetadata } from "../../../Common/Nav/NavStackType";
import type { WishlistEntry } from "./useWishlist";

export const RECOMMENDATION_WINDOW_START_DAYS = 2;
export const RECOMMENDATION_WINDOW_END_DAYS = 10;

type RecommendationSource = "calendar" | "organizer";
type RecommendationReason =
    | "recent"
    | "recent-fill"
    | "promo-swap"
    | "promo-seed"
    | "random"
    | "random-fill";

export type RecommendationPick = {
    event: EventWithMetadata;
    source: RecommendationSource;
    promo: boolean;
    reason: RecommendationReason;
    wishlistCreatedAt?: string | null;
};

export type RecommendationDebugList = {
    poolCount: number;
    promoPoolCount: number;
    picks: RecommendationPick[];
    promoRequired: boolean;
    promoSatisfied: boolean;
};

export type RecommendationDebug = {
    calendar: RecommendationDebugList;
    organizers: RecommendationDebugList;
    dedupe: { excludedIds: number[] };
    final: { picks: RecommendationPick[]; promoCount: number };
};

export type RecommendationResult = {
    selections: EventWithMetadata[];
    debug: RecommendationDebug;
};

type BuildRecommendationsOptions = {
    sourceEvents: EventWithMetadata[];
    wishlistEvents: EventWithMetadata[];
    wishlistEntryMap?: Map<number, WishlistEntry>;
    followedOrganizerIds: Set<string>;
    tz: string;
    hasPromo: (event: EventWithMetadata) => boolean;
    windowStartDays?: number;
    windowEndDays?: number;
};

const shuffle = <T,>(items: T[]) => {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

export const buildRecommendations = ({
    sourceEvents,
    wishlistEvents,
    wishlistEntryMap,
    followedOrganizerIds,
    tz,
    hasPromo,
    windowStartDays = RECOMMENDATION_WINDOW_START_DAYS,
    windowEndDays = RECOMMENDATION_WINDOW_END_DAYS,
}: BuildRecommendationsOptions): RecommendationResult => {
    const now = moment().tz(tz).startOf("day");
    const windowStart = moment(now).add(windowStartDays, "days").startOf("day");
    const windowEnd = moment(now).add(windowEndDays, "days").endOf("day");

    const isWithinRecommendationWindow = (event: EventWithMetadata) => {
        const eventStart = moment.tz(event.start_date, tz);
        if (!eventStart.isValid()) return false;
        return eventStart.isBetween(windowStart, windowEnd, undefined, "[]");
    };

    const organizerEvents = sourceEvents.filter((event) => {
        const organizerId = event.organizer?.id?.toString();
        if (!organizerId || !followedOrganizerIds.has(organizerId)) return false;
        return isWithinRecommendationWindow(event);
    });

    const getWishlistCreatedAt = (event: EventWithMetadata) =>
        wishlistEntryMap?.get(event.id)?.created_at ?? null;

    const getWishlistSortValue = (event: EventWithMetadata) => {
        const createdAt = getWishlistCreatedAt(event);
        if (createdAt) {
            const createdAtMs = Date.parse(createdAt);
            if (Number.isFinite(createdAtMs)) return createdAtMs;
        }
        const startDateMs = moment.tz(event.start_date, tz).valueOf();
        return Number.isFinite(startDateMs) ? startDateMs : 0;
    };

    const buildPick = (
        event: EventWithMetadata,
        source: RecommendationSource,
        reason: RecommendationReason
    ): RecommendationPick => ({
        event,
        source,
        promo: hasPromo(event),
        reason,
        wishlistCreatedAt: source === "calendar" ? getWishlistCreatedAt(event) : undefined,
    });

    const pickRecentWithPromo = (
        pool: EventWithMetadata[],
        count: number,
        excludeIds: Set<number>
    ) => {
        const available = pool.filter((event) => !excludeIds.has(event.id));
        const ordered = [...available].sort(
            (a, b) => getWishlistSortValue(b) - getWishlistSortValue(a)
        );

        const picks: RecommendationPick[] = [];
        const pickedIds = new Set<number>();

        for (const event of ordered) {
            if (picks.length >= count) break;
            picks.push(buildPick(event, "calendar", "recent"));
            pickedIds.add(event.id);
        }

        const promoRequired = count > 0;
        const promoSatisfied = picks.some((pick) => pick.promo);
        if (promoRequired && !promoSatisfied) {
            const promoCandidate = ordered.find(
                (event) => hasPromo(event) && !pickedIds.has(event.id)
            );
            if (promoCandidate) {
                if (picks.length < count) {
                    picks.push(buildPick(promoCandidate, "calendar", "promo-swap"));
                    pickedIds.add(promoCandidate.id);
                } else {
                    const removed = picks.pop();
                    if (removed) pickedIds.delete(removed.event.id);
                    picks.push(buildPick(promoCandidate, "calendar", "promo-swap"));
                    pickedIds.add(promoCandidate.id);
                }
            }
        }

        if (picks.length < count) {
            for (const event of ordered) {
                if (picks.length >= count) break;
                if (pickedIds.has(event.id)) continue;
                picks.push(buildPick(event, "calendar", "recent-fill"));
                pickedIds.add(event.id);
            }
        }

        return {
            picks,
            poolCount: available.length,
            promoPoolCount: available.filter(hasPromo).length,
            promoRequired,
        };
    };

    const pickRandomWithPromo = (
        pool: EventWithMetadata[],
        count: number,
        excludeIds: Set<number>
    ) => {
        const available = pool.filter((event) => !excludeIds.has(event.id));
        const promoPool = shuffle(available.filter(hasPromo));
        const nonPromoPool = shuffle(available.filter((event) => !hasPromo(event)));

        const picks: RecommendationPick[] = [];
        const pickedIds = new Set<number>();

        if (count > 0 && promoPool.length > 0) {
            const promoPick = promoPool[0];
            picks.push(buildPick(promoPick, "organizer", "promo-seed"));
            pickedIds.add(promoPick.id);
        }

        for (const event of nonPromoPool) {
            if (picks.length >= count) break;
            if (pickedIds.has(event.id)) continue;
            picks.push(buildPick(event, "organizer", "random"));
            pickedIds.add(event.id);
        }

        if (picks.length < count) {
            for (const event of promoPool) {
                if (picks.length >= count) break;
                if (pickedIds.has(event.id)) continue;
                picks.push(buildPick(event, "organizer", "random-fill"));
                pickedIds.add(event.id);
            }
        }

        return {
            picks,
            poolCount: available.length,
            promoPoolCount: promoPool.length,
            promoRequired: count > 0,
        };
    };

    const calendarResult = pickRecentWithPromo(wishlistEvents, 2, new Set());
    const calendarPickIds = new Set(calendarResult.picks.map((pick) => pick.event.id));
    const organizerResult = pickRandomWithPromo(organizerEvents, 3, calendarPickIds);

    const combined = [...calendarResult.picks, ...organizerResult.picks];
    const promoPicks = combined.filter((pick) => pick.promo);
    const nonPromoPicks = combined.filter((pick) => !pick.promo);
    const finalPicks = [...promoPicks, ...nonPromoPicks];

    return {
        selections: finalPicks.map((pick) => pick.event),
        debug: {
            calendar: {
                poolCount: calendarResult.poolCount,
                promoPoolCount: calendarResult.promoPoolCount,
                picks: calendarResult.picks,
                promoRequired: calendarResult.promoRequired,
                promoSatisfied: calendarResult.picks.some((pick) => pick.promo),
            },
            organizers: {
                poolCount: organizerResult.poolCount,
                promoPoolCount: organizerResult.promoPoolCount,
                picks: organizerResult.picks,
                promoRequired: organizerResult.promoRequired,
                promoSatisfied: organizerResult.picks.some((pick) => pick.promo),
            },
            dedupe: { excludedIds: Array.from(calendarPickIds) },
            final: { picks: finalPicks, promoCount: promoPicks.length },
        },
    };
};
