'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { useApp } from './context';
import { NewSleepEvent, SleepEvent } from './types';

interface SleepState {
  /** Newest first */
  sleepEvents: SleepEvent[];
  /** Day keys (YYYY-MM-DD of the day start) whose naps weren't tracked */
  excludedDays: Set<string>;
  editingSleepEvent: SleepEvent | null;
  setEditingSleepEvent: (e: SleepEvent | null) => void;
  addSleepEvent: (data: NewSleepEvent) => Promise<void>;
  updateSleepEvent: (id: string, data: NewSleepEvent) => Promise<void>;
  deleteSleepEvent: (id: string) => Promise<void>;
  setDayExcluded: (day: string, excluded: boolean) => Promise<void>;
}

const SleepContext = createContext<SleepState | null>(null);

export function useSleep(): SleepState {
  const ctx = useContext(SleepContext);
  if (!ctx) throw new Error('useSleep must be used within SleepProvider');
  return ctx;
}

const byTimeDesc = (a: SleepEvent, b: SleepEvent) => new Date(b.time).getTime() - new Date(a.time).getTime();

export function SleepProvider({ children }: { children: React.ReactNode }) {
  const { family } = useApp();
  const [sleepEvents, setSleepEvents] = useState<SleepEvent[]>([]);
  const [excludedDays, setExcludedDays] = useState<Set<string>>(new Set());
  const [editingSleepEvent, setEditingSleepEvent] = useState<SleepEvent | null>(null);

  useEffect(() => {
    if (!family) {
      setSleepEvents([]);
      setExcludedDays(new Set());
      return;
    }

    // Supabase caps a single request at 1000 rows, so page through until a short page.
    async function fetchSleep() {
      const PAGE = 1000;
      const all: SleepEvent[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('sleep_events').select('*')
          .eq('family_id', family!.id)
          .order('time', { ascending: false })
          .range(from, from + PAGE - 1);
        if (error || !data) return;
        all.push(...data);
        if (data.length < PAGE) break;
      }
      setSleepEvents(all);

      const { data: days } = await supabase
        .from('sleep_excluded_days').select('day')
        .eq('family_id', family!.id);
      if (days) setExcludedDays(new Set(days.map(d => d.day as string)));
    }
    fetchSleep();

    // Re-fetch when app returns from background (WebSocket may have been suspended)
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchSleep();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const filter = `family_id=eq.${family.id}`;
    const channel = supabase
      .channel(`sleep-${family.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sleep_events', filter }, (payload) => {
        setSleepEvents(prev => {
          const n = payload.new as SleepEvent;
          if (prev.some(e => e.id === n.id)) return prev;
          return [n, ...prev].sort(byTimeDesc);
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sleep_events', filter }, (payload) => {
        setSleepEvents(prev =>
          prev.map(e => e.id === (payload.new as SleepEvent).id ? payload.new as SleepEvent : e).sort(byTimeDesc)
        );
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'sleep_events', filter }, (payload) => {
        setSleepEvents(prev => prev.filter(e => e.id !== (payload.old as SleepEvent).id));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sleep_excluded_days', filter }, (payload) => {
        setExcludedDays(prev => new Set(prev).add((payload.new as { day: string }).day));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'sleep_excluded_days', filter }, (payload) => {
        setExcludedDays(prev => {
          const next = new Set(prev);
          next.delete((payload.old as { day: string }).day);
          return next;
        });
      })
      .subscribe();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [family?.id]);

  const addSleepEvent = useCallback(async (data: NewSleepEvent) => {
    if (!family) return;
    const { data: inserted } = await supabase
      .from('sleep_events')
      .insert({
        family_id: family.id,
        kind: data.kind,
        time: data.time.toISOString(),
        is_estimate: data.is_estimate,
      })
      .select().single();
    if (inserted) {
      setSleepEvents(prev => {
        if (prev.some(e => e.id === inserted.id)) return prev;
        return [inserted, ...prev].sort(byTimeDesc);
      });
    }
  }, [family]);

  const updateSleepEvent = useCallback(async (id: string, data: NewSleepEvent) => {
    const { data: updated } = await supabase
      .from('sleep_events')
      .update({
        kind: data.kind,
        time: data.time.toISOString(),
        is_estimate: data.is_estimate,
      })
      .eq('id', id).select().single();
    if (updated) {
      setSleepEvents(prev => prev.map(e => e.id === id ? updated : e).sort(byTimeDesc));
    }
  }, []);

  const deleteSleepEvent = useCallback(async (id: string) => {
    setSleepEvents(prev => prev.filter(e => e.id !== id));
    await supabase.from('sleep_events').delete().eq('id', id);
  }, []);

  const setDayExcluded = useCallback(async (day: string, excluded: boolean) => {
    if (!family) return;
    // Optimistic: the toggle should respond immediately
    setExcludedDays(prev => {
      const next = new Set(prev);
      if (excluded) next.add(day); else next.delete(day);
      return next;
    });
    if (excluded) {
      await supabase.from('sleep_excluded_days').upsert({ family_id: family.id, day });
    } else {
      await supabase.from('sleep_excluded_days').delete().eq('family_id', family.id).eq('day', day);
    }
  }, [family]);

  return (
    <SleepContext.Provider value={{
      sleepEvents, excludedDays,
      editingSleepEvent, setEditingSleepEvent,
      addSleepEvent, updateSleepEvent, deleteSleepEvent, setDayExcluded,
    }}>
      {children}
    </SleepContext.Provider>
  );
}
