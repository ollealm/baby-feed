'use client';

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useApp } from '@/lib/context';
import { roundToNearest15, formatTime } from '@/lib/utils';
import { getKcalPer100ml } from '@/lib/nutrition';

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

/** Spoon + fork — used for the real-food toggle and list badges. */
export function FoodIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* fork */}
      <path d="M6 3v6a2.5 2.5 0 0 0 5 0V3" />
      <path d="M8.5 3v18" />
      {/* spoon */}
      <path d="M17.5 3c-2 0-3 2.5-3 5s1.3 4 3 4 3-1.5 3-4-1-5-3-5z" />
      <path d="M17.5 12v9" />
    </svg>
  );
}

export function FeedingForm() {
  const { family, addFeeding, updateFeeding, deleteFeeding, editingFeeding, setEditingFeeding } = useApp();

  const [amount, setAmount]             = useState(family?.default_amount_ml ?? 100);
  const [time, setTime]                 = useState(() => roundToNearest15(new Date()));
  // Legacy flag: no longer settable in the UI, but preserved when editing old entries.
  const [isEstimate, setIsEstimate]     = useState(false);
  const [isFood, setIsFood]             = useState(false);
  const [vitaminD, setVitaminD]         = useState(false);
  const [probiotics, setProbiotics]     = useState(false);
  const [omega3, setOmega3]             = useState(false);
  const [saving, setSaving]             = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [modalAmount, setModalAmount]   = useState('');
  const [modalDirection, setModalDirection] = useState<'reduce' | 'add'>('reduce');
  // kcal calculator (food mode) — kcal/100g is kept between opens since the same jar is often logged repeatedly
  const [kcalPer100g, setKcalPer100g]   = useState('');
  const [grams, setGrams]               = useState('');

  const unit = isFood ? 'kcal' : 'ml';

  useEffect(() => {
    if (editingFeeding) {
      setAmount(editingFeeding.amount_ml === 0 ? (family?.default_amount_ml ?? 100) : editingFeeding.amount_ml);
      setTime(new Date(editingFeeding.time));
      setIsEstimate(editingFeeding.is_estimate);
      setIsFood(editingFeeding.is_food);
      setVitaminD(editingFeeding.vitamin_d);
      setProbiotics(editingFeeding.probiotics);
      setOmega3(editingFeeding.omega3);
    }
  }, [editingFeeding?.id]);

  useEffect(() => {
    if (!editingFeeding && family?.default_amount_ml && !isFood) {
      setAmount(family.default_amount_ml);
    }
  }, [family?.default_amount_ml]);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && !editingFeeding) {
        setTime(roundToNearest15(new Date()));
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [editingFeeding]);

  function resetForm() {
    setAmount(family?.default_amount_ml ?? 100);
    setTime(roundToNearest15(new Date()));
    setIsEstimate(false);
    setIsFood(false);
    setVitaminD(false);
    setProbiotics(false);
    setOmega3(false);
    setConfirmDelete(false);
  }

  function toggleFood() {
    const next = !isFood;
    setIsFood(next);
    // Convert the current value between ml and kcal with the current formula, in 5-unit steps
    const kcalPer100ml = getKcalPer100ml(family?.current_formula ?? '');
    setAmount(prev => {
      const converted = next ? prev * kcalPer100ml / 100 : prev * 100 / kcalPer100ml;
      return Math.max(0, Math.round(converted / 5) * 5);
    });
  }

  function payload(amountOverride?: number) {
    return {
      amount_ml: amountOverride ?? amount,
      time,
      is_estimate: isEstimate,
      is_food: isFood,
      vitamin_d: vitaminD,
      probiotics,
      omega3,
    };
  }

  async function handleSave() {
    setSaving(true);
    try {
      await addFeeding(payload());
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleTimePlaceholder() {
    setSaving(true);
    try {
      await addFeeding(payload(0));
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!editingFeeding) return;
    setSaving(true);
    try {
      await updateFeeding(editingFeeding.id, payload());
      setEditingFeeding(null);
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdatePlaceholder() {
    if (!editingFeeding) return;
    setSaving(true);
    try {
      await updateFeeding(editingFeeding.id, payload(0));
      setEditingFeeding(null);
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteFromEdit() {
    if (!editingFeeding) return;
    if (confirmDelete) {
      await deleteFeeding(editingFeeding.id);
      setEditingFeeding(null);
      resetForm();
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  function handleCancel() {
    setEditingFeeding(null);
    resetForm();
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

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const handlePressDown = useCallback((direction: 'reduce' | 'add') => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setModalAmount('');
      setGrams('');
      setModalDirection(direction);
      setShowAmountModal(true);
    }, 500);
  }, []);

  const handlePressUp = useCallback((delta: number) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!longPressTriggered.current) {
      adjustAmount(delta);
    }
  }, []);

  const handlePressLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Value the modal will apply: computed kcal in food mode, typed ml otherwise
  const calculatedKcal = Math.round(((parseFloat(kcalPer100g) || 0) / 100) * (parseFloat(grams) || 0));
  const modalValue = isFood ? calculatedKcal : parseInt(modalAmount);

  function applyModal(mode: 'set' | 'delta') {
    const val = modalValue;
    if (!isNaN(val) && val >= 0) {
      if (mode === 'set') {
        setAmount(val);
      } else if (val > 0) {
        setAmount(prev => Math.max(0, modalDirection === 'reduce' ? prev - val : prev + val));
      }
    }
    setShowAmountModal(false);
  }

  const btnBase = 'w-12 h-12 rounded-md bg-gray-100 dark:bg-dark-border text-2xl font-bold active:bg-gray-200 dark:active:bg-dark-muted/30 select-none';
  const modalInput = 'h-12 text-center text-2xl font-bold rounded-md border border-border dark:border-dark-border bg-transparent focus:outline-none focus:ring-1 focus:ring-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

  return (
    <div className="bg-surface dark:bg-dark-surface rounded-md p-4 space-y-4">

      {/* Editing banner */}
      {editingFeeding && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted dark:text-dark-muted">
            Editing {formatTime(new Date(editingFeeding.time))}
            {editingFeeding.amount_ml > 0
              ? ` · ${editingFeeding.amount_ml} ${editingFeeding.is_food ? 'kcal' : 'ml'}`
              : ' · placeholder'}
          </span>
          <button onClick={handleCancel} className="text-primary font-medium">Cancel</button>
        </div>
      )}

      {/* Toggles — same width as +/- rows */}
      <div className="flex items-center justify-between w-[232px] mx-auto">
        <Toggle active={isFood}     onToggle={toggleFood}                        color="orange"><FoodIcon /></Toggle>
        <Toggle active={vitaminD}   onToggle={() => setVitaminD(!vitaminD)}     color="blue"><span>D</span></Toggle>
        <Toggle active={probiotics} onToggle={() => setProbiotics(!probiotics)} color="purple"><span>P</span></Toggle>
        <Toggle active={omega3}     onToggle={() => setOmega3(!omega3)}         color="teal"><FishIcon /></Toggle>
      </div>

      {/* Amount */}
      <div className="flex items-center justify-center gap-3">
        <button
          onPointerDown={() => handlePressDown('reduce')}
          onPointerUp={() => handlePressUp(-5)}
          onPointerLeave={handlePressLeave}
          className={btnBase}
        >&minus;</button>
        <span className="text-3xl font-bold w-28 text-center whitespace-nowrap">
          {amount} <span className="text-lg">{unit}</span>
        </span>
        <button
          onPointerDown={() => handlePressDown('add')}
          onPointerUp={() => handlePressUp(5)}
          onPointerLeave={handlePressLeave}
          className={btnBase}
        >+</button>
      </div>

      {/* Time */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => adjustTime(-15)} className={btnBase}>&minus;</button>
        <span className="text-3xl font-bold w-28 text-center">{formatTime(time)}</span>
        <button onClick={() => adjustTime(15)} className={btnBase}>+</button>
      </div>

      {/* Action buttons — same width as +/- rows */}
      {editingFeeding ? (
        <div className="flex items-center gap-3 w-[232px] mx-auto">
          <button
            onClick={handleDeleteFromEdit}
            className={`w-12 h-12 rounded-md flex items-center justify-center select-none transition-colors ${confirmDelete ? 'bg-red-600' : 'bg-red-500'} text-white`}
          >
            {confirmDelete ? '✓' : <TrashIcon />}
          </button>
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="flex-1 h-12 bg-primary text-white rounded-md font-semibold text-lg active:bg-primary-hover disabled:opacity-50 select-none"
          >
            {saving ? 'Saving...' : 'Update'}
          </button>
          <button
            onClick={handleUpdatePlaceholder}
            disabled={saving}
            className="w-12 h-12 rounded-md flex items-center justify-center bg-primary text-white active:bg-primary-hover disabled:opacity-50 select-none transition-colors"
          >
            <ClockIcon />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 w-[232px] mx-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-12 bg-primary text-white rounded-md font-semibold text-lg active:bg-primary-hover disabled:opacity-50 select-none"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleTimePlaceholder}
            disabled={saving}
            className="w-12 h-12 rounded-md flex items-center justify-center bg-primary text-white active:bg-primary-hover disabled:opacity-50 select-none transition-colors"
          >
            <ClockIcon />
          </button>
        </div>
      )}

      {/* Amount modal — ml entry, or kcal calculator in food mode */}
      {showAmountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowAmountModal(false)}>
          <div className="bg-surface dark:bg-dark-surface rounded-lg p-5 space-y-4" onClick={e => e.stopPropagation()}>
            {isFood ? (
              <div className="w-[232px] space-y-3">
                <div className="flex items-center gap-3">
                  <label className="flex-1">
                    <span className="block text-xs text-muted dark:text-dark-muted mb-1">kcal / 100 g</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      autoFocus={!kcalPer100g}
                      value={kcalPer100g}
                      onChange={e => setKcalPer100g(e.target.value)}
                      placeholder="0"
                      className={`w-full ${modalInput}`}
                    />
                  </label>
                  <span className="text-xl text-muted dark:text-dark-muted pt-5">×</span>
                  <label className="flex-1">
                    <span className="block text-xs text-muted dark:text-dark-muted mb-1">grams</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      autoFocus={!!kcalPer100g}
                      value={grams}
                      onChange={e => setGrams(e.target.value)}
                      placeholder="0"
                      className={`w-full ${modalInput}`}
                    />
                  </label>
                </div>
                <div className="text-center text-3xl font-bold">
                  {calculatedKcal} <span className="text-lg">kcal</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setModalAmount(prev => String(Math.max(0, (parseInt(prev) || 0) - 5)))}
                  className={btnBase}
                >&minus;</button>
                <input
                  type="number"
                  inputMode="numeric"
                  autoFocus
                  value={modalAmount}
                  onChange={e => setModalAmount(e.target.value)}
                  placeholder="ml"
                  className={`w-28 text-3xl ${modalInput}`}
                />
                <button
                  onClick={() => setModalAmount(prev => String((parseInt(prev) || 0) + 5))}
                  className={btnBase}
                >+</button>
              </div>
            )}
            <div className="flex gap-3 w-[232px] mx-auto">
              <button
                onClick={() => applyModal('set')}
                className="flex-1 h-12 rounded-md bg-gray-200 dark:bg-dark-border font-semibold text-lg"
              >
                Set
              </button>
              <button
                onClick={() => applyModal('delta')}
                className="flex-1 h-12 rounded-md bg-primary text-white font-semibold text-lg"
              >
                {modalDirection === 'reduce' ? 'Reduce' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FishIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12 C18 7, 10 7, 6 12 C10 17, 18 17, 22 12Z" />
      <path d="M6 12 L2 8 M6 12 L2 16" />
      <circle cx="17" cy="11" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const TOGGLE_COLORS = {
  blue:   { on: 'bg-blue-300   dark:bg-blue-700/60   text-blue-900   dark:text-blue-100',   off: 'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-300' },
  purple: { on: 'bg-purple-300 dark:bg-purple-700/60 text-purple-900 dark:text-purple-100', off: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
  orange: { on: 'bg-orange-300 dark:bg-orange-700/60 text-orange-900 dark:text-orange-100', off: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' },
  teal:   { on: 'bg-teal-300   dark:bg-teal-700/60   text-teal-900   dark:text-teal-100',   off: 'bg-teal-100   dark:bg-teal-900/40   text-teal-700   dark:text-teal-300' },
};

function Toggle({ active, onToggle, color, children }: { active: boolean; onToggle: () => void; color: keyof typeof TOGGLE_COLORS; children: ReactNode }) {
  return (
    <button
      onClick={onToggle}
      className={`w-12 h-12 rounded-md flex items-center justify-center text-xl font-bold select-none transition-colors ${
        active ? TOGGLE_COLORS[color].on : TOGGLE_COLORS[color].off
      }`}
    >
      {children}
    </button>
  );
}
