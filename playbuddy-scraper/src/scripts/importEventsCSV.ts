import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { writeEventsToDB } from "../helpers/writeEventsToDB/writeEventsToDB.js";
import { CONSCIOUS_TOUCH_INTEREST_GROUP_COMMUNITY_ID } from "../scrapers/scraper.js";

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const importEventsCSV = async ({
    filePath,
}: {
    filePath: string;
}) => {
    // 1. Read the raw CSV
    const fileContent = readFileSync(filePath, "utf-8");

    // 2. Parse with headers → an array of objects
    const rows: Record<string, string>[] = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    // console.log('img_url', rows[0].image_url)

    // 3. Map each CSV row into our Event type
    const events = rows.map((row) => ({
        original_id: row.original_id || undefined,
        organizer: {
            name: row['organizer.name'],
            url: row['organizer.url']
        },
        name: row.name,
        start_date: row.start_date,
        end_date: row.end_date,
        url: row.ticket_url,
        ticket_url: row.ticket_url,
        event_url: row.ticket_url,
        image_url: row.image_url,
        location: row.location || '',
        price: row.price || '',
        description: row.description,
        vetted: row.vetted === "TRUE",
        type: 'event' as "event" | "retreat",
        play_party: row.play_party === "TRUE",
        recurring: 'none' as 'none' | 'weekly' | 'monthly',
        tags: row.tags ? JSON.parse(row.tags) : [],
        communities: [{
            id: CONSCIOUS_TOUCH_INTEREST_GROUP_COMMUNITY_ID
        }]
    }));


    writeEventsToDB(events);
};

const filePath = path.join(__dirname, 'import.csv')

importEventsCSV({
    filePath,
});

// node --loader ts-node/esm src/scripts/importEventsCSV.ts