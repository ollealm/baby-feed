'use client';

import { useApp } from '@/lib/context';
import { formatDuration, getDayStart } from '@/lib/utils';
import { feedingKcal, formulaMl, getKcalPer100ml } from '@/lib/nutrition';
import { Feeding } from '@/lib/types';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function avgInterval(feeds: Feeding[]): number {
  if (feeds.length < 2) return 0;
  const times = feeds.map(f => new Date(f.time).getTime()).sort((a, b) => a - b);
  return (times[times.length - 1] - times[0]) / (times.length - 1);
}

function perDay(count: number, days: number): string {
  return days > 1 ? (count / days).toFixed(1) : String(count);
}

export function Stats() {
  const { feedings, family } = useApp();

  if (!family || feedings.length === 0) return null;

  const now = new Date();
  const todayStart = getDayStart(now, family.day_break_hour);
  const elapsedToday = now.getTime() - todayStart.getTime();

  function calcStats(hours: number) {
    const cutoff = new Date(now.getTime() - hours * HOUR);
    const feeds = feedings.filter(f => new Date(f.time) >= cutoff);
    const bottles = feeds.filter(f => !f.is_food);
    const meals = feeds.filter(f => f.is_food);
    const days = hours / 24;
    const norm = (v: number) => Math.round(days > 1 ? v / days : v);

    const totalMl = bottles.reduce((s, f) => s + f.amount_ml, 0);
    const foodKcal = meals.reduce((s, f) => s + f.amount_ml, 0);
    const totalKcal = feeds.reduce((s, f) => s + feedingKcal(f), 0);

    return {
      formulaMl: norm(totalMl),
      formulaKcal: norm(totalKcal - foodKcal),
      foodKcal: norm(foodKcal),
      totalKcal: norm(totalKcal),
      avgBottle: bottles.length ? Math.round(totalMl / bottles.length) : 0,
      avgMeal: meals.length ? Math.round(foodKcal / meals.length) : 0,
      interval: avgInterval(feeds),
      bottleInterval: avgInterval(bottles),
      bottles: perDay(bottles.length, days),
      meals: perDay(meals.length, days),
      feeds: perDay(feeds.length, days),
    };
  }

  // Average intake up to the current time of day, over the past N days
  function calcAtThisTime(daysBack: number, valueOf: (f: Feeding) => number): number {
    let total = 0;
    for (let d = 1; d <= daysBack; d++) {
      const pastDayStart = todayStart.getTime() - d * DAY;
      const pastCutoff = pastDayStart + elapsedToday;
      total += feedings
        .filter(f => { const t = new Date(f.time).getTime(); return t >= pastDayStart && t <= pastCutoff; })
        .reduce((s, f) => s + valueOf(f), 0);
    }
    return Math.round(total / daysBack);
  }

  // Average intake in the coming hour (same time window on past days)
  function calcNextHour(daysBack: number, valueOf: (f: Feeding) => number): number {
    let total = 0;
    for (let d = 1; d <= daysBack; d++) {
      const windowStart = todayStart.getTime() - d * DAY + elapsedToday;
      const windowEnd = windowStart + HOUR;
      total += feedings
        .filter(f => { const t = new Date(f.time).getTime(); return t >= windowStart && t < windowEnd; })
        .reduce((s, f) => s + valueOf(f), 0);
    }
    return Math.round(total / daysBack);
  }

  const todayFeeds = feedings.filter(f => new Date(f.time) >= todayStart);
  const todayKcal = Math.round(todayFeeds.reduce((s, f) => s + feedingKcal(f), 0));

  const d1 = calcStats(24);
  const d3 = calcStats(72);
  const d10 = calcStats(240);

  const windows = [1, 3, 10] as const;
  const atKcal = windows.map(d => calcAtThisTime(d, feedingKcal));
  const nextKcal = windows.map(d => calcNextHour(d, feedingKcal));
  const nextMl = windows.map(d => calcNextHour(d, formulaMl));

  // kcal expressed as ml of the current formula, so the kcal delta reads as "one more/less bottle of X ml"
  const kcalToMl = (kcal: number) => Math.round(kcal * 100 / getKcalPer100ml(family!.current_formula));

  function deltaCell(today: number, usual: number, unit: string) {
    const delta = today - usual;
    const cls = delta < 0 ? 'text-amber-600 dark:text-amber-500' : 'text-emerald-600 dark:text-emerald-500';
    return <span className={cls}>{delta >= 0 ? '+' : '−'}{Math.abs(delta)} {unit}</span>;
  }

  const dur = (ms: number) => ms > 0 ? formatDuration(ms) : '—';
  const triple = (vals: readonly number[], unit: string) => vals.map(v => `${v} ${unit}`) as [string, string, string];

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
            <Row label={`At this time (${todayKcal} kcal)`} values={triple(atKcal, 'kcal')} />
            <Row label="Delta" values={atKcal.map(v => deltaCell(todayKcal, v, 'kcal')) as Cells} />
            <Row label="Delta as formula" values={atKcal.map(v => deltaCell(kcalToMl(todayKcal), kcalToMl(v), 'ml')) as Cells} />
            <Row label="Next hour (total)" values={triple(nextKcal, 'kcal')} />
            <Row label="Next hour (formula)" values={triple(nextMl, 'ml')} />

            <Row label="Formula" values={triple([d1.formulaMl, d3.formulaMl, d10.formulaMl], 'ml')} divider />
            <Row label="Formula" values={triple([d1.formulaKcal, d3.formulaKcal, d10.formulaKcal], 'kcal')} />
            <Row label="Food" values={triple([d1.foodKcal, d3.foodKcal, d10.foodKcal], 'kcal')} />
            <Row label="Total" values={triple([d1.totalKcal, d3.totalKcal, d10.totalKcal], 'kcal')} />

            <Row label="Avg bottle" values={triple([d1.avgBottle, d3.avgBottle, d10.avgBottle], 'ml')} divider />
            <Row label="Avg meal" values={triple([d1.avgMeal, d3.avgMeal, d10.avgMeal], 'kcal')} />

            <Row label="Interval" values={[dur(d1.interval), dur(d3.interval), dur(d10.interval)]} divider />
            <Row label="Bottle interval" values={[dur(d1.bottleInterval), dur(d3.bottleInterval), dur(d10.bottleInterval)]} />

            <Row label="Bottles" values={[d1.bottles, d3.bottles, d10.bottles]} divider />
            <Row label="Meals" values={[d1.meals, d3.meals, d10.meals]} />
            <Row label="Feeds" values={[d1.feeds, d3.feeds, d10.feeds]} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Cells = [React.ReactNode, React.ReactNode, React.ReactNode];

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
