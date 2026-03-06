'use client';

import { useApp } from '@/lib/context';
import { getDayStart, formatDuration } from '@/lib/utils';
import { Feeding } from '@/lib/types';

export function Stats() {
  const { feedings, family } = useApp();

  if (!family || feedings.length === 0) return null;

  const now = new Date();
  const dayBreak = family.day_break_hour;

  const lastDayStart = getDayStart(now, dayBreak);
  const lastDayFeedings = feedings.filter(f => new Date(f.time) >= lastDayStart);

  const threeDaysAgo = new Date(lastDayStart);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 2);
  const last3DaysFeedings = feedings.filter(f => new Date(f.time) >= threeDaysAgo);

  function calcStats(feeds: Feeding[], days: number) {
    const count = feeds.length;
    const total = feeds.reduce((s, f) => s + f.amount_ml, 0);
    const avg = count > 0 ? Math.round(total / count) : 0;
    const avgTotal = days > 1 ? Math.round(total / days) : total;

    let interval = 0;
    if (count >= 2) {
      const sorted = [...feeds].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      let totalMs = 0;
      for (let i = 1; i < sorted.length; i++) {
        totalMs += new Date(sorted[i].time).getTime() - new Date(sorted[i - 1].time).getTime();
      }
      interval = totalMs / (sorted.length - 1);
    }

    const timesPerDay = days > 1 ? (count / days).toFixed(1) : String(count);

    return { avg, total: avgTotal, interval, times: timesPerDay };
  }

  const d1 = calcStats(lastDayFeedings, 1);
  const d3 = calcStats(last3DaysFeedings, 3);

  return (
    <div className="mt-8">
      <h3 className="text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide">
        Averages
      </h3>
      <div className="mt-2 bg-surface dark:bg-dark-surface rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted dark:text-dark-muted">
              <th className="text-left font-normal py-1.5 px-3"></th>
              <th className="text-right font-normal py-1.5 px-3">1 day</th>
              <th className="text-right font-normal py-1.5 px-3">3 day</th>
            </tr>
          </thead>
          <tbody>
            <Row label="Amount" v1={`${d1.avg} ml`} v3={`${d3.avg} ml`} />
            <Row label="Total" v1={`${d1.total} ml`} v3={`${d3.total} ml`} />
            <Row label="Interval" v1={d1.interval > 0 ? formatDuration(d1.interval) : '\u2014'} v3={d3.interval > 0 ? formatDuration(d3.interval) : '\u2014'} />
            <Row label="Times" v1={d1.times} v3={d3.times} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, v1, v3 }: { label: string; v1: string; v3: string }) {
  return (
    <tr className="border-t border-border dark:border-dark-border">
      <td className="py-1.5 px-3 text-muted dark:text-dark-muted">{label}</td>
      <td className="py-1.5 px-3 text-right font-semibold ">{v1}</td>
      <td className="py-1.5 px-3 text-right font-semibold ">{v3}</td>
    </tr>
  );
}
