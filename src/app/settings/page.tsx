'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import Link from 'next/link';

const FORMULAS = ['BabySemp 1', 'BabySemp 2'];

export default function SettingsPage() {
  const { family, updateSettings } = useApp();

  // String state to avoid the "clears to 0" annoyance with number inputs
  const [defaultAmount, setDefaultAmount] = useState(String(family?.default_amount_ml  ?? 100));
  const [interval,      setInterval_]     = useState(String(family?.feeding_interval_minutes ?? 180));
  const [span,          setSpan]          = useState(String(family?.feeding_span_minutes     ?? 60));
  const [dayBreak,      setDayBreak]      = useState(String(family?.day_break_hour           ?? 5));
  const [rollingDays,   setRollingDays]   = useState(String(family?.chart_rolling_days       ?? 3));
  const [formula,       setFormula]       = useState(family?.current_formula || FORMULAS[0]);
  const [saved,         setSaved]         = useState(false);

  useEffect(() => {
    if (family) {
      setDefaultAmount(String(family.default_amount_ml));
      setInterval_(String(family.feeding_interval_minutes));
      setSpan(String(family.feeding_span_minutes ?? 60));
      setDayBreak(String(family.day_break_hour));
      setRollingDays(String(family.chart_rolling_days ?? 3));
      setFormula(family.current_formula || FORMULAS[0]);
    }
  }, [family]);

  async function handleSave() {
    await updateSettings({
      default_amount_ml:         Math.max(0,  parseInt(defaultAmount) || 0),
      feeding_interval_minutes:  Math.max(1,  parseInt(interval)      || 180),
      feeding_span_minutes:      Math.max(1,  parseInt(span)          || 60),
      day_break_hour:            Math.max(0,  Math.min(23, parseInt(dayBreak) || 0)),
      chart_rolling_days:        Math.max(1,  parseInt(rollingDays)   || 3),
      current_formula: formula,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!family) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted dark:text-dark-muted">No family loaded</p>
        <Link href="/" className="text-primary">Go home</Link>
      </div>
    );
  }

  const inputClass = 'w-full py-2 px-3 rounded-md bg-surface dark:bg-dark-surface focus:outline-none focus:ring-2 focus:ring-primary transition-shadow';

  return (
    <div>
      <header className="flex items-center justify-between py-4">
        <Link href="/" className="text-primary text-sm">&larr; Back</Link>
        <h1 className="text-xl font-bold">Settings</h1>
        <div className="w-12" />
      </header>

      <div className="space-y-5">
        <Field label="Default amount (ml)">
          <input type="number" value={defaultAmount} onChange={e => setDefaultAmount(e.target.value)} className={inputClass} />
        </Field>

        <Field label="Feeding interval (minutes)">
          <input type="number" value={interval} onChange={e => setInterval_(e.target.value)} className={inputClass} />
        </Field>

        <Field label="Feeding span (minutes)">
          <input type="number" value={span} onChange={e => setSpan(e.target.value)} className={inputClass} />
          <p className="text-xs text-muted dark:text-dark-muted mt-1">
            Eating window after interval — yellow bar, then overdue
          </p>
        </Field>

        <Field label="Day break hour (0–23)">
          <input type="number" min={0} max={23} value={dayBreak} onChange={e => setDayBreak(e.target.value)} className={inputClass} />
          <p className="text-xs text-muted dark:text-dark-muted mt-1">
            Day starts at {parseInt(dayBreak) || 0}:00 instead of midnight
          </p>
        </Field>

        <Field label="Chart rolling average (days)">
          <input type="number" min={1} max={30} value={rollingDays} onChange={e => setRollingDays(e.target.value)} className={inputClass} />
          <p className="text-xs text-muted dark:text-dark-muted mt-1">
            Smoothing window for the history chart
          </p>
        </Field>

        <Field label="Formula">
          <select value={formula} onChange={e => setFormula(e.target.value)} className={inputClass}>
            {FORMULAS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <p className="text-xs text-muted dark:text-dark-muted mt-1">
            Saved to all new entries. Imports use current selection.
          </p>
        </Field>

        <button
          onClick={handleSave}
          className="w-full py-3 bg-primary text-white rounded-md font-semibold text-lg hover:bg-primary-hover transition-colors"
        >
          {saved ? 'Saved!' : 'Save'}
        </button>

        <div className="pt-4 border-t border-border dark:border-dark-border">
          <p className="text-xs text-muted dark:text-dark-muted uppercase tracking-wide mb-1">Family Code</p>
          <p className="text-lg font-mono font-bold">{family.code}</p>
          <p className="text-xs text-muted dark:text-dark-muted mt-1">Share this code or link to sync with another device</p>
          <p className="text-xs font-mono text-muted dark:text-dark-muted mt-1 break-all">
            {typeof window !== 'undefined' ? window.location.origin : ''}/?family={family.code}
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-muted dark:text-dark-muted">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
