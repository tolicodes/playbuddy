import React, { useState } from 'react';
import { useImportEventURLs } from '../../common/db-axios/useEvents';
import styles from './ImportEventURLsScreen.module.css';

const ImportEventURLsScreen = () => {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'importing' | 'done'>('idle');

  const importEvents = useImportEventURLs();

  const handleImport = async () => {
    const urls = input
      .split('\n')
      .map(url => url.trim())
      .filter(url => /^https?:\/\/\S+$/.test(url));

    if (!urls.length) return;

    setStatus('importing');
    try {
      await importEvents.mutateAsync(urls);
      setStatus('done');
    } catch (err) {
      console.error('Import failed:', err);
      setStatus('idle');
    }
  };

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

        <button
          className={styles.button}
          onClick={handleImport}
          disabled={status === 'importing'}
        >
          {status === 'importing' ? 'Importing…' : 'Import Events'}
        </button>

        {status === 'done' && (
          <div className={styles.successMessage}>Import complete!</div>
        )}
      </div>
    </div>
  );
};

export default ImportEventURLsScreen;
