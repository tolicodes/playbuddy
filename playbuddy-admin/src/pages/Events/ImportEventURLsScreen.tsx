import React, { useMemo, useState } from 'react';
import { useImportEventURLs } from '../../common/db-axios/useEvents';
import styles from './ImportEventURLsScreen.module.css';

type AnyObj = Record<string, any>;
type upsertEventResult = {
  event?: AnyObj;     // server may wrap the event here
  error?: AnyObj;     // presence indicates failure
} & AnyObj;

function getRowStatus(row: upsertEventResult | AnyObj): 'Inserted' | 'Upserted' | 'Failed' | 'OK' {
  const r: AnyObj = row || {};
  const statusStr = (r.status || r.result || '').toString().toLowerCase();
  const success = r.success;

  // Fail checks
  if (r.error || statusStr === 'error' || success === false) return 'Failed';

  // Inserted/Upserted checks (support several shapes)
  if (
    r.created === true ||
    statusStr === 'created' ||
    r.inserted === true
  ) return 'Inserted';

  if (
    r.updated === true ||
    statusStr === 'updated' ||
    r.upserted === true
  ) return 'Upserted';

  // Default
  return 'OK';
}

function extractEventLike(row: upsertEventResult | AnyObj) {
  const ev = (row as any).event ?? row;

  const name = ev?.name ?? '(no name)';
  const organizer = ev?.organizer?.name ?? '(no organizer)';
  const startDate = ev?.start_date || ev?.start_time || ev?.end_time || null;
  const image = ev?.image_url || ev?.cover_image_url || ev?.media?.[0]?.url || ev?.media?.[0]?.storage_path || null;
  const description = ev?.description || ev?.description_md || ev?.description_html || '';
  const location = ev?.location || ev?.venue_name || ev?.venue || ev?.address || '';

  const status = getRowStatus(row);
  const failed = status === 'Failed';

  return { name, organizer, status, failed, startDate, image, description, location, raw: ev };
}

export default function ImportEventURLsScreen() {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'importing' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const importEvents = useImportEventURLs();

  const handleImport = async () => {
    const urls = input
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => /^https?:\/\/\S+$/.test(url));

    if (!urls.length) return;

    setStatus('importing');
    setResult(null);
    try {
      const res = await importEvents.mutateAsync({ urls, sync: true });
      setResult(res);
      setStatus('done');
    } catch (err) {
      console.error('Import failed:', err);
      setStatus('error');
    }
  };

  // Normalize results for rendering
  const eventsArray: upsertEventResult[] = useMemo(() => {
    if (Array.isArray(result)) return result;
    return (result?.events as upsertEventResult[]) ?? [];
  }, [result]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    eventsArray.forEach((row) => {
      const ev = (row as any).event ?? row;
      const t = ev?.type || ev?.category;
      if (t) set.add(String(t));
    });
    return Array.from(set);
  }, [eventsArray]);

  const formatDateParts = (iso?: string | null) => {
    if (!iso) return { weekday: '–', monthDay: '' };
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { weekday: '–', monthDay: '' };
    const weekday = d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
    const monthDay = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return { weekday, monthDay };
  };

  // Build detailed counts (inserted, upserted, failed)
  const derivedCounts = (() => {
    if (!eventsArray?.length) return null;

    let inserted = 0, upserted = 0, failed = 0, ok = 0;
    for (const row of eventsArray) {
      const s = getRowStatus(row);
      if (s === 'Inserted') inserted++;
      else if (s === 'Upserted') upserted++;
      else if (s === 'Failed') failed++;
      else ok++;
    }
    return { inserted, upserted, failed, ok, total: eventsArray.length };
  })();

  // Prefer server-provided counts if they exist; otherwise use derived
  const counts = result?.counts
    ? {
      inserted: result.counts.inserted ?? derivedCounts?.inserted ?? 0,
      upserted: result.counts.upserted ?? derivedCounts?.upserted ?? 0,
      failed: result.counts.failed ?? derivedCounts?.failed ?? 0,
      total: result.counts.total ?? derivedCounts?.total ?? eventsArray.length,
    }
    : derivedCounts;

  const requested = result?.requested ?? null;
  const scraped = result?.scraped ?? null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Import Events from URLs</h1>

      <div className={styles.card}>
        <textarea
          className={styles.textarea}
          placeholder="Paste event URLs here, one per line"
          rows={10}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className={styles.button}
            onClick={handleImport}
            disabled={status === 'importing'}
          >
            {status === 'importing' ? 'Importing…' : 'Import Events'}
          </button>
          {status === 'done' && (
            <span className={styles.successMessage}>Import complete!</span>
          )}
          {status === 'error' && (
            <span style={{ color: '#DC2626', fontSize: 12 }}>Import failed</span>
          )}
        </div>

        {/* Stats */}
        {result && (
          <div className={styles.statsGrid}>
            {requested != null && (
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Requested</div>
                <div className={styles.statValue}>{requested}</div>
              </div>
            )}
            {scraped != null && (
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Scraped</div>
                <div className={styles.statValue}>{scraped}</div>
              </div>
            )}
            {counts && (
              <>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Inserted</div>
                  <div className={styles.statValue}>{counts.inserted}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Upserted</div>
                  <div className={styles.statValue}>{counts.upserted}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Failed</div>
                  <div className={styles.statValue}>{counts.failed}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Returned</div>
                  <div className={styles.statValue}>{counts.total}</div>
                </div>
              </>
            )}
            {!counts && (
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Returned</div>
                <div className={styles.statValue}>{eventsArray.length}</div>
              </div>
            )}
          </div>
        )}

        {/* Results list */}
        {result && eventsArray.length > 0 && (
          <div className={styles.resultsBlock}>
            <div className={styles.resultsHeader}>
              <div>
                <h3 className={styles.resultsTitle}>Imported Events</h3>
                <p className={styles.resultsSubtitle}>Name, date, and organizer for each scraped URL.</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {typeOptions.length > 0 && (
                  <select
                    className={styles.filterSelect}
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="all">All types</option>
                    {typeOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                )}
                <span className={styles.countPill}>{eventsArray.length} events</span>
              </div>
            </div>

            <div className={styles.eventsList}>
              {eventsArray
                .filter((row) => {
                  if (typeFilter === 'all') return true;
                  const ev = (row as any).event ?? row;
                  const t = ev?.type || ev?.category;
                  return t === typeFilter;
                })
                .map((row, idx) => {
                const ev = (row as any).event ?? row;
                const eventType = ev?.type || ev?.category || '';
                const { name, organizer, status: rowStatus, startDate, image, description, location, raw } = extractEventLike(row);
                const { weekday, monthDay } = formatDateParts(startDate);
                const statusClass =
                  rowStatus === 'Failed' ? styles.statusFailed :
                    rowStatus === 'Inserted' ? styles.statusInserted :
                      rowStatus === 'Upserted' ? styles.statusUpserted :
                        styles.statusNeutral;
                const isOpen = !!expanded[idx];

                return (
                  <div key={idx} className={styles.eventRow}>
                    <div className={styles.dateBadge}>
                      <div className={styles.weekday}>{weekday}</div>
                      <div className={styles.monthDay}>{monthDay}</div>
                    </div>
                    {image ? (
                      <div className={styles.thumbWrap}>
                        <img src={image} alt={name} className={styles.thumb} />
                      </div>
                    ) : (
                      <div className={styles.thumbPlaceholder}>No Image</div>
                    )}
                    <div className={styles.eventContent} onClick={() => setExpanded(prev => ({ ...prev, [idx]: !isOpen }))}>
                      <div className={styles.eventTitle}>{name}</div>
                      {eventType && <div className={styles.typeBadge}>{eventType}</div>}
                      <div className={styles.eventMeta}>
                        <span className={styles.metaLabel}>Organizer</span>
                        <span>{organizer}</span>
                      </div>
                      {location && (
                        <div className={styles.eventMeta}>
                          <span className={styles.metaLabel}>Location</span>
                          <span>{location}</span>
                        </div>
                      )}
                      {isOpen && description && (
                        <div className={styles.description}>{description}</div>
                      )}
                      {isOpen && (
                        <pre className={styles.jsonBlock}>{JSON.stringify(raw, null, 2)}</pre>
                      )}
                    </div>
                    <span className={`${styles.statusPill} ${statusClass}`}>{rowStatus}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {result && eventsArray.length === 0 && (
          <div className={styles.emptyState}>No events returned.</div>
        )}
      </div>
    </div>
  );
}
