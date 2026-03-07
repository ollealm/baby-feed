'use client';

import { useApp } from '@/lib/context';
import { formatTime, getDayStart } from '@/lib/utils';
import { Feeding } from '@/lib/types';

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function DaySection({ label, feedings }: { label: string; feedings: Feeding[] }) {
  const { editingFeeding, setEditingFeeding } = useApp();
  const totalMl = feedings.reduce((s, f) => s + f.amount_ml, 0);

  return (
    <div className="mt-6">
      <div className="flex justify-between items-baseline">
        <h3 className="text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide">
          {label}
        </h3>
        {feedings.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-muted dark:text-dark-muted w-16 text-right">{totalMl} ml</span>
            <div className="w-6" />
          </div>
        )}
      </div>

      {feedings.length === 0 ? (
        <p className="text-sm text-muted dark:text-dark-muted mt-1">No feedings</p>
      ) : (
        <div className="mt-1">
          {feedings.map(f => {
            const isEditing    = editingFeeding?.id === f.id;
            const isPlaceholder = f.amount_ml === 0;
            const rowBg = isEditing
              ? 'bg-primary/10 dark:bg-primary/20'
              : isPlaceholder
              ? 'bg-yellow-100/70 dark:bg-yellow-900/25'
              : '';
            return (
              <div
                key={f.id}
                onClick={isPlaceholder ? () => setEditingFeeding(isEditing ? null : f) : undefined}
                className={`flex items-center justify-between py-px -mx-2 px-2 rounded transition-colors ${isPlaceholder ? 'cursor-pointer' : ''} ${rowBg}`}
              >
                <span className="text-sm">{formatTime(new Date(f.time))}</span>
                <div className="flex items-center gap-1">
                  {f.vitamin_d   && <span className="text-xs bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-300   px-1 rounded">D</span>}
                  {f.probiotics  && <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1 rounded">P</span>}
                  {f.is_estimate && <span className="text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-1 rounded">~</span>}
                  <span className={`text-sm font-semibold w-16 text-right ${isPlaceholder && !isEditing ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>
                    {isPlaceholder ? '— ml' : `${f.amount_ml} ml`}
                  </span>
                  <span
                    onClick={!isPlaceholder ? () => setEditingFeeding(isEditing ? null : f) : undefined}
                    className={`w-6 flex items-center justify-center leading-none ${
                      !isPlaceholder ? 'cursor-pointer' : ''
                    } ${isEditing ? 'text-primary' : 'text-gray-300 dark:text-dark-border'}`}
                  >
                    <PencilIcon />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FeedingList() {
  const { feedings, family } = useApp();

  if (!family) return null;

  const todayStart     = getDayStart(new Date(), family.day_break_hour);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

  const todayFeedings     = feedings.filter(f => new Date(f.time) >= todayStart);
  const yesterdayFeedings = feedings.filter(f => {
    const t = new Date(f.time);
    return t >= yesterdayStart && t < todayStart;
  });

  return (
    <>
      <DaySection label="Today"     feedings={todayFeedings} />
      <DaySection label="Yesterday" feedings={yesterdayFeedings} />
    </>
  );
}
