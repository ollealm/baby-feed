'use client';

import { formatDuration, formatTime } from '@/lib/utils';
import { SleepAnalysis, typicalAwakeWindow, typicalNapMs } from '@/lib/sleep';

export function SleepTimer({ analysis, now }: { analysis: SleepAnalysis; now: Date }) {
  const { current, days } = analysis;

  if (!current) {
    return (
      <div className="text-center py-6">
        <p className="text-muted dark:text-dark-muted text-sm">No sleep recorded yet</p>
      </div>
    );
  }

  const elapsed = Math.max(0, now.getTime() - current.since);
  const today = days[0];

  // What "usual" means depends on the state: nap length, or the awake window at this point of the day
  let typical: number | null = null;
  let status: React.ReactNode = null;

  if (!current.asleep && current.night) {
    status = 'Night waking';
  } else if (current.asleep && current.night) {
    status = current.nightStart !== null && current.nightStart !== current.since
      ? `Night since ${formatTime(new Date(current.nightStart))}`
      : 'Night';
  } else if (current.asleep) {
    typical = typicalNapMs(days);
    status = typical ? `Usual nap ${formatDuration(typical)}` : null;
  } else if (today?.wakeUp !== null && today?.wakeUp !== undefined) {
    typical = typicalAwakeWindow(days, today.awakeWindows.length);
    if (typical) {
      const left = typical - elapsed;
      status = left > 0
        ? <span className="text-muted dark:text-dark-muted">Usual awake window {formatDuration(typical)} · nap in ~{formatDuration(left)}</span>
        : <span className="text-yellow-500 dark:text-yellow-400">Past usual awake window by {formatDuration(-left)}</span>;
    }
  }

  const progress = typical ? Math.min(elapsed / typical, 1) : null;
  const barColor = current.asleep ? 'bg-primary dark:bg-blue-500' : elapsed < (typical ?? Infinity) ? 'bg-green-500' : 'bg-yellow-400';

  return (
    <div className="py-4">
      <div className="text-center">
        <p className="text-sm text-muted dark:text-dark-muted">
          {current.asleep ? 'Asleep' : 'Awake'} since {formatTime(new Date(current.since))}
        </p>
        <p className="text-3xl font-bold">{formatDuration(elapsed)}</p>
      </div>

      <div className="mt-3 h-2 bg-gray-100 dark:bg-dark-surface rounded-full overflow-hidden">
        {progress !== null && (
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${progress * 100}%` }}
          />
        )}
      </div>

      <p className="text-center text-sm mt-1 text-muted dark:text-dark-muted min-h-5">
        {status}
      </p>
    </div>
  );
}
