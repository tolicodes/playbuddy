import React, { useState } from 'react';
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

  const status = getRowStatus(row);
  const failed = status === 'Failed';

  return { name, organizer, status, failed };
}

export default function ImportEventURLsScreen() {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'importing' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);

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
      const res = await importEvents.mutateAsync(urls);
      setResult(res);
      setStatus('done');
    } catch (err) {
      console.error('Import failed:', err);
      setStatus('error');
    }
  };

  // Normalize results for rendering
  const eventsArray: upsertEventResult[] = Array.isArray(result)
    ? result
    : (result?.events as upsertEventResult[]) ?? [];

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
        {(status === 'done' || status === 'error') && (
          <div style={{ marginTop: 16 }}>
            <h3 style={{ margin: '8px 0' }}>Stats</h3>
            <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.6 }}>
              {requested != null && <li><b>Requested:</b> {requested}</li>}
              {scraped != null && <li><b>Scraped:</b> {scraped}</li>}
              {counts && (
                <>
                  <li><b>Inserted:</b> {counts.inserted}</li>
                  <li><b>Upserted:</b> {counts.upserted}</li>
                  <li><b>Failed:</b> {counts.failed}</li>
                  <li><b>Total returned:</b> {counts.total}</li>
                </>
              )}
              {!counts && <li><b>Total returned:</b> {eventsArray.length}</li>}
            </ul>
          </div>
        )}

        {/* Results list */}
        {status === 'done' && eventsArray.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h3 style={{ margin: '8px 0' }}>Imported Events</h3>
            <div
              style={{
                maxHeight: 360,
                overflowY: 'auto',
                border: '1px solid #E5E7EB',
                borderRadius: 8,
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #E5E7EB' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #E5E7EB' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #E5E7EB' }}>Organizer</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #E5E7EB' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {eventsArray.map((row, idx) => {
                    const { name, organizer, status } = extractEventLike(row);
                    const color =
                      status === 'Failed' ? '#DC2626' :
                        status === 'Inserted' ? '#2563EB' : // blue-ish for insert
                          status === 'Upserted' ? '#059669' :  // green for update
                            '#6B7280'; // gray for OK/other

                    return (
                      <tr key={idx}>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #F3F4F6', width: 36 }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #F3F4F6' }}>{name}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #F3F4F6' }}>{organizer}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #F3F4F6' }}>
                          <span style={{ color }}>{status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
