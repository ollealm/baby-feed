'use client';

import { Feeding } from '@/lib/types';
import { getDayStart } from '@/lib/utils';
import { FeedingPattern } from '@/lib/feedingPatterns';

const DAY_MINUTES = 24 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;

const W = 360;
const H = 200;
const PAD_LEFT = 30;
const PAD_RIGHT = 6;
const PAD_TOP = 4;
const PAD_BOTTOM = 14;
const PLOT_W = W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = H - PAD_TOP - PAD_BOTTOM;

interface FeedingRhythmProps {
  feedings: Feeding[];
  dayBreakHour: number;
  patterns?: FeedingPattern[];
  days?: number;
  now?: Date;
}

// Horizontal fraction for a minute-of-day, with the day break hour at the left edge.
function timeFraction(minute: number, dayBreakHour: number): number {
  return ((minute - dayBreakHour * 60 + DAY_MINUTES) % DAY_MINUTES) / DAY_MINUTES;
}

export function FeedingRhythm({ feedings, dayBreakHour, patterns = [], days = 30, now }: FeedingRhythmProps) {
  const analysisNow = now ?? new Date();
  const todayStart = getDayStart(analysisNow, dayBreakHour);
  const firstDayStart = new Date(todayStart.getTime() - (days - 1) * DAY_MS);

  const dots = feedings
    .map((f) => {
      const time = new Date(f.time);
      const dayIndex = Math.round((getDayStart(time, dayBreakHour).getTime() - firstDayStart.getTime()) / DAY_MS);
      return {
        dayIndex,
        minute: time.getHours() * 60 + time.getMinutes(),
        amount: f.amount_ml,
      };
    })
    .filter((d) => d.dayIndex >= 0 && d.dayIndex < days);

  if (dots.length === 0) return null;

  const maxAmount = Math.max(...dots.map((d) => d.amount), 1);
  // Classic actogram: each row is a day, oldest at the top, time left to right.
  const toX = (minute: number) => PAD_LEFT + timeFraction(minute, dayBreakHour) * PLOT_W;
  const toY = (dayIndex: number) => PAD_TOP + ((dayIndex + 0.5) / days) * PLOT_H;

  const hourTicks = [0, 3, 6, 9, 12, 15, 18, 21].map((offset) => ({
    x: PAD_LEFT + (offset / 24) * PLOT_W,
    label: String((dayBreakHour + offset) % 24).padStart(2, '0'),
    isMajor: offset % 6 === 0,
  }));

  // ~5 date labels down the left side
  const tickStep = Math.max(1, Math.ceil(days / 5));
  const dateTicks = Array.from({ length: days }, (_, i) => i)
    .filter((i) => i % tickStep === 0)
    .map((i) => ({
      y: toY(i),
      label: new Date(firstDayStart.getTime() + i * DAY_MS).toLocaleDateString('sv-SE', {
        month: 'numeric',
        day: 'numeric',
      }),
    }));

  // Vertical bands for detected pattern ranges; a range crossing the day
  // break wraps and is drawn as two rects.
  const bands = patterns.flatMap((pattern, index) => {
    const start = timeFraction(pattern.rangeStartMinute, dayBreakHour);
    const end = timeFraction(pattern.rangeEndMinute, dayBreakHour);
    const segments = start <= end ? [[start, end]] : [[start, 1], [0, end]];
    return segments.map(([from, to], part) => (
      <rect
        key={`${index}-${part}`}
        x={PAD_LEFT + from * PLOT_W}
        y={PAD_TOP}
        width={Math.max((to - from) * PLOT_W, 1)}
        height={PLOT_H}
        className="fill-primary dark:fill-blue-500"
        opacity="0.07"
      />
    ));
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {bands}

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

      {dots.map((dot, i) => (
        <circle
          key={i}
          cx={toX(dot.minute)}
          cy={toY(dot.dayIndex)}
          r={1.4 + (dot.amount / maxAmount) * 2.4}
          className="fill-primary dark:fill-blue-500"
          opacity="0.75"
        />
      ))}
    </svg>
  );
}
