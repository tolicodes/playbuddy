#!/usr/bin/env ts-node

/**
 * Outsider frequency counter
 * Counts how many times a username appears as `username` in /input/following-*.json
 * Filters out usernames present in /input/profiles.json
 * Keeps only count > 3, sorted by count desc then username asc
 *
 * Outputs in ./outputs:
 *   - outsider_following_counts.json  [{ username, count }]
 *   - outsider_usernames.txt          usernames only, one per line
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

const INPUT_DIR = "./input";
const OUTPUT_DIR = "./output";
const PROFILES_FILE = "./input/profiles.json";
const FILE_GLOB_REGEX = /^following-.*\.json$/i;
const MIN_COUNT = 3;

type Row = { username?: string; following_of?: string };

async function listInputFiles(dir: string): Promise<string[]> {
    const names = await fs.readdir(dir);
    return names.filter(n => FILE_GLOB_REGEX.test(n)).map(n => path.join(dir, n));
}

async function readImmediateUsernames(file: string): Promise<Set<string>> {
    try {
        const raw = await fs.readFile(file, "utf8");
        const data = JSON.parse(raw);
        const set = new Set<string>();

        const add = (v: any) => {
            if (!v) return;
            if (typeof v === "string") set.add(v);
            else if (typeof v.username === "string") set.add(v.username);
        };

        if (Array.isArray(data)) {
            data.forEach(add);
        } else if (Array.isArray(data?.profiles)) {
            data.profiles.forEach(add);
        } else if (typeof data?.username === "string") {
            set.add(data.username);
        }

        return set;
    } catch {
        return new Set<string>();
    }
}

async function main() {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    const files = await listInputFiles(INPUT_DIR);
    if (files.length === 0) {
        console.error("No /input/following-*.json files found.");
        process.exit(1);
    }

    // Count appearances of `username`
    const counts = new Map<string, number>();
    for (const file of files) {
        const raw = await fs.readFile(file, "utf8");
        if (!raw.trim()) continue;
        const parsed = JSON.parse(raw);
        const rows: Row[] = Array.isArray(parsed) ? parsed : [parsed];
        for (const r of rows) {
            if (r && typeof r.username === "string" && r.username.trim()) {
                const u = r.username.trim();
                counts.set(u, (counts.get(u) || 0) + 1);
            }
        }
    }

    // Filter out immediate network from profiles.json
    const immediate = await readImmediateUsernames(PROFILES_FILE);

    // Build outsiders list with count > 3
    const outsiders = Array.from(counts.entries())
        .filter(([u, c]) => c > MIN_COUNT && !immediate.has(u))
        .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
        .map(([username, count]) => ({ username, count }));

    // Write outputs
    await fs.writeFile(
        path.join(OUTPUT_DIR, "outsider_following_counts.json"),
        JSON.stringify(outsiders, null, 2),
        "utf8"
    );

    await fs.writeFile(
        path.join(OUTPUT_DIR, "outsider_usernames.txt"),
        outsiders.map(o => o.username).join("\n") + "\n",
        "utf8"
    );

    console.log(`✅ Wrote ${outsiders.length} outsiders to ./outputs (count > ${MIN_COUNT})`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
