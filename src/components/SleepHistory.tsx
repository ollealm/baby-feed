'use client';

import { useState } from 'react';
import { useSleep } from '@/lib/sleepContext';
import { formatDuration, formatTime } from '@/lib/utils';
import { SleepAnalysis } from '@/lib/sleep';
import { SleepChart } from './SleepChart';
import { SleepRhythm } from './SleepRhythm';

const LIST_PREVIEW_DAYS = 14;
const RHYTHM_DAYS = 30;

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="2" y1="2" x2="22" y2="22" />}
    </svg>
  );
}

export function SleepHistory({ analysis, dayBreakHour, rollingDays }: { analysis: SleepAnalysis; dayBreakHour: number; rollingDays: number }) {
  const { setDayExcluded } = useSleep();
  const [showAllDays, setShowAllDays] = useState(false);

  // Finished days only, newest first
  const days = analysis.days.slice(1);
  if (analysis.days.length === 0) return null;

  const label = (start: number) => new Date(start).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });

  const chartDays = [...days].reverse().map(d => ({
    label: label(d.start),
    nightMs: d.nightMs,
    napMs: d.napMs,
    napCount: d.napCount,
    nightWakings: d.nightWakings,
  }));

  // Rhythm includes today, so the current day is visible as it fills in
  const rhythmRows = analysis.days.slice(0, RHYTHM_DAYS).reverse().map(d => ({ start: d.start, excluded: d.excluded }));
  const listDays = showAllDays ? days : days.slice(0, LIST_PREVIEW_DAYS);

  const col = 'w-11 text-right whitespace-nowrap';
  const wide = 'w-[60px] text-right whitespace-nowrap';
  const clock = (t: number | null) => t !== null ? formatTime(new Date(t)) : '—';
  const dur = (ms: number | null) => ms !== null ? formatDuration(ms) : '—';

  return (
    <div className="mt-8">
      {chartDays.length > 1 && (
        <>
          <h3 className="text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide">
            History
            <span className="ml-1 font-normal normal-case">(sleep per day, rolling {rollingDays} days)</span>
          </h3>
          <div className="mt-2">
            <SleepChart data={chartDays} rollingDays={rollingDays} />
          </div>
        </>
      )}

      <h3 className="mt-6 text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide">
        Rhythm
        <span className="ml-1 font-normal normal-case">(last {RHYTHM_DAYS} days)</span>
      </h3>
      <div className="mt-2">
        <SleepRhythm sessions={analysis.sessions} rows={rhythmRows} dayBreakHour={dayBreakHour} />
      </div>

      {days.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between py-px text-xs text-muted dark:text-dark-muted">
            <span />
            <div className="flex items-center gap-1.5">
              <span className={col}>wake</span>
              <span className={col}>bed</span>
              <span className={wide}>naps</span>
              <span className={wide}>night</span>
              <span className="w-5" />
            </div>
          </div>
          {listDays.map(d => (
            <div key={d.key} className={`flex items-center justify-between py-px text-sm ${d.excluded ? 'opacity-60' : ''}`}>
              <span className="whitespace-nowrap">{label(d.start)}</span>
              <div className="flex items-center gap-1.5">
                <span className={`${col} text-muted dark:text-dark-muted`}>{clock(d.wakeUp)}</span>
                <span className={`${col} text-muted dark:text-dark-muted`}>{clock(d.bedtime)}</span>
                <span className={`${wide} text-muted dark:text-dark-muted`}>{d.excluded ? 'excl.' : dur(d.napMs)}</span>
                <span className={`${wide} font-semibold`}>{dur(d.nightMs)}</span>
                <button
                  onClick={() => setDayExcluded(d.key, !d.excluded)}
                  className={`w-5 flex items-center justify-center ${d.excluded ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-300 dark:text-dark-border'}`}
                  aria-label={d.excluded ? 'Include naps in statistics' : 'Exclude naps from statistics'}
                >
                  <EyeIcon off={d.excluded} />
                </button>
              </div>
            </div>
          ))}
          {days.length > LIST_PREVIEW_DAYS && (
            <button
              onClick={() => setShowAllDays(!showAllDays)}
              className="mt-1 text-sm text-muted dark:text-dark-muted hover:text-foreground dark:hover:text-dark-foreground"
            >
              {showAllDays ? 'Show less' : `Show all (${days.length} days)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
