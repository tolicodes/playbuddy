import fs from 'fs';
import { parse as csvParse } from 'csv-parse';
import axios from 'axios';
import { supabaseClient } from 'connections/supabaseClient';

const BRANCH_KEY = process.env.BRANCH_KEY!;
const BRANCH_SECRET = process.env.BRANCH_SECRET!;
const BRANCH_BASE_URL = 'https://api.branch.io/v1/url';

type BranchPayload = {
    campaign: string;
    feature: string;
    channel: string;
    data: Record<string, any>;
};

/** Parse out the bits we care about from a CSV row */
function extractRowData(row: string[]) {
    return {
        campaign: row[0].trim(),
        percentOff: Number(row[7].trim()),
        code: row[8].trim(),
        eventLink: row[10].trim(),
    };
}

/** 1) Look up the event by URL */
async function findEventByLink(eventLink: string) {
    const { data, error } = await supabaseClient
        .from('events')
        .select('id, organizer_id')
        .eq('event_url', eventLink)
        .maybeSingle();

    if (error || !data) {
        console.error(`Event not found: ${eventLink}`, error?.message);
        return null;
    }
    return data;
}

/** 2) Upsert the promo code */
async function upsertPromoCode(
    organizerId: number,
    code: string,
    percentOff: number
) {
    const { data, error } = await supabaseClient
        .from('promo_codes')
        .upsert(
            {
                organizer_id: organizerId,
                promo_code: code,
                discount: percentOff,
                discount_type: 'percent',
                scope: 'event',
            },
            { onConflict: 'organizer_id, promo_code' }
        )
        .select('*')
        .maybeSingle();

    if (error || !data) {
        console.error(`Promo upsert failed: ${code}`, error?.message);
        return null;
    }
    return data.id;
}

/** 3) Build the Branch payload (exclude 'type') */
function buildBranchPayload(
    campaign: string,
    percentOff: number,
    organizerId: number,
    eventId: number,
    code: string
): BranchPayload {
    return {
        campaign,
        feature: 'deep_link',
        channel: 'csv_import',
        data: {
            $marketing_title: campaign,
            $og_title: campaign,
            $og_description: `Download PlayBuddy to get ${percentOff}% off ${campaign}`,
            organizer_id: organizerId,
            featured_event_id: eventId,
            promo_code: code,
        },
    };
}

/** Hit Branch API to update (instead of create) and return the slug */
async function updateBranchDeepLink(
    payload: BranchPayload,
    slug: string
): Promise<string | null> {
    try {
        const resp = await axios.put(
            `${BRANCH_BASE_URL}/${slug}`,
            {
                branch_key: BRANCH_KEY,
                branch_secret: BRANCH_SECRET,
                ...payload,
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        console.log('Branch API response', resp.data);

        // assumes Branch responds with { url: 'https://bnc.lt/abc123' }
        return new URL(resp.data.url).pathname.slice(1);
    } catch (err) {
        console.error('Branch API error', err);
        return null;
    }
}

/** 4) Check if a non-initialized deep link exists */
async function getUninitializedDeepLink() {
    const { data, error } = await supabaseClient
        .from('deep_links')
        .select('id')
        .match({
            status: 'uninitialized',
        });
    if (error) {
        console.error('DL lookup failed', error.message);
        return null;
    }
    return data && data[0]?.id;
}

/** Update the existing deep link record */
async function updateDeepLinkRecord({
    deepLinkId,
    slug,
    name,
    eventId,
    promoCodeId,
    organizerId,
    type,
}: {
    deepLinkId: number;
    slug: string;
    name: string;
    eventId: number;
    promoCodeId: number;
    organizerId: number;
    type: string;
}) {
    const updates = {
        name,
        slug,
        featured_event_id: eventId,
        featured_promo_code_id: promoCodeId,
        organizer_id: organizerId,
        status: 'active',
        type,
    };

    const { data, error } = await supabaseClient
        .from('deep_links')
        .update(updates)
        .eq('id', deepLinkId)
        .select('*');

    if (error) {
        console.error('Update deep link failed', error.message);
        return null;
    }
    return data && data[0]?.id;
}

/** Process one CSV row end-to-end */
async function processRow(row: string[]) {
    const { campaign, percentOff, code, eventLink } = extractRowData(row);
    console.log(`→ ${campaign} @ ${eventLink}`);

    const event = await findEventByLink(eventLink);
    if (!event) return;

    const promoCodeId = await upsertPromoCode(
        event.organizer_id,
        code,
        percentOff
    );
    if (!promoCodeId) return;

    const deepLinkId = await getUninitializedDeepLink();
    if (!deepLinkId) {
        console.log('No uninitialized deep link to update, skipping');
        return;
    }

    const payload = buildBranchPayload(
        campaign,
        percentOff,
        event.organizer_id,
        event.id,
        code
    );
    const slug = await updateBranchDeepLink(payload, slug);
    await updateDeepLinkRecord({
        deepLinkId,
        slug,
        name: campaign,
        eventId: event.id,
        promoCodeId,
        organizerId: event.organizer_id,
        type: 'event_promo_code',
    });

    // also update [TEST] deep link if present
    const testDeepLinkId = await getUninitializedDeepLink();
    if (testDeepLinkId) {
        const testPayload = {
            ...payload,
            campaign: `[TEST] ${campaign}`,
            data: { ...payload.data, $marketing_title: `[TEST] ${campaign}` },
        };
        const testSlug = await updateBranchDeepLink(testPayload as any);
        await updateDeepLinkRecord({
            deepLinkId: testDeepLinkId,
            slug: testSlug,
            name: `[TEST] ${campaign}`,
            eventId: event.id,
            promoCodeId,
            organizerId: event.organizer_id,
            type: 'event_promo_code',
        });
    }

    console.log('✅ Done:', campaign);
}

/** Reads & processes each CSV line (skips header) */
async function processCSV(filePath: string) {
    const parser = fs
        .createReadStream(filePath)
        .pipe(csvParse({ delimiter: ',', from_line: 2 }));
    for await (const row of parser) {
        await processRow(row as string[]);
    }
}

/** Entrypoint */
async function main() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Usage: node createDeepLinksFromSheet.js <csv_file_path>');
        process.exit(1);
    }
    try {
        await processCSV(filePath);
        console.log('All rows processed.');
    } catch (err) {
        console.error('Error processing CSV:', err);
    }
}

main();
