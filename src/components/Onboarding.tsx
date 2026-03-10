'use client';

import { useState } from 'react';
import { useApp } from '@/lib/context';

export function Onboarding() {
  const { createFamily, joinFamily, error: appError } = useApp();
  const [mode, setMode] = useState<'choose' | 'join'>('choose');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      await createFamily();
    } catch {
      setError('Failed to create family');
    }
    setLoading(false);
  }

  async function handleJoin() {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    const ok = await joinFamily(code);
    if (!ok) {
      setError('Family code not found');
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <h1 className="text-2xl font-bold">Baby Feed</h1>
      <p className="text-muted dark:text-dark-muted text-center">Track formula feedings</p>

      {appError && <p className="text-red-500 text-sm">{appError}</p>}

      {mode === 'choose' ? (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-3 bg-primary text-white rounded-md font-semibold text-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'New Family'}
          </button>
          <button
            onClick={() => setMode('join')}
            className="w-full py-3 bg-surface dark:bg-dark-surface text-foreground dark:text-dark-foreground rounded-md font-semibold text-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            Join Family
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Enter family code"
            className="w-full py-3 px-4 rounded-md text-center text-lg font-mono bg-surface dark:bg-dark-surface focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            onClick={handleJoin}
            disabled={loading || !code.trim()}
            className="w-full py-3 bg-primary text-white rounded-md font-semibold text-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join'}
          </button>
          <button
            onClick={() => { setMode('choose'); setError(''); }}
            className="text-muted dark:text-dark-muted text-sm"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
