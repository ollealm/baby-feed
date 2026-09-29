'use client';

import { useState, useEffect, useRef } from 'react';
import { useSleep } from '@/lib/sleepContext';
import { roundToNearest, formatTime } from '@/lib/utils';
import { SleepKind } from '@/lib/types';
import { Toggle, TrashIcon } from './FeedingForm';

const TIME_STEP = 5;

export function SleepIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function WakeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export function SleepForm() {
  const { sleepEvents, addSleepEvent, updateSleepEvent, deleteSleepEvent, editingSleepEvent, setEditingSleepEvent } = useSleep();

  const [time, setTime]                   = useState(() => roundToNearest(new Date(), TIME_STEP));
  const [isEstimate, setIsEstimate]       = useState(false);
  const [saving, setSaving]               = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // The next expected event gets the primary button
  const asleep = sleepEvents[0]?.kind === 'sleep';
  const nextKind: SleepKind = asleep ? 'wake' : 'sleep';

  useEffect(() => {
    if (editingSleepEvent) {
      setTime(new Date(editingSleepEvent.time));
      setIsEstimate(editingSleepEvent.is_estimate);
      setConfirmDelete(false);
    }
  }, [editingSleepEvent?.id]);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && !editingSleepEvent) {
        setTime(roundToNearest(new Date(), TIME_STEP));
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [editingSleepEvent]);

  function resetForm() {
    setTime(roundToNearest(new Date(), TIME_STEP));
    setIsEstimate(false);
    setConfirmDelete(false);
  }

  async function handleSave(kind: SleepKind) {
    setSaving(true);
    try {
      await addSleepEvent({ kind, time, is_estimate: isEstimate });
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!editingSleepEvent) return;
    setSaving(true);
    try {
      await updateSleepEvent(editingSleepEvent.id, { kind: editingSleepEvent.kind, time, is_estimate: isEstimate });
      setEditingSleepEvent(null);
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteFromEdit() {
    if (!editingSleepEvent) return;
    if (confirmDelete) {
      await deleteSleepEvent(editingSleepEvent.id);
      setEditingSleepEvent(null);
      resetForm();
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  function handleCancel() {
    setEditingSleepEvent(null);
    resetForm();
  }

  function adjustTime(deltaMinutes: number) {
    setTime(prev => {
      const d = new Date(prev);
      d.setMinutes(d.getMinutes() + deltaMinutes);
      return d;
    });
  }

  // Hold a time button to keep stepping
  const repeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startRepeat(delta: number) {
    adjustTime(delta);
    const tick = (delay: number) => {
      repeatTimer.current = setTimeout(() => {
        adjustTime(delta);
        tick(100);
      }, delay);
    };
    tick(400);
  }

  function stopRepeat() {
    if (repeatTimer.current) {
      clearTimeout(repeatTimer.current);
      repeatTimer.current = null;
    }
  }

  useEffect(() => stopRepeat, []);

  const btnBase = 'w-12 h-12 rounded-md bg-gray-100 dark:bg-dark-border text-2xl font-bold active:bg-gray-200 dark:active:bg-dark-muted/30 select-none';
  const actionBase = 'flex-1 h-12 rounded-md font-semibold text-lg flex items-center justify-center gap-1.5 disabled:opacity-50 select-none transition-colors';
  const primary = 'bg-primary text-white active:bg-primary-hover';
  const secondary = 'bg-gray-100 dark:bg-dark-border active:bg-gray-200 dark:active:bg-dark-muted/30';

  return (
    <div className="bg-surface dark:bg-dark-surface rounded-md p-4 space-y-4">

      {/* Editing banner */}
      {editingSleepEvent && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted dark:text-dark-muted">
            Editing {editingSleepEvent.kind === 'sleep' ? 'fell asleep' : 'woke up'} {formatTime(new Date(editingSleepEvent.time))}
          </span>
          <button onClick={handleCancel} className="text-primary font-medium">Cancel</button>
        </div>
      )}

      {/* Time */}
      <div className="flex items-center justify-center gap-3">
        <button
          onPointerDown={() => startRepeat(-TIME_STEP)}
          onPointerUp={stopRepeat}
          onPointerLeave={stopRepeat}
          className={btnBase}
        >&minus;</button>
        <span className="text-3xl font-bold w-28 text-center">{formatTime(time)}</span>
        <button
          onPointerDown={() => startRepeat(TIME_STEP)}
          onPointerUp={stopRepeat}
          onPointerLeave={stopRepeat}
          className={btnBase}
        >+</button>
      </div>

      {/* Action buttons — same width as the time row */}
      {editingSleepEvent ? (
        <div className="flex items-center gap-3 w-[232px] mx-auto">
          <button
            onClick={handleDeleteFromEdit}
            className={`w-12 h-12 rounded-md flex items-center justify-center select-none transition-colors ${confirmDelete ? 'bg-red-600' : 'bg-red-500'} text-white`}
          >
            {confirmDelete ? '✓' : <TrashIcon />}
          </button>
          <Toggle active={isEstimate} onToggle={() => setIsEstimate(!isEstimate)} color="yellow" label="Estimated time"><span>~</span></Toggle>
          <button onClick={handleUpdate} disabled={saving} className={`${actionBase} ${primary}`}>
            {saving ? 'Saving...' : 'Update'}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 w-[232px] mx-auto">
          <Toggle active={isEstimate} onToggle={() => setIsEstimate(!isEstimate)} color="yellow" label="Estimated time"><span>~</span></Toggle>
          <button
            onClick={() => handleSave('sleep')}
            disabled={saving}
            className={`${actionBase} ${nextKind === 'sleep' ? primary : secondary}`}
          >
            <SleepIcon /> Sleep
          </button>
          <button
            onClick={() => handleSave('wake')}
            disabled={saving}
            className={`${actionBase} ${nextKind === 'wake' ? primary : secondary}`}
          >
            <WakeIcon /> Wake
          </button>
        </div>
      )}
    </div>
  );
}
