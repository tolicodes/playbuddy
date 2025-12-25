import PQueue from 'p-queue';
import { upsertEvent, UpsertEventResult } from './writeEventsToDB/upsertEvent.js';
import { flushEvents } from '../../helpers/flushCache.js';
import { classifyEventsInBatches } from '../../scripts/event-classifier/classifyEvents.js';

export const printBulkAddStats = (eventResults: UpsertEventResult[]) => {
    const counts = {
        created: 0,
        updated: 0,
        failed: 0,
        skipped: 0,
    };

    for (const eventResult of eventResults) {
        if (eventResult.result === 'updated') {
            counts.updated++;
        } else if (eventResult.result === 'inserted') {
            counts.created++;
        } else if (eventResult.result === 'skipped') {
            counts.skipped++;
        } else {
            counts.failed++;
        }
    }

    console.log(`Created: ${counts.created}`);
    console.log(`Updated: ${counts.updated}`);
    console.log(`Skipped: ${counts.skipped}`);
    console.log(`Failed: ${counts.failed}`);

    return {
        created: counts.created,
        updated: counts.updated,
        failed: counts.failed,
        skipped: counts.skipped,
    };
};

export const upsertEventsClassifyAndStats = async (events: any[], authUserId: string | undefined, opts: { skipExisting?: boolean } = {}) => {
    if (!authUserId) {
        throw Error('User not specified');
    }

    const upsertQueue = new PQueue({ concurrency: 40 });
    const eventResults: UpsertEventResult[] = [];

    await Promise.all(
        events.map(event =>
            upsertQueue.add(async () => {
                const eventResult = await upsertEvent(event, authUserId, { skipExisting: opts.skipExisting });
                eventResults.push(eventResult);
            })
        )
    );
    await upsertQueue.onIdle();

    const stats = printBulkAddStats(eventResults);
    await flushEvents();

    await classifyEventsInBatches();

    return {
        stats,
        events: eventResults,
    };
};
