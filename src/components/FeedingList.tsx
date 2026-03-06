'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { formatTime, getDayStart } from '@/lib/utils';
import { Feeding } from '@/lib/types';

function Badges({ f }: { f: Feeding }) {
  if (!f.is_estimate && !f.vitamin_d && !f.probiotics) return null;
  return (
    <div className="flex gap-1 mb-0.5">
      {f.is_estimate && <span className="text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-1 rounded">~</span>}
      {f.vitamin_d && <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1 rounded">D</span>}
      {f.probiotics && <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1 rounded">P</span>}
    </div>
  );
}

interface DaySectionProps {
  label: string;
  feedings: Feeding[];
  onDelete?: (id: string) => void;
}

function DaySection({ label, feedings, onDelete }: DaySectionProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (pendingId) {
      const t = setTimeout(() => setPendingId(null), 3000);
      return () => clearTimeout(t);
    }
  }, [pendingId]);

  const totalMl = feedings.reduce((s, f) => s + f.amount_ml, 0);

  function handleDelete(id: string) {
    if (pendingId === id) {
      onDelete!(id);
      setPendingId(null);
    } else {
      setPendingId(id);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex justify-between items-baseline">
        <h3 className="text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide">
          {label}
        </h3>
        {feedings.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-muted dark:text-dark-muted w-16 text-right">{totalMl} ml</span>
            {onDelete && <div className="w-6" />}
          </div>
        )}
      </div>

      {feedings.length === 0 ? (
        <p className="text-sm text-muted dark:text-dark-muted mt-1">No feedings</p>
      ) : (
        <div className="mt-1">
          {feedings.map(f => (
            <div key={f.id} className="flex items-end justify-between py-px">
              <span className="text-sm">{formatTime(new Date(f.time))}</span>
              <div className="flex flex-col items-end">
                <Badges f={f} />
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold w-16 text-right">{f.amount_ml} ml</span>
                  {onDelete ? (
                    <button
                      onClick={() => handleDelete(f.id)}
                      className={`w-6 text-center leading-none transition-colors ${
                        pendingId === f.id
                          ? 'text-red-500'
                          : 'text-gray-300 dark:text-dark-border hover:text-red-400'
                      }`}
                    >
                      {pendingId === f.id ? '✓' : '×'}
                    </button>
                  ) : (
                    <div className="w-6" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FeedingList() {
  const { feedings, family, deleteFeeding } = useApp();

  if (!family) return null;

  const todayStart = getDayStart(new Date(), family.day_break_hour);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

  const todayFeedings = feedings.filter(f => new Date(f.time) >= todayStart);
  const yesterdayFeedings = feedings.filter(f => {
    const t = new Date(f.time);
    return t >= yesterdayStart && t < todayStart;
  });

  return (
    <>
      <DaySection label="Today" feedings={todayFeedings} onDelete={deleteFeeding} />
      <DaySection label="Yesterday" feedings={yesterdayFeedings} onDelete={deleteFeeding} />
    </>
  );
}
