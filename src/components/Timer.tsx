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

  const elapsed = now.getTime() - lastFeeding.getTime();
  const intervalMs = family.feeding_interval_minutes * 60 * 1000;
  const remaining = intervalMs - elapsed;
  const progress = Math.min(elapsed / intervalMs, 1.5);

  const progressColor =
    progress < 0.75 ? 'bg-green-500' : progress < 1 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = remaining < 0 ? 'text-red-500' : 'text-muted dark:text-dark-muted';

  return (
    <div className="py-4">
      <div className="text-center">
        <p className="text-sm text-muted dark:text-dark-muted">Since last feeding</p>
        <p className="text-3xl font-bold">{formatDuration(elapsed)}</p>
      </div>
      <div className="mt-3 h-2 bg-gray-100 dark:bg-dark-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${progressColor}`}
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </div>
      <p className={`text-center text-sm mt-1 ${textColor}`}>
        {remaining > 0
          ? `Next feeding in ~${formatDuration(remaining)}`
          : `Overdue by ${formatDuration(-remaining)}`}
      </p>
    </div>
  );
}
