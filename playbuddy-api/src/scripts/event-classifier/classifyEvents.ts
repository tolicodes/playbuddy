import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { neighborhoodOnlyPrompt, priceOnlyPrompt, systemPrompt } from './systemPrompt.js';
import { supabaseClient } from '../../connections/supabaseClient.js';
import { Classification, Event } from '../../commonTypes.js';
import { flushEvents } from '../../helpers/flushCache.js';
import { matchEventsToFacilitators } from '../../routes/helpers/matchEventsToFaciliator.js';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type ClassifyOptions = {
    neighborhoodOnly?: boolean;
    priceOnly?: boolean;
};

async function fetchQueuedEvents(options: ClassifyOptions = {}): Promise<Event[]> {
    let query = supabaseClient
        .from('events')
        .select(`*,
            organizer:organizers(
                name
            )
        `)
        .gte('start_date', new Date().toISOString());

    if (options.neighborhoodOnly) {
        query = query.or('neighborhood.is.null,neighborhood.eq.""');
    } else if (options.priceOnly) {
        query = query.or('price.is.null,price.eq."",short_price.is.null,short_price.eq.""');
    } else {
        query = query.or('classification_status.is.null,classification_status.eq.queued');
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching events:', error);
        return [];
    }
    return data ?? [];
}

// Adjust as needed to match your schema
export type UUID = string;

export type EventType =
    | 'munch'
    | 'play_party'
    | 'class'
    | 'social'
    | 'workshop'
    | string;

export type EventUpdate = Partial<Omit<Event, 'id' | 'created_at'>> & {
    id?: never;
    created_at?: never;
};

export type CandidateEventPatch = Partial<Pick<
    EventUpdate,
    'type' | 'short_description' | 'vetted' | 'vetting_url' | 'location' | 'hosts' | 'price' | 'short_price'
>>;

export type NullableGuardedKeys =
    | 'vetted'
    | 'non_ny'
    | 'is_munch'
    | 'play_party'
    | 'price';

export type EventUpdatePayload = Partial<EventUpdate>;


async function updateSupabaseAndWriteToFile(
    classifications: Classification[],
    options: ClassifyOptions = {},
) {
    const mode = options.neighborhoodOnly
        ? 'neighborhood'
        : options.priceOnly
            ? 'price'
            : 'full';
    for (let i = 0; i < classifications.length; i++) {
        const c = classifications[i];
        const event_id = c.event_id;

        if (mode === 'neighborhood') {
            const neighborhood = typeof c.neighborhood === 'string' ? c.neighborhood.trim() : '';
            if (!neighborhood) {
                continue;
            }
            const { error: updateError } = await supabaseClient
                .from('events')
                .update({ neighborhood })
                .eq('id', event_id)
                .or('neighborhood.is.null,neighborhood.eq.""');

            if (updateError) {
                console.error(`Neighborhood update error for ${event_id}:`, updateError);
            }
            continue;
        }

        if (mode === 'price') {
            const { data: existing, error: fetchError } = await supabaseClient
                .from('events')
                .select('price, short_price')
                .eq('id', event_id)
                .single();

            if (fetchError) {
                console.error('Error fetching event:', fetchError);
                continue;
            }

            const updateFields: EventUpdatePayload = {};
            const incomingPrice = typeof c.price === 'string' ? c.price.trim() : '';
            if ((!existing.price || existing.price === '') && incomingPrice) {
                updateFields.price = incomingPrice;
            }
            if ((!existing.short_price || existing.short_price === '') && c.short_price !== undefined) {
                updateFields.short_price = c.short_price;
            }

            if (Object.keys(updateFields).length > 0) {
                const { error: updateError } = await supabaseClient
                    .from('events')
                    .update(updateFields)
                    .eq('id', event_id);

                if (updateError) {
                    console.error(`Price update error for ${event_id}:`, updateError);
                }
            }
            continue;
        }

        const { error: upsertError } = await supabaseClient
            .from('classifications')
            .upsert(
                [{
                    event_id,
                    tags: c.tags,
                    experience_level: c.experience_level,
                    interactivity_level: c.interactivity_level,
                    inclusivity: c.inclusivity,
                }],
                { onConflict: 'event_id' }
            );

        // Step 1: Fetch the current event
        const { data: existing, error: fetchError } = await supabaseClient
            .from('events')
            .select('*')
            .eq('id', event_id)
            .single();

        if (fetchError) {
            console.error('Error fetching event:', fetchError);
            return;
        }

        // Step 2: Build an update object only for null fields
        const updateFields: EventUpdatePayload = {};

        if (existing.vetted === null) {
            updateFields.vetted = c.vetted;
        }
        if (existing.non_ny === null) {
            updateFields.non_ny = c.non_ny;
        }
        if (existing.is_munch === null) {
            updateFields.is_munch = c.type === 'munch';
        }
        if (existing.play_party === null) {
            updateFields.play_party = c.type === 'play_party';
        }
        if (existing.price === null) {
            updateFields.price = c.price;
        }
        if ((existing.short_price === null || existing.short_price === '') && c.short_price !== undefined) {
            updateFields.short_price = c.short_price;
        }

        // You can still update always-overwritten fields here
        updateFields.type = c.type;
        updateFields.short_description = c.short_description;
        updateFields.vetting_url = c.vetting_url;
        updateFields.location = c.location;
        updateFields.neighborhood = c.neighborhood;
        updateFields.hosts = c.hosts;

        // Step 3: Only update if there's something to change
        if (Object.keys(updateFields).length > 0) {
            const { error: updateError } = await supabaseClient
                .from('events')
                .update(updateFields)
                .eq('id', event_id);


            if (upsertError || updateError) {
                console.error(`Upsert error for ${event_id}:`, upsertError || updateError);
                continue;
            }
        }

        const { error: classificationUpdateError } = await supabaseClient
            .from('events')
            .update({ classification_status: 'auto_classified' })
            .eq('id', event_id);

        if (classificationUpdateError) {
            console.error(`Update error for ${event_id}:`, classificationUpdateError);
            continue;
        }

    }

    if (mode === 'full') {
        await matchEventsToFacilitators({ dryRun: false });
    }

    await flushEvents();

    await fs.appendFile(OUTPUT_PATH, JSON.stringify(classifications, null, 2));
    console.log(`Wrote batch to ${OUTPUT_PATH}`);
}

function chunkArray(array: any[], chunkSize: number) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize)
        chunks.push(array.slice(i, i + chunkSize));
    return chunks;
}

const MAX_EVENTS = Infinity;
const OUTPUT_PATH = './classifications.json';
export async function classifyEventsInBatches(batchSize = 10, options: ClassifyOptions = {}) {
    const neighborhoodOnly = options.neighborhoodOnly === true;
    const priceOnly = options.priceOnly === true;
    const events = await fetchQueuedEvents(options);

    const results = [];

    const batches = chunkArray(events.slice(0, MAX_EVENTS), batchSize);

    try {
        if (await fs.stat(OUTPUT_PATH).catch(() => false)) {
            await fs.unlink(OUTPUT_PATH);
        }
    } catch (e) {
        console.log('No previous classifications file found');
    }

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Classifying batch ${i + 1} of ${batches.length}`);

        const userPrompt = batch.map(event => {
            return `
                ID: ${event.id}
                Title: ${event.name}
                Organizer: ${event.organizer?.name || ''}
                Price: ${event.price || ''}
                Location: ${event.location || ''}
                City: ${event.city || ''}
                Region: ${event.region || ''}
                Country: ${event.country || ''}
                Description: ${event.description || ''}`;
        }).join('\n\n');

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: neighborhoodOnly
                        ? neighborhoodOnlyPrompt
                        : priceOnly
                            ? priceOnlyPrompt
                            : systemPrompt,
                },
                { role: 'user', content: userPrompt }
            ]
        });

        const classifications = JSON.parse(response.choices[0].message.content!).events;
        results.push(...classifications);
        await updateSupabaseAndWriteToFile(results, options);

        console.log('Classified', classifications);
    }

    return results;
}
