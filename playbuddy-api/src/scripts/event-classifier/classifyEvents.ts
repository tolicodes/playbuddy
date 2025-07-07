import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { systemPrompt } from './systemPrompt.js';
import { supabaseClient } from '../../connections/supabaseClient.js';
import { Classification } from '../../commonTypes.js';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fetchQueuedEvents(): Promise<any[]> {
    const { data, error } = await supabaseClient
        .from('events')
        .select('*')
        .is('classification_status', null)
        .gte('start_date', new Date().toISOString());

    if (error) {
        console.error('Error fetching events:', error);
        return [];
    }
    return data ?? [];
}

async function updateSupabaseAndWriteToFile(
    classifications: Classification[],
    outputPath: string
) {
    for (let i = 0; i < classifications.length; i++) {
        const c = classifications[i];
        const event_id = c.event_id;

        const { error: upsertError } = await supabaseClient
            .from('classifications')
            .upsert({
                event_id,
                event_themes: c.event_themes,
                comfort_level: c.comfort_level,
                experience_level: c.experience_level,
                interactivity_level: c.interactivity_level,
            });

        if (upsertError) {
            console.error(`Upsert error for ${event_id}:`, upsertError);
            continue;
        }

        const { error: updateError } = await supabaseClient
            .from('events')
            .update({ classification_status: 'auto_classified' })
            .eq('id', event_id);

        if (updateError) {
            console.error(`Update error for ${event_id}:`, updateError);
            continue;
        }

    }

    await fs.writeFile(outputPath, JSON.stringify(classifications, null, 2));
    console.log(`Wrote batch to ${outputPath}`);
}

function chunkArray(array: any[], chunkSize: number) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize)
        chunks.push(array.slice(i, i + chunkSize));
    return chunks;
}

export async function classifyEventsInBatches(batchSize = 10) {
    const events = await fetchQueuedEvents();
    const results = [];

    const batches = chunkArray(events.slice(0, Infinity), batchSize);

    for (const batch of batches) {
        const userPrompt = batch.map(event => {
            return `ID: ${event.id}\nTitle: ${event.title}\nDescription: ${event.description || ''}`;
        }).join('\n\n');

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]
        });

        const classifications = JSON.parse(response.choices[0].message.content!).events;
        results.push(...classifications);
        console.log('Classified', classifications);
    }

    updateSupabaseAndWriteToFile(results, 'classifications.json');

    return results;
}
