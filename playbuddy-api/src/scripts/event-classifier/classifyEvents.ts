import { supabaseClient } from 'connections/supabaseClient.js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as fs from 'fs'; // Import fs for file writing
import { systemPrompt } from './systemPrompt.js';
import { EventClassifications } from './event_classifications.js';

dotenv.config();

// OpenAI API configuration
const openAIClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Fetch all events marked for classification
async function fetchQueuedEvents(): Promise<any[]> {
    const { data: events, error } = await supabaseClient
        .from('events')
        .select('*')

    if (error) {
        console.error('Error fetching events from Supabase:', error);
        return [];
    }
    return events || [];
}

// Classify a batch of events using OpenAI and poll for the results
async function classifyBatch(eventsBatch: any[]): Promise<any[]> {
    try {
        const assistant = await openAIClient.beta.assistants.create({
            name: "playbuddy-event-classifier",
            instructions: 'Classify a list of kinky events based on specific categories.',
            response_format: { type: "json_object" },
            model: "gpt-4o",
        });

        const thread = await openAIClient.beta.threads.create();
        const run = await openAIClient.beta.threads.runs.createAndPoll(
            thread.id,
            {
                assistant_id: assistant.id,
                response_format: { type: "json_object" },
                instructions: `${systemPrompt} Please classify using JSON scheme above:\n\n${JSON.stringify(eventsBatch, null, 2)}`,
                max_completion_tokens: 200000,
                temperature: 0,
            }
        );

        let elapsedTime = 0;
        return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
                elapsedTime += 1;

                if (run.status === 'completed') {
                    const messages = await openAIClient.beta.threads.messages.list(run.thread_id);
                    const message = messages.data.reverse()[0];
                    // @ts-ignore
                    const val = message.content[0].text.value;
                    let output;
                    try {
                        const events = JSON.parse(val).events;
                        output = events;
                    } catch (e) {
                        console.error('Error parsing message:', val);
                    }
                    console.log('Classification completed.', elapsedTime, 'seconds elapsed.');
                    clearInterval(interval);
                    resolve(output); // Return classification results
                } else {
                    console.log(run.status);
                    if (run.last_error) console.log(run.last_error);
                }

                if (elapsedTime >= 30) {
                    console.log('Timeout reached');
                    clearInterval(interval);
                    reject('Timeout reached');
                }
            }, 1000);
        });
    } catch (error) {
        console.error('Error classifying events batch:', error);
        throw error;
    }
}

// Update Supabase and write output to file
async function updateSupabaseAndWriteToFile(
    eventsBatch: any[],
    classificationResults: any[],
    fileName: string
) {
    console.log({
        classificationResults
    })
    if (eventsBatch.length !== classificationResults.length) {
        console.error('Mismatch between events and classifications.');
        return;
    }

    const fileContent: string[] = [];

    for (let i = 0; i < classificationResults.length; i++) {
        const classifications: EventClassifications = classificationResults[i];

        try {
            const event_id = classifications.event_id;



            // Upsert classifications into "classifications" table using event_id
            const { data: classificationData, error: classificationError } = await supabaseClient
                .from('classifications')
                .upsert({
                    event_id: event_id,
                    event_themes: classifications.event_themes,
                    comfort_level: classifications.comfort_level,
                    experience_level: classifications.experience_level,
                    inclusivity: classifications.inclusivity,
                    interactivity_level: classifications.interactivity_level,

                    // consent_and_safety_policies: classifications.consent_and_safety_policies,
                    // alcohol_and_substance_policies: classifications.alcohol_and_substance_policies,
                    // venue_type: classifications.venue_type,
                    // dress_code: classifications.dress_code,
                    // accessibility: classifications.accessibility,
                });

            // Update the event in the "events" table using event_id
            const { data: eventData, error: eventError } = await supabaseClient
                .from('events')
                .update({
                    classification_status: 'auto_classified',
                })
                .eq('id', event_id);

            if (eventError) {
                console.error(`Error updating event ${event_id}:`, eventError);
            } else {
                console.log(`Event ${event_id} classified and updated.`);
            }

            if (classificationError) {
                console.error(`Error inserting/updating classification for event ${event_id}:`, classificationError);
            } else {
                console.log(`Classification for event ${event_id} saved.`);
            }

            // Write to file
            fileContent.push(`Event ID: ${event_id}\nClassifications: ${JSON.stringify(classifications, null, 2)}\n`);
        } catch (error) {
            console.error(`Error processing event ${classifications.event_id}:`, error);
        }
    }

    // Write classifications to file
    fs.writeFileSync(fileName, fileContent.join('\n'), { flag: 'a' });
    console.log(`Output saved to ${fileName}`);
}

// Main function to classify events in batches and write results to both DB and file
async function classifyEventsInBatches() {
    const outputFileName = 'classified_events_output.txt';

    try {
        const events = await fetchQueuedEvents();

        if (events.length === 0) {
            console.log('No events with classification_status = queued');
            return;
        }

        console.log(`Found ${events.length} events to classify.`);

        // Process events in batches of 5
        const batchSize = 5;
        for (let i = 0; i < events.length; i += batchSize) {
            const batch = events.slice(i, i + batchSize);
            console.log(`Processing batch ${i / batchSize + 1}`);

            try {
                const classificationResults = await classifyBatch(batch);
                await updateSupabaseAndWriteToFile(batch, classificationResults, outputFileName);
            } catch (error) {
                console.error('Error during batch classification:', error);
            }
        }
    } catch (error) {
        console.error('Error classifying events:', error);
    }
}
