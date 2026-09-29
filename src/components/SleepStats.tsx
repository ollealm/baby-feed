'use client';

import { formatDuration, formatTime } from '@/lib/utils';
import { SleepAnalysis, SleepDay, averageOver, averageNapMsAtThisTime, napMsUntil } from '@/lib/sleep';

const WINDOWS = [1, 3, 10] as const;

type Cells = [React.ReactNode, React.ReactNode, React.ReactNode];

export function SleepStats({ analysis, now }: { analysis: SleepAnalysis; now: Date }) {
  const { days } = analysis;
  // Needs at least one finished day to compare against
  if (days.length < 2) return null;

  const today = days[0];
  const elapsed = now.getTime() - today.start;

  const avg = (pick: (d: SleepDay) => number | null) => WINDOWS.map(n => averageOver(days, n, pick));

  const dur = (ms: number | null) => ms !== null ? formatDuration(ms) : '—';
  const durs = (vals: (number | null)[]) => vals.map(dur) as Cells;
  const count = (vals: (number | null)[]) => vals.map(v => v !== null ? v.toFixed(1) : '—') as Cells;
  // Clock times are averaged as offsets from the day break so late-evening/after-midnight bedtimes average correctly
  const clocks = (pick: (d: SleepDay) => number | null) =>
    avg(d => { const t = pick(d); return t !== null ? t - d.start : null; })
      .map(offset => offset !== null ? formatTime(new Date(today.start + offset)) : '—') as Cells;

  const napsNow = today.napMs !== null ? napMsUntil(today, elapsed) : null;
  const atNaps = WINDOWS.map(n => averageNapMsAtThisTime(days, n, elapsed));

  function deltaCell(usual: number | null) {
    if (napsNow === null || usual === null) return '—';
    const delta = napsNow - usual;
    const cls = delta < 0 ? 'text-amber-600 dark:text-amber-500' : 'text-emerald-600 dark:text-emerald-500';
    return <span className={cls}>{delta >= 0 ? '+' : '−'}{formatDuration(delta)}</span>;
  }

  return (
    <div className="mt-8">
      <h3 className="text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide">
        Averages
        <span className="ml-1 font-normal normal-case">(per day)</span>
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
            <Row label={`Naps by now (${dur(napsNow)})`} values={durs(atNaps)} />
            <Row label="Delta" values={atNaps.map(deltaCell) as Cells} />

            <Row label="Total sleep" values={durs(avg(d => d.totalMs))} divider />
            <Row label="Night" values={durs(avg(d => d.nightMs))} />
            <Row label="Naps" values={durs(avg(d => d.napMs))} />

            <Row label="Wake-up" values={clocks(d => d.wakeUp)} divider />
            <Row label="Bedtime" values={clocks(d => d.bedtime)} />

            <Row label="Nap count" values={count(avg(d => d.napCount))} divider />
            <Row label="Avg nap" values={durs(avg(d => d.napCount ? d.napMs! / d.napCount : null))} />
            <Row label="Awake window" values={durs(avg(d => d.awakeWindows.length ? d.awakeWindows.reduce((a, b) => a + b, 0) / d.awakeWindows.length : null))} />

            <Row label="Night wakings" values={count(avg(d => d.nightWakings))} divider />
            <Row label="Longest stretch" values={durs(avg(d => d.longestStretch))} />
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted dark:text-dark-muted mt-1">
        Full days only. Night is the one following each day.
      </p>
    </div>
  );
}

function Row({ label, values, divider = false }: { label: string; values: Cells; divider?: boolean }) {
  return (
    <tr className={`border-t ${divider ? 'border-t-2 border-gray-200 dark:border-dark-muted/40' : 'border-border dark:border-dark-border'}`}>
      <td className="py-1.5 px-2 text-muted dark:text-dark-muted">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="py-1.5 px-2 text-right font-semibold whitespace-nowrap">{v}</td>
      ))}
    </tr>
  );
}
