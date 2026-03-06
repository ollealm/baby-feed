'use client';

import { useApp } from '@/lib/context';
import { formatTime, getDayStart } from '@/lib/utils';

export function FeedingList() {
  const { feedings, family, deleteFeeding } = useApp();

  if (!family) return null;

  const dayStart = getDayStart(new Date(), family.day_break_hour);
  const todayFeedings = feedings.filter(f => new Date(f.time) >= dayStart);
  const totalMl = todayFeedings.reduce((s, f) => s + f.amount_ml, 0);

  return (
    <div className="mt-6">
      <div className="flex justify-between items-baseline">
        <h3 className="text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide">
          Today
        </h3>
        {todayFeedings.length > 0 && (
          <span className="text-xs font-semibold text-muted dark:text-dark-muted">{totalMl} ml</span>
        )}
      </div>
      {todayFeedings.length === 0 ? (
        <p className="text-sm text-muted dark:text-dark-muted mt-1">No feedings today</p>
      ) : (
        <div className="mt-1">
          {todayFeedings.map(f => (
            <div key={f.id} className="flex items-center justify-between py-px">
              <div className="flex items-center gap-2 text-sm">
                <span>{formatTime(new Date(f.time))}</span>
                {f.is_estimate && <span className="text-xs text-muted dark:text-dark-muted">~est</span>}
                {f.vitamin_d && <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1 rounded">D</span>}
                {f.probiotics && <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1 rounded">P</span>}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold w-16 text-right">{f.amount_ml} ml</span>
                <button
                  onClick={() => deleteFeeding(f.id)}
                  className="text-gray-300 dark:text-dark-border hover:text-red-500 active:text-red-600 w-6 text-center leading-none"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
