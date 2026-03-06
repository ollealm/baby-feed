'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { roundToNearest15, formatTime } from '@/lib/utils';

export function FeedingForm() {
  const { family, addFeeding } = useApp();

  const [amount, setAmount] = useState(family?.default_amount_ml ?? 100);
  const [time, setTime] = useState(() => roundToNearest15(new Date()));
  const [isEstimate, setIsEstimate] = useState(false);
  const [vitaminD, setVitaminD] = useState(false);
  const [probiotics, setProbiotics] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (family?.default_amount_ml) {
      setAmount(family.default_amount_ml);
    }
  }, [family?.default_amount_ml]);

  async function handleSave() {
    setSaving(true);
    try {
      await addFeeding({
        amount_ml: amount,
        time,
        is_estimate: isEstimate,
        vitamin_d: vitaminD,
        probiotics,
      });
      setTime(roundToNearest15(new Date()));
      setIsEstimate(false);
      setVitaminD(false);
      setProbiotics(false);
      setAmount(family?.default_amount_ml ?? 100);
    } finally {
      setSaving(false);
    }
  }

  function adjustAmount(delta: number) {
    setAmount(prev => Math.max(0, prev + delta));
  }

  function adjustTime(deltaMinutes: number) {
    setTime(prev => {
      const d = new Date(prev);
      d.setMinutes(d.getMinutes() + deltaMinutes);
      return d;
    });
  }

  return (
    <div className="bg-surface dark:bg-dark-surface rounded-xl p-4 space-y-4">
      {/* Toggles */}
      <div className="flex justify-center gap-2">
        <Toggle active={isEstimate} onToggle={() => setIsEstimate(!isEstimate)} label="Estimate" />
        <Toggle active={vitaminD} onToggle={() => setVitaminD(!vitaminD)} label="Vitamin D" />
        <Toggle active={probiotics} onToggle={() => setProbiotics(!probiotics)} label="Probiotics" />
      </div>

      {/* Amount + Time side by side */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => adjustAmount(-5)}
          className="w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-border text-2xl font-bold active:bg-gray-200 dark:active:bg-dark-muted/30 select-none"
        >
          &minus;
        </button>
        <span className="text-3xl font-bold w-28 text-center">
          {amount} <span className="text-lg">ml</span>
        </span>
        <button
          onClick={() => adjustAmount(5)}
          className="w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-border text-2xl font-bold active:bg-gray-200 dark:active:bg-dark-muted/30 select-none"
        >
          +
        </button>
      </div>

      {/* Time */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => adjustTime(-15)}
          className="w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-border text-2xl font-bold active:bg-gray-200 dark:active:bg-dark-muted/30 select-none"
        >
          &minus;
        </button>
        <span className="text-3xl font-bold w-28 text-center">
          {formatTime(time)}
        </span>
        <button
          onClick={() => adjustTime(15)}
          className="w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-border text-2xl font-bold active:bg-gray-200 dark:active:bg-dark-muted/30 select-none"
        >
          +
        </button>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-lg active:bg-primary-hover disabled:opacity-50 select-none"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

function Toggle({ active, onToggle, label }: { active: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-2 rounded-lg text-sm font-medium select-none transition-colors ${
        active
          ? 'bg-primary text-white'
          : 'bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-dark-muted'
      }`}
    >
      {label}
    </button>
  );
}
