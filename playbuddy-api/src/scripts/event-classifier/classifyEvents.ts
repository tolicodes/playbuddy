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
    fields?: string[];
    eventIds?: Array<string | number>;
};

const normalizeField = (value: string) =>
    value.trim().toLowerCase().replace(/[\s-]+/g, '_');
const normalizeFieldList = (fields?: string[]) =>
    Array.isArray(fields) ? fields.map(normalizeField).filter(Boolean) : [];
const normalizeExperienceLevel = (value?: string | null) => {
    if (!value) return value;
    const normalized = value.trim().toLowerCase().replace(/[_-]+/g, ' ');
    if (normalized === 'all levels' || normalized === 'all level' || normalized === 'all') {
        return 'All';
    }
    return value;
};
async function fetchQueuedEvents(options: ClassifyOptions = {}): Promise<Event[]> {
    const nowIso = new Date().toISOString();
    const fieldList = normalizeFieldList(options.fields);
    const hasFieldFilter = fieldList.length > 0;
    let query = supabaseClient
        .from('events')
        .select(`*,
            organizer:organizers(
                name
            )
        `)
        .gte('start_date', nowIso);

    if (Array.isArray(options.eventIds) && options.eventIds.length > 0) {
        query = query.in('id', options.eventIds);
    }

    if (hasFieldFilter || (options.eventIds?.length ?? 0) > 0) {
        // Reclassify mode: target all future events (optionally filtered by id).
    } else if (options.neighborhoodOnly) {
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
    | 'workshop'
    | 'munch'
    | 'play_party'
    | 'festival'
    | 'conference'
    | 'retreat'
    | 'event'
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
    const fieldList = normalizeFieldList(options.fields);
    const fieldSet = new Set(fieldList);
    const hasFieldFilter = fieldSet.size > 0;
    const mode = hasFieldFilter
        ? 'fields'
        : options.neighborhoodOnly
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

        if (mode === 'fields') {
            const shouldUpdate = (field: string) => fieldSet.has(field);

            const classificationPayload: Record<string, any> = {};
            if (shouldUpdate('tags') && c.tags !== undefined) classificationPayload.tags = c.tags;
            if (shouldUpdate('experience_level') && c.experience_level !== undefined) {
                classificationPayload.experience_level = normalizeExperienceLevel(c.experience_level);
            }
            if (shouldUpdate('interactivity_level') && c.interactivity_level !== undefined) {
                classificationPayload.interactivity_level = c.interactivity_level;
            }
            if (shouldUpdate('inclusivity') && c.inclusivity !== undefined) {
                classificationPayload.inclusivity = c.inclusivity;
            }

            if (Object.keys(classificationPayload).length > 0) {
                const { error: upsertError } = await supabaseClient
                    .from('classifications')
                    .upsert(
                        [{ event_id, ...classificationPayload }],
                        { onConflict: 'event_id' }
                    );
                if (upsertError) {
                    console.error(`CLASSIFICATION: Error upserting classification for event ${event_id}: ${upsertError?.message}`);
                }
            }

            const updateFields: EventUpdatePayload = {};
            if (shouldUpdate('type') && c.type !== undefined) {
                updateFields.type = c.type;
                updateFields.is_munch = c.type === 'munch';
                updateFields.play_party = c.type === 'play_party';
            }
            if (shouldUpdate('short_description') && c.short_description !== undefined) {
                updateFields.short_description = c.short_description;
            }
            if (shouldUpdate('vetted') && c.vetted !== undefined) updateFields.vetted = c.vetted;
            if (shouldUpdate('vetting_url') && c.vetting_url !== undefined) {
                updateFields.vetting_url = c.vetting_url;
            }
            if (shouldUpdate('location') && c.location !== undefined) updateFields.location = c.location;
            if (shouldUpdate('neighborhood') && c.neighborhood !== undefined) {
                updateFields.neighborhood = c.neighborhood;
            }
            if (shouldUpdate('hosts') && c.hosts !== undefined) updateFields.hosts = c.hosts;
            if (shouldUpdate('non_ny') && c.non_ny !== undefined) updateFields.non_ny = c.non_ny;
            if (shouldUpdate('price') && c.price !== undefined) updateFields.price = c.price;
            if (shouldUpdate('short_price') && c.short_price !== undefined) {
                updateFields.short_price = c.short_price;
            }

            if (Object.keys(updateFields).length > 0) {
                const { error: updateError } = await supabaseClient
                    .from('events')
                    .update(updateFields)
                    .eq('id', event_id);

                if (updateError) {
                    console.error(`Update error for ${event_id}:`, updateError);
                }
            }

            if (Object.keys(updateFields).length > 0 || Object.keys(classificationPayload).length > 0) {
                const { error: classificationUpdateError } = await supabaseClient
                    .from('events')
                    .update({ classification_status: 'auto_classified' })
                    .eq('id', event_id);

                if (classificationUpdateError) {
                    console.error(`Update error for ${event_id}:`, classificationUpdateError);
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
                    experience_level: normalizeExperienceLevel(c.experience_level),
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
    const fieldList = normalizeFieldList(options.fields);
    const fieldSet = new Set(fieldList);
    const promptNeighborhoodOnly =
        options.neighborhoodOnly === true ||
        (!options.priceOnly && !options.neighborhoodOnly && fieldSet.size === 1 && fieldSet.has('neighborhood'));
    const promptPriceOnly =
        options.priceOnly === true ||
        (!options.priceOnly &&
            !options.neighborhoodOnly &&
            fieldSet.size > 0 &&
            fieldSet.has('price') &&
            (fieldSet.size === 1 || (fieldSet.size === 2 && fieldSet.has('short_price'))));
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
                Start Date: ${event.start_date || ''}
                End Date: ${event.end_date || ''}
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
                    content: promptNeighborhoodOnly
                        ? neighborhoodOnlyPrompt
                        : promptPriceOnly
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
