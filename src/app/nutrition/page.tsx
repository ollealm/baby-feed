'use client';

import { useApp } from '@/lib/context';
import { NUTRIENTS, FORMULA_DATA, CATEGORIES, feedingKcal } from '@/lib/nutrition';
import Link from 'next/link';

function fmt(v: number): string {
  if (v >= 100) return Math.round(v).toString();
  if (v >= 1) return v.toFixed(1);
  return v.toFixed(2);
}

export default function NutritionPage() {
  const { feedings, family } = useApp();

  if (!family) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted dark:text-dark-muted">No family loaded</p>
        <Link href="/" className="text-primary">Go home</Link>
      </div>
    );
  }

  const now = new Date();

  function feedsWithin(hours: number) {
    const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
    return feedings.filter(f => new Date(f.time) >= cutoff);
  }

  // Per-day average of each nutrient from formula only (real-food entries carry no nutrient data)
  function calcNutrients(hours: number) {
    const feeds = feedsWithin(hours).filter(f => !f.is_food);
    const days = hours / 24;

    const result: Record<string, number> = {};
    for (const n of NUTRIENTS) {
      const total = feeds.reduce((s, f) => {
        const per100 = FORMULA_DATA[f.formula]?.[n.name] ?? 0;
        return s + (f.amount_ml / 100) * per100;
      }, 0);
      result[n.name] = days > 1 ? total / days : total;
    }
    return result;
  }

  // Per-day average energy, split by source
  function calcEnergy(hours: number) {
    const feeds = feedsWithin(hours);
    const days = Math.max(1, hours / 24);
    const formula = feeds.filter(f => !f.is_food).reduce((s, f) => s + feedingKcal(f), 0) / days;
    const food = feeds.filter(f => f.is_food).reduce((s, f) => s + feedingKcal(f), 0) / days;
    return { formula, food, total: formula + food };
  }

  const d1 = calcNutrients(24);
  const d3 = calcNutrients(72);
  const d10 = calcNutrients(240);

  const e1 = calcEnergy(24);
  const e3 = calcEnergy(72);
  const e10 = calcEnergy(240);

  const thClass = 'text-right font-normal py-1.5 px-2';
  const tdClass = 'py-1 px-2 text-right font-semibold';

  return (
    <div>
      <header className="flex items-center justify-between py-4">
        <Link href="/" className="text-primary text-sm">&larr; Back</Link>
        <h1 className="text-xl font-bold">Nutrition</h1>
        <div className="w-12" />
      </header>

      <div className="mt-2">
        <h3 className="text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide">
          Energy <span className="font-normal normal-case">(kcal per day)</span>
        </h3>
        <div className="mt-1 bg-surface dark:bg-dark-surface rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted dark:text-dark-muted">
                <th className="text-left font-normal py-1.5 px-2"></th>
                <th className={thClass}>1 day</th>
                <th className={thClass}>3 days</th>
                <th className={thClass}>10 days</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border dark:border-dark-border">
                <td className="py-1 px-2 text-muted dark:text-dark-muted text-xs">Formula</td>
                <td className={tdClass}>{Math.round(e1.formula)}</td>
                <td className={tdClass}>{Math.round(e3.formula)}</td>
                <td className={tdClass}>{Math.round(e10.formula)}</td>
              </tr>
              <tr className="border-t border-border dark:border-dark-border">
                <td className="py-1 px-2 text-muted dark:text-dark-muted text-xs">Real food</td>
                <td className={tdClass}>{Math.round(e1.food)}</td>
                <td className={tdClass}>{Math.round(e3.food)}</td>
                <td className={tdClass}>{Math.round(e10.food)}</td>
              </tr>
              <tr className="border-t border-border dark:border-dark-border">
                <td className="py-1 px-2 text-muted dark:text-dark-muted text-xs">Total</td>
                <td className={tdClass}>{Math.round(e1.total)}</td>
                <td className={tdClass}>{Math.round(e3.total)}</td>
                <td className={tdClass}>{Math.round(e10.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted dark:text-dark-muted mt-1">
          Nutrients below are from formula only.
        </p>
      </div>

      {CATEGORIES.map(cat => {
        const nutrients = NUTRIENTS.filter(n => n.category === cat.key);
        if (nutrients.length === 0) return null;

        return (
          <div key={cat.key} className="mt-6">
            <h3 className="text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide">
              {cat.label}
            </h3>
            <div className="mt-1 bg-surface dark:bg-dark-surface rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted dark:text-dark-muted">
                    <th className="text-left font-normal py-1.5 px-2"></th>
                    <th className={thClass}>1 day</th>
                    <th className={thClass}>3 days</th>
                    <th className={thClass}>10 days</th>
                  </tr>
                </thead>
                <tbody>
                  {nutrients.map(n => (
                    <tr key={n.name} className="border-t border-border dark:border-dark-border">
                      <td className="py-1 px-2 text-muted dark:text-dark-muted text-xs">
                        {n.name} <span className="opacity-60">({n.unit})</span>
                      </td>
                      <td className={tdClass}>{fmt(d1[n.name])}</td>
                      <td className={tdClass}>{fmt(d3[n.name])}</td>
                      <td className={tdClass}>{fmt(d10[n.name])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
