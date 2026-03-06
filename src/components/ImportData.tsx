'use client';

import { useState } from 'react';
import { useApp } from '@/lib/context';
import { parseFeedingImport, formatTime } from '@/lib/utils';

export function ImportData() {
  const { family, importFeedings } = useApp();
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<Array<{ time: Date; amount_ml: number }>>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  function handlePreview() {
    const parsed = parseFeedingImport(text);
    setPreview(parsed);
    setImported(false);
  }

  async function handleImport() {
    if (!family || preview.length === 0) return;
    setImporting(true);

    await importFeedings(preview);

    setText('');
    setPreview([]);
    setImporting(false);
    setImported(true);
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide">Import Data</h3>
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setImported(false); }}
        placeholder={`Paste feeding data:\n4/3\n10.30 - 65 ml\n12.30 - 70 ml`}
        className="w-full h-40 p-3 border border-border dark:border-dark-border rounded-lg text-sm font-mono resize-none bg-white dark:bg-dark-surface"
      />
      <div className="flex gap-2">
        <button
          onClick={handlePreview}
          disabled={!text.trim()}
          className="px-4 py-2 bg-gray-100 dark:bg-dark-surface rounded-lg text-sm font-medium disabled:opacity-50"
        >
          Preview
        </button>
        {preview.length > 0 && (
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {importing ? 'Importing...' : `Import ${preview.length} entries`}
          </button>
        )}
      </div>

      {imported && (
        <p className="text-sm text-green-600 dark:text-green-400">Data imported successfully!</p>
      )}

      {preview.length > 0 && (
        <div className="space-y-1 text-sm max-h-60 overflow-y-auto">
          {preview.map((p, i) => (
            <div key={i} className="flex gap-3 text-muted dark:text-dark-muted">
              <span className="font-mono tabular-nums">
                {p.time.toLocaleDateString('sv-SE')} {formatTime(p.time)}
              </span>
              <span>{p.amount_ml} ml</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
