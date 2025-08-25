// matchFacilitators.ts
import Fuse from 'fuse.js';
import fs from 'fs/promises';
import { supabaseClient } from '../../connections/supabaseClient.js';

type UUID = string;

type Facilitator = {
  id: UUID;
  name: string | null;
  instagram_handle: string | null;
  fetlife_handle: string | null;
  aliases?: string[] | null; // optional JSON[] column or joined aliases
};

type EventRow = {
  id: UUID;
  name: string;
  hosts: string[] | null; // <-- array of names/handles you wrote during classification
};

const AUDIT_PATH = 'facilitator_match_audit.json';

function normalize(s?: string | null): string {
  return (s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^@/, ''); // strip leading @ for handles
}

function hostTokens(host: string): { raw: string; norm: string; noAt: string } {
  const raw = host ?? '';
  const norm = normalize(raw);
  const noAt = norm.replace(/^@/, '');
  return { raw, norm, noAt };
}

async function fetchFacilitators(): Promise<Facilitator[]> {
  // Pull facilitators and optional aliases table if you have one
  const { data: facs, error } = await supabaseClient
    .from('facilitators')
    .select(`
      id, name, instagram_handle, fetlife_handle,
      aliases:facilitator_aliases(alias)
    `);

  if (error) throw error;

  return (facs ?? []).map((f: any) => ({
    id: f.id,
    name: f.name,
    instagram_handle: f.instagram_handle,
    fetlife_handle: f.fetlife_handle,
    aliases: (f.aliases ?? []).map((a: any) => a.alias),
  }));
}

async function fetchEventsNeedingMatching(limit = 500): Promise<EventRow[]> {
  // Example: events starting in the future with hosts set
  // tweak the filter if you want to re-run backfill
  const { data, error } = await supabaseClient
    .from('events')
    .select('id, name, hosts')
    .not('hosts', 'is', null)
    .gte('start_date', new Date().toISOString())
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as EventRow[];
}

type MatchResult = {
  event_id: UUID;
  event_name: string;
  host_raw: string;
  matched_facilitator_id?: UUID;
  matched_facilitator_label?: string;
  confidence: number; // 0..1
  method: 'exact-name' | 'exact-handle' | 'alias' | 'fuzzy' | 'none';
};

export async function matchEventsToFacilitators({
  dryRun = false,
  minFuzzyScore = 0.75, // 0..1 tighter → fewer false positives
}: {
  dryRun?: boolean;
  minFuzzyScore?: number;
} = {}) {
  const [facilitators, events] = await Promise.all([
    fetchFacilitators(),
    fetchEventsNeedingMatching(),
  ]);

  // Build fast lookup maps for exact checks
  const byName = new Map<string, Facilitator>();
  const byHandle = new Map<string, Facilitator>();

  for (const f of facilitators) {
    const n = normalize(f.name);
    if (n) byName.set(n, f);

    const ig = normalize(f.instagram_handle);
    if (ig) byHandle.set(ig, f);

    const fl = normalize(f.fetlife_handle);
    if (fl) byHandle.set(fl, f);

    for (const a of f.aliases ?? []) {
      const an = normalize(a);
      if (an && !byName.has(an)) byName.set(an, f);
    }
  }

  // Build fuzzy index over multiple keys
  // Build a search label for debugging
  const fuseDocs = facilitators.map(f => ({
    f,
    label: [
      f.name,
      ...(f.aliases ?? []),
      f.instagram_handle ? `@${f.instagram_handle}` : null,
      f.fetlife_handle ? `@${f.fetlife_handle}` : null,
    ]
      .filter(Boolean)
      .join(' | '),
    name: f.name ?? '',
    aliases: (f.aliases ?? []).join(' '),
    instagram: f.instagram_handle ?? '',
    fetlife: f.fetlife_handle ?? '',
  }));

  const fuse = new Fuse(fuseDocs, {
    includeScore: true,
    threshold: 0.3, // lower = stricter; we’ll still gate via minFuzzyScore
    keys: [
      { name: 'name', weight: 0.55 },
      { name: 'aliases', weight: 0.25 },
      { name: 'instagram', weight: 0.1 },
      { name: 'fetlife', weight: 0.1 },
    ],
  });

  const audit: MatchResult[] = [];
  const rowsToInsert: { facilitator_id: UUID; event_id: UUID }[] = [];

  for (const ev of events) {
    const hostList = ev.hosts ?? [];
    for (const host of hostList) {
      if (!host) continue;

      const { raw, norm, noAt } = hostTokens(host);

      // 1) exact by @handle (works for "ig: @name", "fetlife: @name" if you strip before saving)
      let winner: Facilitator | undefined;
      let method: MatchResult['method'] = 'none';
      let confidence = 0;

      if (byHandle.has(noAt)) {
        winner = byHandle.get(noAt);
        method = 'exact-handle';
        confidence = 1.0;
      }

      // 2) exact by normalized name/alias
      if (!winner && byName.has(norm)) {
        winner = byName.get(norm);
        method = 'exact-name';
        confidence = 1.0;
      }

      // 3) fuzzy search across names/aliases/handles
      if (!winner) {
        const res = fuse.search(norm, { limit: 1 })[0];
        if (res) {
          // Fuse score is 0 (best) → 1 (worst). Convert to 1..0
          const conf = 1 - (res.score ?? 1);
          if (conf >= minFuzzyScore) {
            winner = res.item.f;
            method = 'fuzzy';
            confidence = conf;
          }
        }
      }

      // No winner → record as unmatched
      if (!winner) {
        audit.push({
          event_id: ev.id,
          event_name: ev.name,
          host_raw: raw,
          method: 'none',
          confidence: 0,
        });
        continue;
      }

      // Winner found
      audit.push({
        event_id: ev.id,
        event_name: ev.name,
        host_raw: raw,
        matched_facilitator_id: winner.id,
        matched_facilitator_label:
          winner.name ??
          winner.instagram_handle ??
          winner.fetlife_handle ??
          '(unnamed)',
        method,
        confidence,
      });

      rowsToInsert.push({ facilitator_id: winner.id, event_id: ev.id });
    }
  }

  // Idempotent write (relies on UNIQUE(facilitator_id,event_id))
  if (!dryRun && rowsToInsert.length) {
    // Insert in small batches to avoid payload limits
    const chunk = <T,>(arr: T[], n: number) =>
      Array.from({ length: Math.ceil(arr.length / n) }, (_, i) =>
        arr.slice(i * n, i * n + n)
      );

    for (const group of chunk(rowsToInsert, 500)) {
      const { error } = await supabaseClient
        .from('facilitator_events')
        .upsert(group, { onConflict: 'facilitator_id,event_id', ignoreDuplicates: true });

      if (error) {
        console.error('facilitator_events upsert error:', error);
      }
    }
  }

  await fs.writeFile(AUDIT_PATH, JSON.stringify(audit, null, 2));
  console.log(
    `Facilitator matching complete. ${rowsToInsert.length} links queued` +
    (dryRun ? ' (dry run)' : '') +
    `. Audit: ${AUDIT_PATH}`
  );

  return { inserted: rowsToInsert.length, audit };
}
