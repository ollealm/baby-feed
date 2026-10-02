'use client';

import { SleepSession } from '@/lib/sleep';

const DAY_MS = 24 * 60 * 60 * 1000;

const W = 360;
const H = 200;
const PAD_LEFT = 30;
const PAD_RIGHT = 6;
const PAD_TOP = 4;
const PAD_BOTTOM = 14;
const PLOT_W = W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = H - PAD_TOP - PAD_BOTTOM;

interface SleepRhythmProps {
  sessions: SleepSession[];
  /** Day starts (day break), oldest first, one row each */
  rows: { start: number; excluded: boolean }[];
  dayBreakHour: number;
}

// Actogram like the feeding rhythm: each row is a day starting at the day break,
// sleep drawn as bars. A night crossing the day break continues on the next row.
export function SleepRhythm({ sessions, rows, dayBreakHour }: SleepRhythmProps) {
  if (rows.length === 0) return null;

  const rowH = PLOT_H / rows.length;
  const toY = (i: number) => PAD_TOP + i * rowH;
  const barH = Math.max(rowH * 0.7, 1);

  const bars = rows.flatMap((row, i) => {
    const rowEnd = row.start + DAY_MS;
    return sessions
      .filter(s => s.end > row.start && s.start < rowEnd)
      .map((s, j) => {
        const from = (Math.max(s.start, row.start) - row.start) / DAY_MS;
        const to = (Math.min(s.end, rowEnd) - row.start) / DAY_MS;
        return (
          <rect
            key={`${i}-${j}`}
            x={PAD_LEFT + from * PLOT_W}
            y={toY(i) + (rowH - barH) / 2}
            width={Math.max((to - from) * PLOT_W, 1)}
            height={barH}
            rx={Math.min(barH / 2, 1.5)}
            className={s.night ? 'fill-primary dark:fill-blue-500' : 'fill-amber-400'}
            opacity="0.8"
          />
        );
      });
  });

  const hourTicks = [0, 3, 6, 9, 12, 15, 18, 21].map((offset) => ({
    x: PAD_LEFT + (offset / 24) * PLOT_W,
    label: String((dayBreakHour + offset) % 24).padStart(2, '0'),
    isMajor: offset % 6 === 0,
  }));

  // ~5 date labels down the left side
  const tickStep = Math.max(1, Math.ceil(rows.length / 5));
  const dateTicks = rows
    .map((row, i) => ({ i, row }))
    .filter(({ i }) => i % tickStep === 0)
    .map(({ i, row }) => ({
      y: toY(i) + rowH / 2,
      label: new Date(row.start).toLocaleDateString('sv-SE', { month: 'numeric', day: 'numeric' }),
    }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {/* Days whose naps weren't tracked */}
      {rows.map((row, i) => row.excluded && (
        <rect
          key={`x-${i}`}
          x={PAD_LEFT} y={toY(i)} width={PLOT_W} height={rowH}
          className="fill-yellow-400"
          opacity="0.12"
        />
      ))}

      {hourTicks.map(({ x, label, isMajor }) => (
        <g key={label}>
          <line
            x1={x} y1={PAD_TOP} x2={x} y2={PAD_TOP + PLOT_H}
            className="stroke-border dark:stroke-dark-border"
            strokeWidth="1"
            opacity={isMajor ? 1 : 0.5}
          />
          <text x={x} y={H - 3} fontSize="9" textAnchor="middle" className="fill-muted dark:fill-dark-muted">
            {label}
          </text>
        </g>
      ))}

      {dateTicks.map(({ y, label }) => (
        <text key={label} x={PAD_LEFT - 4} y={y + 3} fontSize="9" textAnchor="end" className="fill-muted dark:fill-dark-muted">
          {label}
        </text>
      ))}

      {bars}
    </svg>
  );
}
