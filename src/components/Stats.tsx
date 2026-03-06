'use client';

import { useApp } from '@/lib/context';
import { formatDuration } from '@/lib/utils';
import { Feeding } from '@/lib/types';

export function Stats() {
  const { feedings, family } = useApp();

  if (!family || feedings.length === 0) return null;

  const now = new Date();
  const h24ago  = new Date(now.getTime() -  24 * 60 * 60 * 1000);
  const h72ago  = new Date(now.getTime() -  72 * 60 * 60 * 1000);
  const h240ago = new Date(now.getTime() - 240 * 60 * 60 * 1000);

  const last24  = feedings.filter(f => new Date(f.time) >= h24ago);
  const last72  = feedings.filter(f => new Date(f.time) >= h72ago);
  const last240 = feedings.filter(f => new Date(f.time) >= h240ago);

  function calcStats(feeds: Feeding[], hours: number) {
    const count = feeds.length;
    const total = feeds.reduce((s, f) => s + f.amount_ml, 0);
    const avg = count > 0 ? Math.round(total / count) : 0;
    const days = hours / 24;
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

  const d1  = calcStats(last24,  24);
  const d3  = calcStats(last72,  72);
  const d10 = calcStats(last240, 240);

  return (
    <div className="mt-8">
      <h3 className="text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide">
        Averages
      </h3>
      <div className="mt-2 bg-surface dark:bg-dark-surface rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted dark:text-dark-muted">
              <th className="text-left font-normal py-1.5 px-2"></th>
              <th className="text-right font-normal py-1.5 px-2">1 day</th>
              <th className="text-right font-normal py-1.5 px-2">3 days</th>
              <th className="text-right font-normal py-1.5 px-2">10 days</th>
            </tr>
          </thead>
          <tbody>
            <Row label="Amount"   v1={`${d1.avg} ml`}   v3={`${d3.avg} ml`}   v10={`${d10.avg} ml`} />
            <Row label="Total"    v1={`${d1.total} ml`} v3={`${d3.total} ml`} v10={`${d10.total} ml`} />
            <Row label="Interval" v1={d1.interval  > 0 ? formatDuration(d1.interval)  : '—'} v3={d3.interval  > 0 ? formatDuration(d3.interval)  : '—'} v10={d10.interval > 0 ? formatDuration(d10.interval) : '—'} />
            <Row label="Times"    v1={d1.times}         v3={d3.times}         v10={d10.times} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, v1, v3, v10 }: { label: string; v1: string; v3: string; v10: string }) {
  return (
    <tr className="border-t border-border dark:border-dark-border">
      <td className="py-1.5 px-2 text-muted dark:text-dark-muted">{label}</td>
      <td className="py-1.5 px-2 text-right font-semibold">{v1}</td>
      <td className="py-1.5 px-2 text-right font-semibold">{v3}</td>
      <td className="py-1.5 px-2 text-right font-semibold">{v10}</td>
    </tr>
  );
}
