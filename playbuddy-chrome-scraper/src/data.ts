import type { ImportSource } from './common/types/commonTypes.js';
import { getApiBase } from './config.js';

const LS_KEY = 'PLAYBUDDY_API_KEY';

export const DEFAULT_FETLIFE_HANDLES = [
    'Kink-Collective',
    'TES-NYC',
    'Queens_Kinksters',
    'JinkyKews',
    'Geekaholic',
    'KinkyCannaMunch',
    'Black-bleu',
    'MistressBuffyNYC',
    'KinkyKlimbers',
    'TallGoddessNY',
    'Sir-airose',
    'Miss__Scorpio',
    'JJWatchEvents',
    'shemagickevents',
    'queertakeover',
    'missbloomsexed',
    'masterdanteamor',
    'creatrixofchaos',
    'SRQDarkTemple',
    'CuddleKnight',
    'SmittensLair',
    'Sirs_Unicorn'

    // asked
    // _hedonez
    // NostalgicPleasur
    // theDommeKat
    // SocieteAnonymeNY
    // LolaMontez
    // Bowtie_Prod
    // cocotheconnector
    // QueerRopeSocial
    // callmebilly
    // ethero
    // Knotasha
];

export const INSTAGRAM_HANDLES = [
    'nightowlsig', // ticketailor
    'trixielapointe', // linktree EB
    'sucianyc', // linktree - meet and greet - forbiddentickets.com
];

async function fetchApiKey(): Promise<string | null> {
    try {
        const res = await chrome.storage.local.get(LS_KEY);
        return res?.[LS_KEY] || null;
    } catch {
        return null;
    }
}

export async function fetchImportSources(): Promise<ImportSource[]> {
    const apiKey = await fetchApiKey();
    if (!apiKey) return [];
    try {
        const res = await fetch(`${await getApiBase()}/import_sources`, {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('Failed to fetch import_sources; using defaults', err);
        return [];
    }
}

export async function getFetlifeHandles(): Promise<string[]> {
    const imports = await fetchImportSources();
    const handles = imports
        .filter(src => src.source === 'fetlife_handle' || src.identifier_type === 'handle')
        .map(src => (src.identifier || '').replace(/^@/, '').trim())
        .filter(Boolean);
    const unique = Array.from(new Set(handles));
    return unique.length ? unique : DEFAULT_FETLIFE_HANDLES;
}
