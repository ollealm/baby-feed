'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { Family, Feeding, NewFeeding } from './types';
import { generateCode } from './utils';

const DEFAULT_FORMULA = 'BabySemp 1';

interface FeedingUpdate {
  amount_ml: number;
  time: Date;
  is_estimate: boolean;
  vitamin_d: boolean;
  probiotics: boolean;
}

type SettingsUpdate = Partial<Pick<Family,
  'default_amount_ml' | 'feeding_interval_minutes' | 'feeding_span_minutes' |
  'day_break_hour' | 'current_formula' | 'chart_rolling_days'
>>;

interface AppState {
  family: Family | null;
  feedings: Feeding[];
  loading: boolean;
  error: string | null;
  configured: boolean;
  editingFeeding: Feeding | null;
  setEditingFeeding: (f: Feeding | null) => void;
  createFamily: () => Promise<string>;
  joinFamily: (code: string) => Promise<boolean>;
  addFeeding: (data: NewFeeding) => Promise<void>;
  updateFeeding: (id: string, data: FeedingUpdate) => Promise<void>;
  deleteFeeding: (id: string) => Promise<void>;
  importFeedings: (entries: { amount_ml: number; time: Date }[]) => Promise<void>;
  updateSettings: (settings: SettingsUpdate) => Promise<void>;
  signOut: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

function saveFamilyCode(code: string) {
  localStorage.setItem('familyCode', code);
  document.cookie = `familyCode=${encodeURIComponent(code)}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
}

function clearFamilyCode() {
  localStorage.removeItem('familyCode');
  document.cookie = 'familyCode=; max-age=0; path=/; SameSite=Lax';
}

function getFamilyCode(): string | null {
  // Try localStorage first, fall back to cookie
  const fromStorage = localStorage.getItem('familyCode');
  if (fromStorage) return fromStorage;
  const match = document.cookie.match(/(?:^|; )familyCode=([^;]*)/);
  const fromCookie = match ? decodeURIComponent(match[1]) : null;
  // Restore to localStorage if found in cookie
  if (fromCookie) localStorage.setItem('familyCode', fromCookie);
  return fromCookie;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [family, setFamily] = useState<Family | null>(null);
  const [feedings, setFeedings] = useState<Feeding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingFeeding, setEditingFeeding] = useState<Feeding | null>(null);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) { setLoading(false); return; }

    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('family');
    const codeFromStorage = getFamilyCode();
    const code = codeFromUrl || codeFromStorage;

    if (codeFromUrl) {
      saveFamilyCode(codeFromUrl);
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (code) { loadFamily(code); } else { setLoading(false); }
  }, [configured]);

  async function loadFamily(code: string) {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('families').select('*').eq('code', code).single();

    if (err || !data) {
      clearFamilyCode();
      setError('Family not found');
      setLoading(false);
      return;
    }
    setFamily(data);
    saveFamilyCode(code);
    setLoading(false);
  }

  useEffect(() => {
    if (!family) return;

    async function fetchFeedings() {
      const { data } = await supabase
        .from('feedings').select('*')
        .eq('family_id', family!.id)
        .order('time', { ascending: false });
      if (data) setFeedings(data);
    }
    fetchFeedings();

    // Re-fetch when app returns from background (WebSocket may have been suspended)
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchFeedings();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const channel = supabase
      .channel(`feedings-${family.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedings', filter: `family_id=eq.${family.id}` }, (payload) => {
        setFeedings(prev => {
          const n = payload.new as Feeding;
          if (prev.some(f => f.id === n.id)) return prev;
          return [n, ...prev].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'feedings', filter: `family_id=eq.${family.id}` }, (payload) => {
        setFeedings(prev =>
          prev.map(f => f.id === (payload.new as Feeding).id ? payload.new as Feeding : f)
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        );
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'feedings', filter: `family_id=eq.${family.id}` }, (payload) => {
        setFeedings(prev => prev.filter(f => f.id !== (payload.old as Feeding).id));
      })
      .subscribe();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [family?.id]);

  const createFamily = useCallback(async (): Promise<string> => {
    const code = generateCode();
    const { data, error: err } = await supabase
      .from('families')
      .insert({ code, current_formula: DEFAULT_FORMULA })
      .select().single();
    if (err || !data) throw new Error('Failed to create family');
    setFamily(data);
    saveFamilyCode(code);
    return code;
  }, []);

  const joinFamily = useCallback(async (code: string): Promise<boolean> => {
    const normalized = code.toLowerCase().trim();
    const { data } = await supabase.from('families').select('*').eq('code', normalized).single();
    if (!data) return false;
    setFamily(data);
    saveFamilyCode(normalized);
    return true;
  }, []);

  const addFeeding = useCallback(async (data: NewFeeding) => {
    if (!family) return;
    const { data: inserted } = await supabase
      .from('feedings')
      .insert({
        family_id: family.id,
        amount_ml: data.amount_ml,
        time: data.time.toISOString(),
        is_estimate: data.is_estimate,
        vitamin_d: data.vitamin_d,
        probiotics: data.probiotics,
        formula: family.current_formula || DEFAULT_FORMULA,
      })
      .select().single();
    if (inserted) {
      setFeedings(prev => {
        if (prev.some(f => f.id === inserted.id)) return prev;
        return [inserted, ...prev].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      });
    }
  }, [family]);

  const updateFeeding = useCallback(async (id: string, data: FeedingUpdate) => {
    const { data: updated } = await supabase
      .from('feedings')
      .update({
        amount_ml: data.amount_ml,
        time: data.time.toISOString(),
        is_estimate: data.is_estimate,
        vitamin_d: data.vitamin_d,
        probiotics: data.probiotics,
      })
      .eq('id', id).select().single();
    if (updated) {
      setFeedings(prev =>
        prev.map(f => f.id === id ? updated : f)
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      );
    }
  }, []);

  const deleteFeeding = useCallback(async (id: string) => {
    setFeedings(prev => prev.filter(f => f.id !== id));
    await supabase.from('feedings').delete().eq('id', id);
  }, []);

  const importFeedings = useCallback(async (entries: { amount_ml: number; time: Date }[]) => {
    if (!family) return;
    const rows = entries.map(e => ({
      family_id: family.id,
      amount_ml: e.amount_ml,
      time: e.time.toISOString(),
      is_estimate: false, vitamin_d: false, probiotics: false,
      formula: family.current_formula || DEFAULT_FORMULA,
    }));
    const { data } = await supabase.from('feedings').insert(rows).select();
    if (data) {
      setFeedings(prev =>
        [...data, ...prev].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      );
    }
  }, [family]);

  const updateSettings = useCallback(async (settings: SettingsUpdate) => {
    if (!family) return;
    const { data } = await supabase
      .from('families').update(settings).eq('id', family.id).select().single();
    if (data) setFamily(data);
  }, [family]);

  const signOut = useCallback(() => {
    clearFamilyCode();
    setFamily(null);
    setFeedings([]);
  }, []);

  return (
    <AppContext.Provider value={{
      family, feedings, loading, error, configured,
      editingFeeding, setEditingFeeding,
      createFamily, joinFamily, addFeeding, updateFeeding, deleteFeeding, importFeedings, updateSettings, signOut,
    }}>
      {children}
    </AppContext.Provider>
  );
}
