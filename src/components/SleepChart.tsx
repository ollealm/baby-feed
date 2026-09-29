'use client';

import { formatDuration } from '@/lib/utils';

export interface SleepChartDay {
  label: string;
  /** null = unknown (excluded day, or night not logged) */
  nightMs: number | null;
  napMs: number | null;
  napCount: number | null;
  nightWakings: number | null;
}

// Like the feeding chart's rolling average, but unknown days are skipped instead of counted as zero
function rollingAvg(values: (number | null)[], window: number): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1).filter((v): v is number => v !== null);
    return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
  });
}

const W = 360;
const H = 150;
const PAD_LEFT = 6;
const PAD_RIGHT = 6;
const PAD_TOP = 10;
const PAD_BOTTOM = 18;
const PLOT_W = W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = H - PAD_TOP - PAD_BOTTOM;

export function SleepChart({ data, rollingDays = 3 }: { data: SleepChartDay[]; rollingDays?: number }) {
  if (data.length < 2) return null;

  const smooth = (pick: (d: SleepChartDay) => number | null) => rollingAvg(data.map(pick), rollingDays);
  // Only the fully-windowed portion is shown
  const validFrom = Math.min(rollingDays - 1, data.length - 1);
  const night   = smooth(d => d.nightMs).slice(validFrom);
  const naps    = smooth(d => d.napMs).slice(validFrom);
  const napCount = smooth(d => d.napCount).slice(validFrom);
  const wakings = smooth(d => d.nightWakings).slice(validFrom);
  const validDays = data.slice(validFrom);
  const n = night.length;

  const total = night.map((v, i) => v + naps[i]);
  const maxMs = Math.max(...total, 1);
  const maxTimes = Math.max(...napCount, ...wakings, 1);

  const toX = (i: number) => n <= 1 ? PAD_LEFT + PLOT_W / 2 : PAD_LEFT + (i / (n - 1)) * PLOT_W;
  const msToY = (v: number) => PAD_TOP + PLOT_H - (v / maxMs) * PLOT_H;
  const timesToY = (v: number) => PAD_TOP + PLOT_H - (v / maxTimes) * PLOT_H;
  const baseY = PAD_TOP + PLOT_H;

  const pt = (x: number, y: number) => `${x.toFixed(2)},${y.toFixed(2)}`;
  const line = (values: number[], toY: (v: number) => number) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'}${pt(toX(i), toY(v))}`).join(' ');

  // Stacked areas: night from the baseline, naps on top of night
  const nightArea =
    `M${pt(toX(0), baseY)} ` +
    night.map((v, i) => `L${pt(toX(i), msToY(v))}`).join(' ') +
    ` L${pt(toX(n - 1), baseY)} Z`;
  const napArea =
    `M${pt(toX(0), msToY(night[0]))} ` +
    total.map((v, i) => `L${pt(toX(i), msToY(v))}`).join(' ') + ' ' +
    [...night.keys()].reverse().map(i => `L${pt(toX(i), msToY(night[i]))}`).join(' ') +
    ' Z';

  // ~5 date ticks along the x axis
  const tickStep = Math.max(1, Math.ceil(n / 5));
  const ticks = validDays
    .map((d, i) => ({ label: d.label, i }))
    .filter(({ i }) => i % tickStep === 0);

  const last = n - 1;
  const legendNum = 'font-semibold text-foreground dark:text-dark-foreground';

  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted dark:text-dark-muted px-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-primary/40 dark:bg-blue-500/40" />
          night <span className={legendNum}>{formatDuration(night[last])}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-amber-400/60" />
          naps <span className={legendNum}>{formatDuration(naps[last])}</span>
        </span>
        <span>total <span className={legendNum}>{formatDuration(total[last])}</span></span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted dark:text-dark-muted px-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-amber-500" />
          naps <span className={legendNum}>{napCount[last].toFixed(1)}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-primary dark:bg-blue-500" />
          night wakings <span className={legendNum}>{wakings[last].toFixed(1)}</span>
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto mt-1">
        {/* Grid lines */}
        {[0, 0.5, 1].map(t => (
          <line
            key={t}
            x1={PAD_LEFT} y1={PAD_TOP + PLOT_H * (1 - t)}
            x2={PAD_LEFT + PLOT_W} y2={PAD_TOP + PLOT_H * (1 - t)}
            className="stroke-border dark:stroke-dark-border" strokeWidth="1"
          />
        ))}

        {/* Stacked sleep areas */}
        <path d={nightArea} className="fill-primary dark:fill-blue-500" opacity="0.25" />
        <path d={napArea} className="fill-amber-400" opacity="0.45" />

        {/* Date ticks */}
        {ticks.map(({ label, i }, tickIndex) => (
          <text
            key={i}
            x={toX(i)} y={H - 4}
            fontSize="9"
            textAnchor={tickIndex === 0 ? 'start' : 'middle'}
            className="fill-muted dark:fill-dark-muted"
          >
            {label}
          </text>
        ))}

        {/* Count lines (own scale) */}
        <path d={line(napCount, timesToY)} fill="none" className="stroke-amber-500" strokeWidth="1.5" strokeLinejoin="round" />
        <path d={line(wakings, timesToY)} fill="none" className="stroke-primary dark:stroke-blue-500" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
