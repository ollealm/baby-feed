'use client';

import { useApp } from '@/lib/context';
import { formatTime, getDayStart } from '@/lib/utils';
import { ImportData } from '@/components/ImportData';
import { Feeding } from '@/lib/types';
import Link from 'next/link';

export default function DataPage() {
  const { feedings, family } = useApp();

  if (!family) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted dark:text-dark-muted">No family loaded</p>
        <Link href="/" className="text-primary">Go home</Link>
      </div>
    );
  }

  const grouped = new Map<string, { label: string; feedings: Feeding[] }>();

  for (const f of feedings) {
    const dayStart = getDayStart(new Date(f.time), family.day_break_hour);
    const key = dayStart.toISOString().slice(0, 10);

    if (!grouped.has(key)) {
      grouped.set(key, {
        label: dayStart.toLocaleDateString('sv-SE', {
          weekday: 'short', month: 'short', day: 'numeric',
        }),
        feedings: [],
      });
    }

    grouped.get(key)!.feedings.push(f);
  }

  const days = Array.from(grouped.entries())
    .sort(([a], [b]) => b.localeCompare(a));

  return (
    <div>
      <header className="flex items-center justify-between py-4">
        <Link href="/" className="text-primary text-sm">&larr; Back</Link>
        <h1 className="text-xl font-bold">Data</h1>
        <div className="w-12" />
      </header>

      <ImportData />

      <div className="mt-6 space-y-4">
        {days.map(([key, day]) => (
          <div key={key}>
            <h4 className="text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide border-b border-border dark:border-dark-border pb-1 mb-1">
              {day.label}
              <span className="ml-2 font-normal normal-case">
                ({day.feedings.reduce((s, f) => s + f.amount_ml, 0)} ml total)
              </span>
            </h4>
            <div>
              {day.feedings.map(f => (
                <div key={f.id} className="flex items-center gap-1.5 text-sm py-0.5">
                  <span className="tabular-nums text-muted dark:text-dark-muted">
                    {formatTime(new Date(f.time))}
                  </span>
                  <span className="text-muted dark:text-dark-muted">&ndash;</span>
                  <span className="font-semibold">{f.amount_ml} ml</span>
                  {f.is_estimate && <span className="text-xs text-muted dark:text-dark-muted">~est</span>}
                  {f.vitamin_d && <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1 rounded">D</span>}
                  {f.probiotics && <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1 rounded">P</span>}
                  {f.formula && <span className="text-xs text-muted dark:text-dark-muted">{f.formula}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}

        {days.length === 0 && (
          <p className="text-sm text-muted dark:text-dark-muted text-center py-8">No data yet</p>
        )}
      </div>
    </div>
  );
}
