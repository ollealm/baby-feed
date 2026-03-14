'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useApp } from '@/lib/context';
import { roundToNearest15, formatTime } from '@/lib/utils';

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

export function FeedingForm() {
  const { family, addFeeding, updateFeeding, deleteFeeding, editingFeeding, setEditingFeeding } = useApp();

  const [amount, setAmount]             = useState(family?.default_amount_ml ?? 100);
  const [time, setTime]                 = useState(() => roundToNearest15(new Date()));
  const [isEstimate, setIsEstimate]     = useState(false);
  const [vitaminD, setVitaminD]         = useState(false);
  const [probiotics, setProbiotics]     = useState(false);
  const [omega3, setOmega3]             = useState(false);
  const [saving, setSaving]             = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (editingFeeding) {
      setAmount(editingFeeding.amount_ml === 0 ? (family?.default_amount_ml ?? 100) : editingFeeding.amount_ml);
      setTime(new Date(editingFeeding.time));
      setIsEstimate(editingFeeding.is_estimate);
      setVitaminD(editingFeeding.vitamin_d);
      setProbiotics(editingFeeding.probiotics);
    }
  }, [editingFeeding?.id]);

  useEffect(() => {
    if (!editingFeeding && family?.default_amount_ml) {
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
    setVitaminD(false);
    setProbiotics(false);
    setOmega3(false);
    setConfirmDelete(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await addFeeding({ amount_ml: amount, time, is_estimate: isEstimate, vitamin_d: vitaminD, probiotics });
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleTimePlaceholder() {
    setSaving(true);
    try {
      await addFeeding({ amount_ml: 0, time, is_estimate: isEstimate, vitamin_d: vitaminD, probiotics });
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!editingFeeding) return;
    setSaving(true);
    try {
      await updateFeeding(editingFeeding.id, { amount_ml: amount, time, is_estimate: isEstimate, vitamin_d: vitaminD, probiotics });
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

  const btnBase = 'w-12 h-12 rounded-md bg-gray-100 dark:bg-dark-border text-2xl font-bold active:bg-gray-200 dark:active:bg-dark-muted/30 select-none';
  const squareBtn = 'w-14 py-3 rounded-md flex items-center justify-center select-none transition-colors';

  return (
    <div className="bg-surface dark:bg-dark-surface rounded-md p-4 space-y-4">

      {/* Editing banner */}
      {editingFeeding && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted dark:text-dark-muted">
            Editing {formatTime(new Date(editingFeeding.time))}{editingFeeding.amount_ml > 0 ? ` · ${editingFeeding.amount_ml} ml` : ' · placeholder'}
          </span>
          <button onClick={handleCancel} className="text-primary font-medium">Cancel</button>
        </div>
      )}

      {/* Toggles — same width as +/- rows */}
      <div className="flex items-center justify-between w-[232px] mx-auto">
        <Toggle active={isEstimate} onToggle={() => setIsEstimate(!isEstimate)} color="yellow"><span>~</span></Toggle>
        <Toggle active={vitaminD}   onToggle={() => setVitaminD(!vitaminD)}     color="blue"><span>D</span></Toggle>
        <Toggle active={probiotics} onToggle={() => setProbiotics(!probiotics)} color="purple"><BacteriaIcon /></Toggle>
        <Toggle active={omega3}     onToggle={() => setOmega3(!omega3)}         color="teal"><FishIcon /></Toggle>
      </div>

      {/* Amount */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => adjustAmount(-5)} className={btnBase}>&minus;</button>
        <span className="text-3xl font-bold w-28 text-center">
          {amount} <span className="text-lg">ml</span>
        </span>
        <button onClick={() => adjustAmount(5)} className={btnBase}>+</button>
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
            onClick={handleUpdate}
            disabled={saving}
            className="flex-1 h-12 bg-primary text-white rounded-md font-semibold text-lg active:bg-primary-hover disabled:opacity-50 select-none"
          >
            {saving ? 'Saving...' : 'Update'}
          </button>
          <button
            onClick={handleDeleteFromEdit}
            className={`w-12 h-12 rounded-md flex items-center justify-center select-none transition-colors ${confirmDelete ? 'bg-red-600' : 'bg-red-500'} text-white`}
          >
            {confirmDelete ? '✓' : <TrashIcon />}
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

function BacteriaIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4.5" />
      <line x1="12" y1="2"    x2="12" y2="7.5"  />
      <line x1="12" y1="16.5" x2="12" y2="22"   />
      <line x1="2"  y1="12"   x2="7.5" y2="12"  />
      <line x1="16.5" y1="12" x2="22" y2="12"   />
      <line x1="5.5"  y1="5.5"  x2="8.7" y2="8.7"  />
      <line x1="15.3" y1="15.3" x2="18.5" y2="18.5" />
      <line x1="18.5" y1="5.5"  x2="15.3" y2="8.7"  />
      <line x1="8.7"  y1="15.3" x2="5.5"  y2="18.5" />
    </svg>
  );
}

const TOGGLE_COLORS = {
  blue:   { on: 'bg-blue-200   dark:bg-blue-800/50   text-blue-800   dark:text-blue-200',   off: 'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-300' },
  purple: { on: 'bg-purple-200 dark:bg-purple-800/50 text-purple-800 dark:text-purple-200', off: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
  yellow: { on: 'bg-yellow-200 dark:bg-yellow-800/50 text-yellow-800 dark:text-yellow-200', off: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' },
  teal:   { on: 'bg-teal-200   dark:bg-teal-800/50   text-teal-800   dark:text-teal-200',   off: 'bg-teal-100   dark:bg-teal-900/40   text-teal-700   dark:text-teal-300' },
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
