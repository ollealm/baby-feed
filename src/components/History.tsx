'use client';

import { useApp } from '@/lib/context';
import { getDayStart } from '@/lib/utils';
import { Chart } from './Chart';

interface DayData {
  date: Date;
  label: string;
  totalMl: number;
  feedCount: number;
}

export function History() {
  const { feedings, family } = useApp();

  if (!family || feedings.length === 0) return null;

  const dayBreak = family.day_break_hour;

  const dayMap = new Map<string, DayData>();

  for (const f of feedings) {
    const feedTime = new Date(f.time);
    const dayStart = getDayStart(feedTime, dayBreak);
    const key = dayStart.toISOString().slice(0, 10);

    if (!dayMap.has(key)) {
      dayMap.set(key, {
        date: dayStart,
        label: dayStart.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' }),
        totalMl: 0,
        feedCount: 0,
      });
    }

    const day = dayMap.get(key)!;
    day.totalMl += f.amount_ml;
    day.feedCount++;
  }

  const days = Array.from(dayMap.values())
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const chartDays = days.slice(0, 14).reverse();

  return (
    <div className="mt-8">
      <h3 className="text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide">
        History
      </h3>

      {chartDays.length > 1 && (
        <div className="mt-2">
          <Chart data={chartDays.map(d => ({ label: d.label, ml: d.totalMl, times: d.feedCount }))} />
        </div>
      )}

      <div className="mt-1">
        {days.slice(0, 14).map(d => (
          <div key={d.date.toISOString()} className="flex items-center justify-between py-px text-sm">
            <span>{d.label}</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold w-16 text-right">{d.totalMl} ml</span>
              <span className="text-muted dark:text-dark-muted w-16 text-right">{d.feedCount} times</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
