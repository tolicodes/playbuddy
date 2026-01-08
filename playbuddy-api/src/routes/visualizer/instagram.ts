import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

export type VisualizerInfo = {
    id: string;
    description: string;
    path: string;
    command: string;
};

export const igVisualizers: VisualizerInfo[] = [
    {
        id: 'instagram/visualize-following',
        description: 'Follow graph visualizer using cached data/following files.',
        path: 'playbuddy-api/scripts/instagram/classifyKinkyProfiles/data/following',
        command: 'n/a',
    },
];

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prefer repo-root data dir (works in dev and prod), fallback to relative dist path
const IG_BASE = (() => {
    const candidates = [
        path.resolve(__dirname, '../..', 'scripts/instagram/classifyKinkyProfiles'), // from dist/routes/visualizer
        path.resolve(process.cwd(), 'scripts/instagram/classifyKinkyProfiles'),
        path.resolve(__dirname, '../../scripts/instagram/classifyKinkyProfiles'),
    ];
    for (const c of candidates) {
        if (existsSync(c)) return c;
    }
    return candidates[0];
})();

const allowedDirs = ['input', 'output', 'data'];
const IG_FOLLOWING_DIR = path.resolve(IG_BASE, 'data/following');
const FOLLOWING_REGEX = /^following-.*\.json$/i;
const FET_FRIENDS_PATH = path.resolve(IG_BASE, 'data/fetlife/friends.json');

const norm = (u?: string) => (u || '').trim().replace(/^@+/, '').toLowerCase();

router.get('/files', async (_req, res) => {
    try {
        const result: Record<string, string[]> = {};
        for (const dir of allowedDirs) {
            const dirPath = path.join(IG_BASE, dir);
            try {
                const files = await fs.readdir(dirPath);
                result[dir] = files;
            } catch {
                result[dir] = [];
            }
        }
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err?.message || 'failed to list files' });
    }
});

router.get('/files/:dir/:file', async (req, res) => {
    const { dir, file } = req.params;
    if (!allowedDirs.includes(dir)) {
        res.status(400).json({ error: 'invalid dir' });
        return;
    }
    const safePath = path.resolve(IG_BASE, dir, file);
    if (!safePath.startsWith(path.resolve(IG_BASE, dir))) {
        res.status(400).json({ error: 'invalid path' });
        return;
    }
    try {
        await fs.access(safePath);
        res.sendFile(safePath);
    } catch (err: any) {
        res.status(404).json({ error: 'file not found' });
    }
});

router.get('/following-graph', async (_req, res) => {
    try {
        const entries = await fs.readdir(IG_FOLLOWING_DIR);
        const files = entries.filter(f => FOLLOWING_REGEX.test(f)).sort();
        type NodeAgg = {
            username: string;
            fullName?: string;
            profilePicUrl?: string;
            followers: Set<string>;
            following: Set<string>;
            source?: 'instagram' | 'fetlife';
        };

        const nodes = new Map<string, NodeAgg>();
        const links: Array<{ source: string; target: string }> = [];
        const ensure = (u: string) => {
            if (!nodes.has(u)) nodes.set(u, { username: u, followers: new Set(), following: new Set() });
            return nodes.get(u)!;
        };

        if (files.length) {
            for (const file of files) {
                const raw = await fs.readFile(path.join(IG_FOLLOWING_DIR, file), 'utf8');
                if (!raw.trim()) continue;
                const parsed = JSON.parse(raw);
                const rows: any[] = Array.isArray(parsed) ? parsed : [parsed];
                for (const row of rows) {
                    const u = norm(row?.username);
                    const f = norm(row?.following_of);
                    if (!u || !f) continue;

                    const nodeU = ensure(u);
                    if (!nodeU.fullName && typeof row?.full_name === 'string') nodeU.fullName = row.full_name;
                    if (!nodeU.profilePicUrl && typeof row?.profile_pic_url === 'string') nodeU.profilePicUrl = row.profile_pic_url;
                    nodeU.source = nodeU.source || 'instagram';
                    nodeU.followers.add(f);

                    const nodeF = ensure(f);
                    nodeF.source = nodeF.source || 'instagram';
                    nodeF.following.add(u);
                    links.push({ source: f, target: u });
                }
            }
        }

        // Incorporate fetlife friends (bidirectional)
        try {
            if (existsSync(FET_FRIENDS_PATH)) {
                const raw = await fs.readFile(FET_FRIENDS_PATH, 'utf8');
                if (raw.trim()) {
                    const parsed = JSON.parse(raw);
                    const rows: any[] = Array.isArray(parsed) ? parsed : [parsed];
                    for (const row of rows) {
                        const a = norm(row?.root_handle || row?.root || row?.handle);
                        const b = norm(row?.username || row?.friend || row?.handle);
                        if (!a || !b) continue;
                        const nodeA = ensure(a);
                        const nodeB = ensure(b);
                        if (!nodeA.profilePicUrl && typeof row?.image_url === 'string') nodeA.profilePicUrl = row.image_url;
                        if (!nodeB.profilePicUrl && typeof row?.image_url === 'string') nodeB.profilePicUrl = row.image_url;
                        if (!nodeA.fullName && typeof row?.label === 'string') nodeA.fullName = row.label;
                        if (!nodeB.fullName && typeof row?.label === 'string') nodeB.fullName = row.label;
                        nodeA.source = nodeA.source || 'fetlife';
                        nodeB.source = nodeB.source || 'fetlife';
                        // Bidirectional friendship
                        nodeA.following.add(b);
                        nodeA.followers.add(b);
                        nodeB.following.add(a);
                        nodeB.followers.add(a);
                        links.push({ source: a, target: b }, { source: b, target: a });
                    }
                }
            }
        } catch {
            // ignore fetlife load errors
        }

        const graphNodes = Array.from(nodes.values()).map(n => ({
            username: n.username,
            followers: Array.from(n.followers).sort(),
            following: Array.from(n.following).sort(),
            fullName: n.fullName,
            profilePicUrl: n.profilePicUrl,
            source: n.source,
        })).sort((a, b) => a.username.localeCompare(b.username));

        res.json({ nodes: graphNodes, links });
    } catch (err: any) {
        res.status(500).json({ error: err?.message || 'failed to build following graph' });
    }
});

export default router;
