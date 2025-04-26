import fs from 'fs';
import { supabaseClient } from 'connections/supabaseClient';
import { parse as csvParse } from 'csv-parse';

async function insertWeeklyPick({
    deep_link_id,
    event_id,
    featured_promo_code_id,
    description,
}: {
    deep_link_id: string;
    event_id: string;
    featured_promo_code_id: string;
    description: string;
}) {
    const { data, error } = await supabaseClient
        .from('deep_link_events')
        .insert(
            {
                deep_link_id,
                event_id,
                // featured_promo_code_id,
                description,
            },
        )
        .select('*')
        .maybeSingle();

    if (error) {
        console.error(
            `deep_link_events upsert failed for deep_link_id=${deep_link_id}, event_id=${event_id}, featured_promo_code_id=${featured_promo_code_id}`,
            error.message
        );
        return null;
    }

    // since your table has no `id` column, return the full row (or pick out whichever fields you need)
    return data;
}

function extractRowData(row: string[]) {
    return {
        deep_link_id: row[0].trim(),
        event_id: row[1].trim(),
        featured_promo_code_id: row[3].trim(),  // assuming your CSV layout matches this
        description: row[4].trim(),
    };
}

async function processRow(row: string[]) {
    const { deep_link_id, event_id, featured_promo_code_id, description } = extractRowData(row);
    await insertWeeklyPick({ deep_link_id, event_id, featured_promo_code_id, description });
}

async function processCSV(filePath: string) {
    const parser = fs
        .createReadStream(filePath)
        .pipe(csvParse({ delimiter: ',', from_line: 2 }));

    for await (const row of parser) {
        await processRow(row as string[]);
    }
}

async function main() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Usage: node createWeeklyPicks.js <csv_file_path>');
        process.exit(1);
    }
    try {
        await processCSV(filePath);
        console.log('All rows processed.');
    } catch (err) {
        console.error('Error processing CSV:', err);
        process.exit(1);
    }
}

main();
