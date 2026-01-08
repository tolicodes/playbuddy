#!/usr/bin/env ts-node

/**
 * Build a 3-core graph (each node has >= 3 total connections within the final subgraph).
 * - Reads:  /input/following-*.json  (arrays of { username, following_of, ... })
 * - A -> B means A follows B
 * - Connection degree is |followers ∪ following| within the current subgraph
 * - Iteratively prune nodes with degree < 3 until stable (k-core with k=3)
 *
 * Writes to ./outputs:
 *   - nodes.json   array of:
 *       {
 *         "username": "sucianyc",
 *         "followers": 2,
 *         "following": 2,
 *         "followersList": ["a","b"],
 *         "followingList": ["c","d"],
 *         "totalConnections": 4
 *       }
 *     Only nodes in the 3-core, lists restricted to the 3-core.
 *   - graph.json   adjacency list (following only) for 3-core nodes
 *   - all_usernames.txt usernames in the 3-core, sorted by connections desc
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

type Row = {
    username: string;
    following_of: string;
    full_name?: string;
    id?: string;
    is_private?: boolean;
    is_verified?: boolean;
    latest_reel_media?: number;
    profile_pic_url?: string;
};

const INPUT_DIR = "./input";
const OUTPUT_DIR = "./output";
const FILE_GLOB_REGEX = /^following-.*\.json$/i;
const MIN_CONNECTIONS = 3;

async function listInputFiles(dir: string): Promise<string[]> {
    const names = await fs.readdir(dir);
    return names.filter(n => FILE_GLOB_REGEX.test(n)).map(n => path.join(dir, n));
}

async function readAllRows(files: string[]): Promise<Row[]> {
    const out: Row[] = [];
    for (const f of files) {
        const raw = await fs.readFile(f, "utf8");
        if (!raw.trim()) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            for (const item of parsed) {
                if (item && item.username && item.following_of) {
                    out.push({
                        username: String(item.username),
                        following_of: String(item.following_of),
                        full_name: item.full_name,
                        id: item.id,
                        is_private: item.is_private,
                        is_verified: item.is_verified,
                        latest_reel_media: item.latest_reel_media,
                        profile_pic_url: item.profile_pic_url,
                    });
                }
            }
        } else if (parsed && parsed.username && parsed.following_of) {
            // Handle rare case of a single object file
            out.push({
                username: String(parsed.username),
                following_of: String(parsed.following_of),
                full_name: parsed.full_name,
                id: parsed.id,
                is_private: parsed.is_private,
                is_verified: parsed.is_verified,
                latest_reel_media: parsed.latest_reel_media,
                profile_pic_url: parsed.profile_pic_url,
            });
        }
    }
    return out;
}

function buildMaps(rows: Row[]) {
    const allUsers = new Set<string>();
    for (const r of rows) {
        allUsers.add(r.username);
        allUsers.add(r.following_of);
    }
    const followingMap = new Map<string, Set<string>>(); // u -> set of v that u follows
    const followersMap = new Map<string, Set<string>>(); // v -> set of u that follow v

    const ensure = (m: Map<string, Set<string>>, k: string) => {
        if (!m.has(k)) m.set(k, new Set());
        return m.get(k)!;
    };

    for (const u of allUsers) {
        ensure(followingMap, u);
        ensure(followersMap, u);
    }
    for (const r of rows) {
        ensure(followingMap, r.username).add(r.following_of);
        ensure(followersMap, r.following_of).add(r.username);
    }

    return { allUsers, followingMap, followersMap };
}

function degreeInSet(u: string, set: Set<string>, followersMap: Map<string, Set<string>>, followingMap: Map<string, Set<string>>): number {
    const followers = followersMap.get(u) || new Set();
    const following = followingMap.get(u) || new Set();
    const uniq = new Set<string>();
    for (const v of followers) if (set.has(v)) uniq.add(v);
    for (const v of following) if (set.has(v)) uniq.add(v);
    return uniq.size;
}

/** Compute k-core (k = MIN_CONNECTIONS) using iterative pruning on union-degree */
function computeKCore(allUsers: Set<string>, followersMap: Map<string, Set<string>>, followingMap: Map<string, Set<string>>): Set<string> {
    const keep = new Set(allUsers);
    let changed = true;
    while (changed) {
        changed = false;
        const toDrop: string[] = [];
        for (const u of keep) {
            const deg = degreeInSet(u, keep, followersMap, followingMap);
            if (deg < MIN_CONNECTIONS) toDrop.push(u);
        }
        if (toDrop.length > 0) {
            changed = true;
            for (const u of toDrop) keep.delete(u);
        }
    }
    return keep;
}

function toSortedArray(set?: Set<string>): string[] {
    return set ? Array.from(set).sort((a, b) => a.localeCompare(b)) : [];
}

async function main() {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    const inputFiles = await listInputFiles(INPUT_DIR);
    if (inputFiles.length === 0) {
        console.error("No /input/following-*.json files found.");
        process.exit(1);
    }

    const rows = await readAllRows(inputFiles);
    const { allUsers, followingMap, followersMap } = buildMaps(rows);

    // Compute 3-core on union-degree
    const core = computeKCore(allUsers, followersMap, followingMap);

    // Build output only for usernames in the core
    type NodeOut = {
        username: string;
        followers: number;
        following: number;
        followersList: string[];
        followingList: string[];
        totalConnections: number;
    };

    const nodes: NodeOut[] = [];
    for (const user of core) {
        const followersList = toSortedArray(new Set([...(followersMap.get(user) || new Set())].filter(v => core.has(v))));
        const followingList = toSortedArray(new Set([...(followingMap.get(user) || new Set())].filter(v => core.has(v))));
        const union = new Set<string>([...followersList, ...followingList]);
        nodes.push({
            username: user,
            followers: followersList.length,
            following: followingList.length,
            followersList,
            followingList,
            totalConnections: union.size,
        });
    }

    // Sort by connections desc, then username asc
    nodes.sort((a, b) => {
        if (b.totalConnections !== a.totalConnections) return b.totalConnections - a.totalConnections;
        return a.username.localeCompare(b.username);
    });

    // Write outputs (only core usernames appear anywhere)
    await fs.writeFile(path.join(OUTPUT_DIR, "nodes.json"), JSON.stringify(nodes, null, 2), "utf8");

    const graphObj = Object.fromEntries(nodes.map(n => [n.username, n.followingList]));
    await fs.writeFile(path.join(OUTPUT_DIR, "graph.json"), JSON.stringify(graphObj, null, 2), "utf8");

    await fs.writeFile(path.join(OUTPUT_DIR, "all_usernames.txt"), nodes.map(n => n.username).join("\n") + "\n", "utf8");

    console.log(`✅ Wrote ${nodes.length} nodes to ./outputs (3-core, connections desc)`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
