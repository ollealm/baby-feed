'use client';

import { useState } from 'react';
import { useApp } from '@/lib/context';
import { getDayStart } from '@/lib/utils';
import { getKcalPer100ml } from '@/lib/nutrition';
import { analyzeFeedingPatterns } from '@/lib/feedingPatterns';
import { Chart } from './Chart';
import { FeedingRhythm } from './FeedingRhythm';

const LIST_PREVIEW_DAYS = 14;
const RHYTHM_DAYS = 30;

interface DayData {
  date: Date;
  label: string;
  totalMl: number;
  totalKcal: number;
  feedCount: number;
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
        totalMl: 0,
        totalKcal: 0,
        feedCount: 0,
      });
    }

    const day = dayMap.get(key)!;
    day.totalMl += f.amount_ml;
    day.totalKcal += (f.amount_ml / 100) * getKcalPer100ml(f.formula);
    day.feedCount++;
  }

  // All previous days, newest first for the list
  const days = Array.from(dayMap.values())
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  // Chart: oldest first for left-to-right time axis
  const chartDays = [...days].reverse();

  const rollingDays = family.chart_rolling_days ?? 3;
  const { patterns } = analyzeFeedingPatterns(feedings, dayBreak, { now: analysisNow });
  const listDays = showAllDays ? days : days.slice(0, LIST_PREVIEW_DAYS);

  return (
    <div className="mt-8">
      <h3 className="text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide">
        History
        <span className="ml-1 font-normal normal-case">(rolling {rollingDays} days)</span>
      </h3>

      {chartDays.length > 1 && (
        <div className="mt-2">
          <Chart
            data={chartDays.map(d => ({ label: d.label, ml: d.totalMl, times: d.feedCount }))}
            rollingDays={rollingDays}
          />
        </div>
      )}

      <h3 className="mt-6 text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide">
        Rhythm
        <span className="ml-1 font-normal normal-case">(last {RHYTHM_DAYS} days, dot size = amount)</span>
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
        {listDays.map(d => (
          <div key={d.date.toISOString()} className="flex items-center justify-between py-px text-sm">
            <span>{d.label}</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold w-16 text-right">{d.totalMl} ml</span>
              <span className="text-muted dark:text-dark-muted w-16 text-right">{Math.round(d.totalKcal)} kcal</span>
              <span className="text-muted dark:text-dark-muted w-16 text-right">{d.feedCount} times</span>
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
