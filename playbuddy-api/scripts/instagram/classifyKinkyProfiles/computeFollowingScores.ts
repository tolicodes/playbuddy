#!/usr/bin/env ts-node

/**
 * Compute influence scores from following-*.json files.
 * - Nodes are Instagram handles (normalized).
 * - Edges are A -> B (A follows B).
 * - Score is PageRank-ish: base = log1p(followerCount) + 1, plus inbound influence divided by out-degree.
 * - Outputs ./output/following-scores.json and prints top 20.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

type Edge = { source: string; target: string };
type NodeScore = {
  username: string;
  followers: number;
  following: number;
  followerScore: number;
  influenceScore: number;
};

const FOLLOWING_DIR = path.resolve(__dirname, "data", "following");
const OUTPUT_PATH = path.resolve(__dirname, "output", "following-scores.json");
const ALPHA = 0.2; // base weight vs inbound influence
const ITERATIONS = 14;

const norm = (u?: string) => (u || "").trim().replace(/^@+/, "").toLowerCase();

async function readEdges(): Promise<Edge[]> {
  const files = await fs.readdir(FOLLOWING_DIR);
  const edges: Edge[] = [];
  for (const file of files) {
    if (!/^following-.*\.json$/i.test(file)) continue;
    const raw = await fs.readFile(path.join(FOLLOWING_DIR, file), "utf8");
    if (!raw.trim()) continue;
    const parsed = JSON.parse(raw);
    const arr: any[] = Array.isArray(parsed) ? parsed : [parsed];
    for (const row of arr) {
      const source = norm(row?.username);
      const target = norm(row?.following_of);
      if (source && target) edges.push({ source, target });
    }
  }
  return edges;
}

function computeScores(edges: Edge[]): NodeScore[] {
  const users = new Set<string>();
  for (const { source, target } of edges) {
    users.add(source);
    users.add(target);
  }

  const followers = new Map<string, Set<string>>();
  const inbound = new Map<string, string[]>();
  const outDeg = new Map<string, number>();

  for (const u of users) {
    followers.set(u, new Set());
    inbound.set(u, []);
    outDeg.set(u, 0);
  }

  for (const { source, target } of edges) {
    followers.get(target)!.add(source);
    inbound.get(target)!.push(source);
    outDeg.set(source, (outDeg.get(source) ?? 0) + 1);
  }

  // Filter to users with at least 3 followers
  const filteredUsers = new Set<string>();
  for (const u of users) {
    if (followers.get(u)!.size >= 3) filteredUsers.add(u);
  }

  const filteredEdges = edges.filter(({ source, target }) => filteredUsers.has(source) && filteredUsers.has(target));

  // Rebuild follower/inbound/outDeg for filtered graph
  const fFollowers = new Map<string, Set<string>>();
  const fInbound = new Map<string, string[]>();
  const fOutDeg = new Map<string, number>();
  for (const u of filteredUsers) {
    fFollowers.set(u, new Set());
    fInbound.set(u, []);
    fOutDeg.set(u, 0);
  }
  for (const { source, target } of filteredEdges) {
    fFollowers.get(target)!.add(source);
    fInbound.get(target)!.push(source);
    fOutDeg.set(source, (fOutDeg.get(source) ?? 0) + 1);
  }

  const base = new Map<string, number>();
  for (const u of filteredUsers) {
    base.set(u, Math.log1p(fFollowers.get(u)!.size) + 1);
  }

  let score = new Map<string, number>();
  for (const u of filteredUsers) score.set(u, base.get(u)!);

  for (let i = 0; i < ITERATIONS; i++) {
    const next = new Map<string, number>();
    for (const u of filteredUsers) {
      const incoming = fInbound.get(u)!;
      let contrib = 0;
      for (const src of incoming) {
        const deg = fOutDeg.get(src) || 1;
        contrib += (score.get(src) || 0) / deg;
      }
      next.set(u, ALPHA * base.get(u)! + (1 - ALPHA) * contrib);
    }
    score = next;
  }

  const followingCount = new Map<string, number>();
  for (const u of filteredUsers) followingCount.set(u, 0);
  for (const { source } of filteredEdges) followingCount.set(source, (followingCount.get(source) ?? 0) + 1);

  return Array.from(filteredUsers).map((u) => {
    const followerCount = fFollowers.get(u)!.size;
    return {
      username: u,
      followers: followerCount,
      following: followingCount.get(u) ?? 0,
      followerScore: followerCount,
      influenceScore: score.get(u) ?? 0,
    };
  });
}

async function main() {
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  const edges = await readEdges();
  if (!edges.length) {
    console.error("No following-*.json data found.");
    process.exit(1);
  }

  const scored = computeScores(edges).sort((a, b) => b.influenceScore - a.influenceScore);
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(scored, null, 2), "utf8");

  console.log(`✅ Wrote ${scored.length} scores to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
  console.log("Top 20 (influence):");
  scored.slice(0, 20).forEach((s, idx) => {
    console.log(
      `${idx + 1}. @${s.username} — influence=${s.influenceScore.toFixed(2)} followerScore=${s.followerScore} (followers=${s.followers}, following=${s.following})`
    );
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
