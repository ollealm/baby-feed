'use client';

import { useRef, useState } from 'react';
import { formatTime } from '@/lib/utils';

const HALF_DAY = 12 * 60 * 60 * 1000;

/** Pointer handlers that fire `onLongPress` after holding for `ms`. */
export function useLongPress(onLongPress: () => void, ms = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  return {
    onPointerDown: () => {
      cancel();
      timer.current = setTimeout(onLongPress, ms);
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}

/** The occurrence of hh:mm closest to `base` (so 23:40 typed just after midnight means last night). */
function nearestOccurrence(base: Date, hhmm: string): Date | null {
  const [h, m] = hhmm.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  if (d.getTime() - base.getTime() > HALF_DAY) d.setDate(d.getDate() - 1);
  else if (base.getTime() - d.getTime() > HALF_DAY) d.setDate(d.getDate() + 1);
  return d;
}

export function TimeSetModal({ value, onSet, onClose }: { value: Date; onSet: (d: Date) => void; onClose: () => void }) {
  const [text, setText] = useState(formatTime(value));

  function apply() {
    const d = nearestOccurrence(value, text);
    if (d) onSet(d);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-surface dark:bg-dark-surface rounded-lg p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <input
          type="time"
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') apply(); }}
          className="block w-[232px] h-14 text-center text-3xl font-bold rounded-md border border-border dark:border-dark-border bg-transparent focus:outline-none focus:ring-1 focus:ring-white"
        />
        <button
          onClick={apply}
          className="w-[232px] h-12 rounded-md bg-primary text-white font-semibold text-lg"
        >
          Set
        </button>
      </div>
    </div>
  );
}
