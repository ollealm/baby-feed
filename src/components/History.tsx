'use client';

import { useState } from 'react';
import { useApp } from '@/lib/context';
import { getDayStart } from '@/lib/utils';
import { feedingKcal } from '@/lib/nutrition';
import { analyzeFeedingPatterns } from '@/lib/feedingPatterns';
import { Chart, ChartDay } from './Chart';
import { FeedingRhythm } from './FeedingRhythm';

const LIST_PREVIEW_DAYS = 14;
const RHYTHM_DAYS = 30;

interface DayData extends ChartDay {
  date: Date;
}

export function History() {
  const { feedings, family } = useApp();
  const [showAllDays, setShowAllDays] = useState(false);
  const [analysisNow] = useState(() => new Date());

  if (!family || feedings.length === 0) return null;

  const dayBreak = family.day_break_hour;
  const todayStart = getDayStart(analysisNow, dayBreak);

  const dayMap = new Map<string, DayData>();

  for (const f of feedings) {
    const feedTime = new Date(f.time);
    const dayStart = getDayStart(feedTime, dayBreak);

    // Exclude the current (ongoing) day
    if (dayStart.getTime() >= todayStart.getTime()) continue;

    const key = dayStart.toISOString().slice(0, 10);

    if (!dayMap.has(key)) {
      dayMap.set(key, {
        date: dayStart,
        label: dayStart.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' }),
        formulaKcal: 0,
        foodKcal: 0,
        bottles: 0,
        meals: 0,
      });
    }

    const day = dayMap.get(key)!;
    if (f.is_food) {
      day.foodKcal += feedingKcal(f);
      day.meals++;
    } else {
      day.formulaKcal += feedingKcal(f);
      day.bottles++;
    }
  }

  // All previous days, newest first for the list
  const days = Array.from(dayMap.values())
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  // Chart: oldest first for left-to-right time axis
  const chartDays = [...days].reverse();

  const rollingDays = family.chart_rolling_days ?? 3;
  const { patterns } = analyzeFeedingPatterns(feedings, dayBreak, { now: analysisNow });
  const listDays = showAllDays ? days : days.slice(0, LIST_PREVIEW_DAYS);

  const col = 'w-14 text-right';

  return (
    <div className="mt-8">
      <h3 className="text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide">
        History
        <span className="ml-1 font-normal normal-case">(kcal per day, rolling {rollingDays} days)</span>
      </h3>

      {chartDays.length > 1 && (
        <div className="mt-2">
          <Chart data={chartDays} rollingDays={rollingDays} />
        </div>
      )}

      <h3 className="mt-6 text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide">
        Rhythm
        <span className="ml-1 font-normal normal-case">(last {RHYTHM_DAYS} days)</span>
      </h3>
      <div className="mt-2">
        <FeedingRhythm
          feedings={feedings}
          dayBreakHour={dayBreak}
          patterns={patterns}
          days={RHYTHM_DAYS}
          now={analysisNow}
        />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between py-px text-xs text-muted dark:text-dark-muted">
          <span />
          <div className="flex items-center gap-2">
            <span className={col}>formula</span>
            <span className={col}>food</span>
            <span className={col}>total</span>
            <span className={col}>times</span>
          </div>
        </div>
        {listDays.map(d => (
          <div key={d.date.toISOString()} className="flex items-center justify-between py-px text-sm">
            <span>{d.label}</span>
            <div className="flex items-center gap-2">
              <span className={`${col} text-muted dark:text-dark-muted`}>{Math.round(d.formulaKcal)}</span>
              <span className={`${col} text-muted dark:text-dark-muted`}>{Math.round(d.foodKcal)}</span>
              <span className={`${col} font-semibold`}>{Math.round(d.formulaKcal + d.foodKcal)}</span>
              <span className={`${col} text-muted dark:text-dark-muted`}>{d.bottles}+{d.meals}</span>
            </div>
          </div>
        ))}
        {days.length > LIST_PREVIEW_DAYS && (
          <button
            onClick={() => setShowAllDays(!showAllDays)}
            className="mt-1 text-sm text-muted dark:text-dark-muted hover:text-foreground dark:hover:text-dark-foreground"
          >
            {showAllDays ? 'Show less' : `Show all (${days.length} days)`}
          </button>
        )}
      </div>
    </div>
  );
}
