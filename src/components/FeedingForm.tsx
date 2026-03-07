'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { roundToNearest15, formatTime } from '@/lib/utils';

export function FeedingForm() {
  const { family, addFeeding, updateFeeding, deleteFeeding, editingFeeding, setEditingFeeding } = useApp();

  const [amount, setAmount]       = useState(family?.default_amount_ml ?? 100);
  const [time, setTime]           = useState(() => roundToNearest15(new Date()));
  const [isEstimate, setIsEstimate] = useState(false);
  const [vitaminD, setVitaminD]   = useState(false);
  const [probiotics, setProbiotics] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Pre-populate when an editing target is selected
  useEffect(() => {
    if (editingFeeding) {
      setAmount(editingFeeding.amount_ml);
      setTime(new Date(editingFeeding.time));
      setIsEstimate(editingFeeding.is_estimate);
      setVitaminD(editingFeeding.vitamin_d);
      setProbiotics(editingFeeding.probiotics);
    }
  }, [editingFeeding?.id]);

  // Reset when default amount changes (new family load)
  useEffect(() => {
    if (!editingFeeding && family?.default_amount_ml) {
      setAmount(family.default_amount_ml);
    }
  }, [family?.default_amount_ml]);

  function resetForm() {
    setAmount(family?.default_amount_ml ?? 100);
    setTime(roundToNearest15(new Date()));
    setIsEstimate(false);
    setVitaminD(false);
    setProbiotics(false);
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

  const btnBase = 'w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-border text-2xl font-bold active:bg-gray-200 dark:active:bg-dark-muted/30 select-none';

  return (
    <div className="bg-surface dark:bg-dark-surface rounded-xl p-4 space-y-4">

      {/* Editing banner */}
      {editingFeeding && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted dark:text-dark-muted">
            Editing {formatTime(new Date(editingFeeding.time))} · {editingFeeding.amount_ml} ml
          </span>
          <button onClick={handleCancel} className="text-primary font-medium">Cancel</button>
        </div>
      )}

      {/* Toggles */}
      <div className="flex justify-center gap-2">
        <Toggle active={isEstimate} onToggle={() => setIsEstimate(!isEstimate)} label="Estimate" />
        <Toggle active={vitaminD}   onToggle={() => setVitaminD(!vitaminD)}     label="Vitamin D" />
        <Toggle active={probiotics} onToggle={() => setProbiotics(!probiotics)} label="Probiotics" />
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

      {/* Save / Update+Delete */}
      {editingFeeding ? (
        <div className="flex gap-2">
          <button
            onClick={handleDeleteFromEdit}
            className={`w-14 py-3 rounded-xl font-bold text-lg transition-colors select-none ${
              confirmDelete
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 dark:bg-dark-border text-red-400 hover:text-red-500'
            }`}
          >
            {confirmDelete ? '✓' : '✕'}
          </button>
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold text-lg active:bg-primary-hover disabled:opacity-50 select-none"
          >
            {saving ? 'Saving...' : 'Update'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-lg active:bg-primary-hover disabled:opacity-50 select-none"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      )}
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
