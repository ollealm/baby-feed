'use client';

import { useApp } from '@/lib/context';
import { formatDuration, getDayStart } from '@/lib/utils';
import { getKcalPer100ml } from '@/lib/nutrition';
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

    const totalKcal = feeds.reduce((s, f) => s + (f.amount_ml / 100) * getKcalPer100ml(f.formula), 0);
    const avgKcal = days > 1 ? Math.round(totalKcal / days) : Math.round(totalKcal);

    // Median amount
    const medianAmt = count > 0
      ? (() => { const s = feeds.map(f => f.amount_ml).sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); })()
      : 0;

    let interval = 0;
    let medianInterval = 0;
    const intervals: number[] = [];
    if (count >= 2) {
      const sorted = [...feeds].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      let totalMs = 0;
      for (let i = 1; i < sorted.length; i++) {
        const gap = new Date(sorted[i].time).getTime() - new Date(sorted[i - 1].time).getTime();
        totalMs += gap;
        intervals.push(gap);
      }
      interval = totalMs / (sorted.length - 1);
      intervals.sort((a, b) => a - b);
      const m = Math.floor(intervals.length / 2);
      medianInterval = intervals.length % 2 ? intervals[m] : (intervals[m - 1] + intervals[m]) / 2;
    }

    const timesPerDay = days > 1 ? (count / days).toFixed(1) : String(count);

    return { avg, medianAmt, total: avgTotal, kcal: avgKcal, interval, medianInterval, times: timesPerDay };
  }

  function calcAtThisTime(daysBack: number): number {
    const todayStart = getDayStart(now, family!.day_break_hour);
    const elapsedToday = now.getTime() - todayStart.getTime();

    let total = 0;
    let count = 0;

    for (let d = 1; d <= daysBack; d++) {
      const pastDayStart = new Date(todayStart.getTime() - d * 24 * 60 * 60 * 1000);
      const pastCutoff = new Date(pastDayStart.getTime() + elapsedToday);

      const feedsByCutoff = feedings.filter(f => {
        const t = new Date(f.time).getTime();
        return t >= pastDayStart.getTime() && t <= pastCutoff.getTime();
      });

      total += feedsByCutoff.reduce((s, f) => s + f.amount_ml, 0);
      count++;
    }

    return count > 0 ? Math.round(total / count) : 0;
  }

  function intervalClass(ms: number): string {
    if (ms <= 0) return '—';
    const totalMin = Math.round(ms / 60000);
    // Buckets: 15-44 → "0h 30m", 45-74 → "1h 00m", 75-104 → "1h 30m", ...
    const bucket = Math.round((totalMin - 15) / 30);
    const clampedBucket = Math.max(0, bucket);
    const h = Math.floor(clampedBucket / 2);
    const m = (clampedBucket % 2) * 30;
    return `${h}h ${String(m).padStart(2, '0')}m`;
  }

  const d1  = calcStats(last24,  24);
  const d3  = calcStats(last72,  72);
  const d10 = calcStats(last240, 240);

  const at1  = calcAtThisTime(1);
  const at3  = calcAtThisTime(3);
  const at10 = calcAtThisTime(10);

  const todayStart = getDayStart(now, family.day_break_hour);
  const todayTotal = feedings
    .filter(f => new Date(f.time) >= todayStart)
    .reduce((s, f) => s + f.amount_ml, 0);

  return (
    <div className="mt-8">
      <h3 className="text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide">
        Averages
      </h3>
      <div className="mt-2 bg-surface dark:bg-dark-surface rounded-md overflow-hidden">
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
            <Row label={`At this time (${todayTotal} ml)`} v1={`${at1} ml`} v3={`${at3} ml`} v10={`${at10} ml`} />
            <Row label="Avg amount"   v1={`${d1.avg} ml`}    v3={`${d3.avg} ml`}    v10={`${d10.avg} ml`} />
            <Row label="Med amount"   v1={`${d1.medianAmt} ml`} v3={`${d3.medianAmt} ml`} v10={`${d10.medianAmt} ml`} />
            <Row label="Total"        v1={`${d1.total} ml`}  v3={`${d3.total} ml`}  v10={`${d10.total} ml`} />
            <Row label="Avg interval" v1={d1.interval > 0 ? formatDuration(d1.interval) : '—'} v3={d3.interval > 0 ? formatDuration(d3.interval) : '—'} v10={d10.interval > 0 ? formatDuration(d10.interval) : '—'} />
            <Row label="Med interval" v1={d1.medianInterval > 0 ? formatDuration(d1.medianInterval) : '—'} v3={d3.medianInterval > 0 ? formatDuration(d3.medianInterval) : '—'} v10={d10.medianInterval > 0 ? formatDuration(d10.medianInterval) : '—'} />
            <Row label="Typical" v1={intervalClass(d1.interval)} v3={intervalClass(d3.interval)} v10={intervalClass(d10.interval)} />
            <Row label="Times"        v1={d1.times}          v3={d3.times}          v10={d10.times} />
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
