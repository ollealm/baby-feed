'use client';

interface ChartProps {
  data: { label: string; ml: number; times: number }[];
  rollingDays?: number;
}

function rollingAvg(values: number[], window: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
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

export function Chart({ data, rollingDays = 3 }: ChartProps) {
  if (data.length < 2) return null;

  const smoothedMl    = rollingAvg(data.map(d => d.ml),    rollingDays);
  const smoothedTimes = rollingAvg(data.map(d => d.times), rollingDays);

  // Only the fully-windowed portion is shown
  const validFrom   = Math.min(rollingDays - 1, data.length - 1);
  const validDays   = data.slice(validFrom);
  const validMl     = smoothedMl.slice(validFrom);
  const validTimes  = smoothedTimes.slice(validFrom);
  const validCount  = validMl.length;

  const maxMl    = Math.max(...validMl, ...validDays.map(d => d.ml), 1);
  const maxTimes = Math.max(...validTimes, 1);

  const toX     = (i: number) => validCount <= 1 ? PAD_LEFT + PLOT_W / 2 : PAD_LEFT + (i / (validCount - 1)) * PLOT_W;
  const mlToY   = (v: number) => PAD_TOP + PLOT_H - (v / maxMl) * PLOT_H;
  const timesToY = (v: number) => PAD_TOP + PLOT_H - (v / maxTimes) * PLOT_H;
  const path = (points: { x: number; y: number }[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

  const mlPoints    = validMl.map((v, i)    => ({ x: toX(i), y: mlToY(v) }));
  const timesPoints = validTimes.map((v, i) => ({ x: toX(i), y: timesToY(v) }));

  const barWidth = Math.min(6, (PLOT_W / validCount) * 0.6);

  // ~5 date ticks along the x axis
  const tickStep = Math.max(1, Math.ceil(validCount / 5));
  const ticks = validDays
    .map((d, i) => ({ label: d.label, i }))
    .filter(({ i }) => i % tickStep === 0);

  const latestMl = Math.round(validMl[validCount - 1]);
  const latestTimes = validTimes[validCount - 1].toFixed(1);

  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-muted dark:text-dark-muted px-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-primary dark:bg-blue-500" />
          ml <span className="font-semibold text-foreground dark:text-dark-foreground">{latestMl}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
          times <span className="font-semibold text-foreground dark:text-dark-foreground">{latestTimes}</span>
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

        {/* Raw daily totals as faint bars */}
        {validDays.map((d, i) => (
          <rect
            key={i}
            x={toX(i) - barWidth / 2}
            y={mlToY(d.ml)}
            width={barWidth}
            height={PAD_TOP + PLOT_H - mlToY(d.ml)}
            className="fill-primary dark:fill-blue-500"
            opacity="0.15"
          />
        ))}

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

        {/* Times line (own scale) */}
        <path d={path(timesPoints)} fill="none" className="stroke-amber-500" strokeWidth="1.5" strokeLinejoin="round" />

        {/* Amount line */}
        <path d={path(mlPoints)} fill="none" className="stroke-primary dark:stroke-blue-500" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
