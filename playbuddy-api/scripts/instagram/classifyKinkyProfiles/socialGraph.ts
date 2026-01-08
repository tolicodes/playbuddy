#!/usr/bin/env ts-node

/**
 * Follow Graph Debugger (followings only)
 * ---------------------------------------
 * Uses ONLY input/following.json (edge: { username: "<A>", following_of: "<B>" } meaning B -> A).
 * Optionally reads input/profiles.json to expand the user universe, but no tags/mentions are parsed.
 *
 * Per user, outputs:
 *  - followings (outbound): users they follow
 *  - followers  (inbound) : users who follow them
 *  - mutualFollows        : intersection (they follow each other)
 *
 * Outputs:
 *  - output/follows_debug.json
 *  - output/follows_debug.txt
 *
 * CLI:
 *  npx tsx debug_follows.ts [--profile=username] [--limit=N] [--debug]
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

type FollowEdge = { username: string; following_of: string }; // B -> A (B follows A)
type Profile = { username?: string };

const ROOT = process.cwd();
const log = (...args: any[]) => console.log('[FOLLOWS-DBG]', ...args);

function parseArgs(argv: string[]) {
    const out: Record<string, any> = { debug: false, limit: undefined as number | undefined, profile: undefined as string | undefined };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--debug') out.debug = true;
        else if (a.startsWith('--limit=')) out.limit = parseInt(a.split('=')[1], 10);
        else if (a.startsWith('--profile=')) out.profile = a.split('=')[1];
    }
    return out;
}

function normUser(u?: string): string {
    if (!u) return '';
    return u.trim().replace(/^@+/, '').toLowerCase();
}
function uniq<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

async function loadFollowing(): Promise<FollowEdge[]> {
    const p = path.resolve(ROOT, 'input', 'following.json');
    const data = JSON.parse(await fs.readFile(p, 'utf8'));
    if (!Array.isArray(data) || data.length === 0) throw new Error('following.json missing or empty');
    return data;
}
async function loadProfilesIfAny(): Promise<Profile[]> {
    const p = path.resolve(ROOT, 'input', 'profiles.json');
    try {
        const raw = await fs.readFile(p, 'utf8');
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function buildFollowMaps(edges: FollowEdge[]) {
    const FollowsOut = new Map<string, Set<string>>(); // who -> they follow
    const FollowsIn = new Map<string, Set<string>>(); // who -> followers

    for (const e of edges) {
        const A = normUser(e.username);      // A is followed
        const B = normUser(e.following_of);  // B follows A  (B -> A)
        if (!A || !B || A === B) continue;

        if (!FollowsOut.has(B)) FollowsOut.set(B, new Set());
        if (!FollowsIn.has(A)) FollowsIn.set(A, new Set());
        FollowsOut.get(B)!.add(A);
        FollowsIn.get(A)!.add(B);
    }

    return { FollowsOut, FollowsIn };
}

async function main() {
    const args = parseArgs(process.argv);
    const outDir = path.resolve(ROOT, 'output');

    const following = await loadFollowing();
    const profiles = await loadProfilesIfAny();

    const { FollowsOut, FollowsIn } = buildFollowMaps(following);

    // Build universe from both follows edges and profiles (if present)
    const universe = new Set<string>();
    for (const e of following) {
        const A = normUser(e.username);
        const B = normUser(e.following_of);
        if (A) universe.add(A);
        if (B) universe.add(B);
    }
    for (const p of profiles) {
        const u = normUser(p.username);
        if (u) universe.add(u);
    }

    const usernames = Array.from(universe).sort();

    // Build rows
    const rows = usernames
        .filter(u => (args.profile ? u.includes(normUser(args.profile)) : true))
        .map(u => {
            const followings = Array.from(FollowsOut.get(u) || []);
            const followers = Array.from(FollowsIn.get(u) || []);
            const mutualFollows = followings.filter(x => (FollowsIn.get(u)?.has(x) && FollowsOut.get(x)?.has(u)));

            return {
                username: u,
                counts: {
                    followings: followings.length,
                    followers: followers.length,
                    mutualFollows: uniq(mutualFollows).length,
                },
                followings: followings.sort(),
                followers: followers.sort(),
                mutualFollows: uniq(mutualFollows).sort(),
            };
        })
        .sort((a, b) =>
            b.counts.mutualFollows - a.counts.mutualFollows ||
            b.counts.followers - a.counts.followers ||
            a.username.localeCompare(b.username)
        );

    const final = typeof args.limit === 'number' ? rows.slice(0, args.limit) : rows;

    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(path.join(outDir, 'follows_debug.json'), JSON.stringify(final, null, 2), 'utf8');

    // Pretty text
    const lines: string[] = [];
    for (const r of final) {
        lines.push(
            `@${r.username}`,
            `  follows  → followings(${r.counts.followings}): ${r.followings.join(', ') || '—'}`,
            `  follows  ← followers (${r.counts.followers}): ${r.followers.join(', ') || '—'}`,
            `  follows  ⇄ mutual   (${r.counts.mutualFollows}): ${r.mutualFollows.join(', ') || '—'}`,
            ``
        );
    }
    await fs.writeFile(path.join(outDir, 'follows_debug.txt'), lines.join('\n'), 'utf8');

    if (args.debug) {
        const totalFollowEdges = final.reduce((acc, r) => acc + r.counts.followings, 0);
        const sourcesWithFollow = final.filter(r => r.counts.followings > 0).length;
        const sinksWithFollow = final.filter(r => r.counts.followers > 0).length;

        log('Diagnostics:', {
            users: final.length,
            totalFollowEdges,
            followSources: sourcesWithFollow,
            followTargets: sinksWithFollow
        });

        if (args.profile) {
            const q = normUser(args.profile);
            const r = final.find(x => x.username === q);
            if (r) {
                log('Sample:', {
                    username: r.username,
                    followings: r.followings.slice(0, 50),
                    followers: r.followers.slice(0, 50),
                    mutualFollows: r.mutualFollows.slice(0, 50),
                });
            } else {
                log(`No entry found for "${q}"`);
            }
        }
    }

    log(`Wrote:
  - output/follows_debug.json
  - output/follows_debug.txt`);
}

main().catch(err => {
    console.error('[FOLLOWS-DBG:ERROR]', err?.stack || err?.message || err);
    process.exit(1);
});
