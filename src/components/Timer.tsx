'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/lib/context';
import { formatDuration } from '@/lib/utils';

export function Timer() {
  const { feedings, family } = useApp();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const lastFeeding = feedings.length > 0 ? new Date(feedings[0].time) : null;

  if (!lastFeeding || !family) {
    return (
      <div className="text-center py-6">
        <p className="text-muted dark:text-dark-muted text-sm">No feedings recorded yet</p>
      </div>
    );
  }

  const elapsed    = now.getTime() - lastFeeding.getTime();
  const intervalMs = family.feeding_interval_minutes * 60 * 1000;
  const spanMs     = (family.feeding_span_minutes ?? 60) * 60 * 1000;
  const totalMs    = intervalMs + spanMs;

  const inWindow = elapsed >= intervalMs && elapsed < totalMs;
  const overdue  = elapsed >= totalMs;

  // Bar fills 0→100% over the full interval+span range
  const barProgress = Math.min(elapsed / totalMs, 1);
  const barColor = overdue ? 'bg-red-500' : inWindow ? 'bg-yellow-400' : 'bg-green-500';

  const toWindowStart = intervalMs - elapsed;
  const toWindowEnd   = totalMs - elapsed;
  const overdueBy     = elapsed - totalMs;

  return (
    <div className="py-4">
      <div className="text-center">
        <p className="text-sm text-muted dark:text-dark-muted">Since last feeding</p>
        <p className="text-3xl font-bold">{formatDuration(elapsed)}</p>
      </div>

      <div className="mt-3 h-2 bg-gray-100 dark:bg-dark-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${barProgress * 100}%` }}
        />
      </div>

      <p className="text-center text-sm mt-1">
        {overdue ? (
          <span className="text-red-500">Overdue · {formatDuration(overdueBy)}</span>
        ) : inWindow ? (
          <span className="text-yellow-500 dark:text-yellow-400">Time to eat · {formatDuration(toWindowEnd)} left</span>
        ) : (
          <span className="text-muted dark:text-dark-muted">
            in {formatDuration(toWindowStart)} – {formatDuration(toWindowEnd)}
          </span>
        )}
      </p>
    </div>
  );
}
