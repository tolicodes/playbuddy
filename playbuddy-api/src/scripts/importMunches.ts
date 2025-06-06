/**
 * import_munches_supabase.js
 *
 * A Node.js script to read a CSV of munches and insert each row into the `munches` table
 * in your Supabase project.
 *
 * Usage:
 *   1. Install dependencies:
 *      npm install @supabase/supabase-js csv-parser
 *
 *   2. Ensure you have the following environment variables set:
 *      - SUPABASE_URL (e.g. "https://xyzcompany.supabase.co")
 *      - SUPABASE_SERVICE_ROLE_KEY (your service role API key)
 *
 *   3. Place your CSV file (matching the raw sheet’s headers) in the project directory,
 *      named `munches.csv` (or adjust the path in the code).
 *
 *   4. Run:
 *      node import_munches_supabase.js
 */

import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { supabaseClient } from "connections/supabaseClient";

// ─── ESM __dirname / __filename shim ─────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


async function importMunches() {
    // 2) Read all rows from CSV into an array
    const rows: any[] = [];
    const csvPath = path.join(__dirname, 'data', 'munches.csv');

    await new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on("data", (row) => {
                rows.push(row);
            })
            .on("end", () => {
                console.log(`Parsed ${rows.length} rows from CSV`);
                // @ts-expect-error
                resolve();
            })
            .on("error", (err) => {
                reject(err);
            });
    });

    // 3) For each row, insert into `munches`
    for (const row of rows) {
        // Map CSV columns to table columns. Adjust keys if your headers differ.
        const payload = {
            title: row["Name of Munch/Social"] || null,
            location: row["Munch/Social Borough & Location"] || null,
            hosts: row["Munch/Social Hosts & Leaders"] || null,
            ig_handle: row["Munch/Social Information"] || null,
            cadence: row["Munch/Social Cadence"] || null,
            schedule_text: row["Munch/Social Schedule"] || null,
            cost_of_entry: row["Munch/Social Cost of Entry"] || null,
            age_restriction: row["Munch/Social Age Restriction"] || null,
            open_to_everyone: row["Open to everyone?"] || null,
            main_audience: row["Munch/Social Main Audience"] || null,
            status: row["Munch/Social Status"] || null,
            notes: row["Munch/Social Notes"] || null,
        };

        // If all fields are null or title is missing, skip
        if (!payload.title) {
            console.warn("Skipping row with missing title:", row);
            continue;
        }

        try {
            const { data, error } = await supabaseClient
                .from("munches")
                .insert(payload)
                .select("id"); // return the newly inserted id

            if (error) {
                console.error(
                    `Error inserting munch (“${payload.title}”):`,
                    error.message
                );
            } else {
                console.log(`Inserted munch id=${data[0].id} (“${payload.title}”)`);
            }
        } catch (err) {
            console.error(
                `Unexpected error inserting munch (“${payload.title}”):`,
                // @ts-err.message
            );
        }
    }

    console.log("All rows processed.");
}

// Kick off the import
importMunches();
