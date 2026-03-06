'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { Family, Feeding, NewFeeding } from './types';
import { generateCode } from './utils';

interface AppState {
  family: Family | null;
  feedings: Feeding[];
  loading: boolean;
  error: string | null;
  configured: boolean;
  createFamily: () => Promise<string>;
  joinFamily: (code: string) => Promise<boolean>;
  addFeeding: (data: NewFeeding) => Promise<void>;
  deleteFeeding: (id: string) => Promise<void>;
  importFeedings: (entries: { amount_ml: number; time: Date }[]) => Promise<void>;
  updateSettings: (settings: Partial<Pick<Family, 'default_amount_ml' | 'feeding_interval_minutes' | 'day_break_hour' | 'current_formula'>>) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [family, setFamily] = useState<Family | null>(null);
  const [feedings, setFeedings] = useState<Feeding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  // Initialize: check URL and localStorage for family code
  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('family');
    const codeFromStorage = localStorage.getItem('familyCode');
    const code = codeFromUrl || codeFromStorage;

    if (codeFromUrl) {
      localStorage.setItem('familyCode', codeFromUrl);
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (code) {
      loadFamily(code);
    } else {
      setLoading(false);
    }
  }, [configured]);

  async function loadFamily(code: string) {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('families')
      .select('*')
      .eq('code', code)
      .single();

    if (err || !data) {
      localStorage.removeItem('familyCode');
      setError('Family not found');
      setLoading(false);
      return;
    }

    setFamily(data);
    localStorage.setItem('familyCode', code);
    setLoading(false);
  }

  // Fetch feedings + realtime subscription when family loads
  useEffect(() => {
    if (!family) return;

    async function fetchFeedings() {
      const { data } = await supabase
        .from('feedings')
        .select('*')
        .eq('family_id', family!.id)
        .order('time', { ascending: false });

      if (data) setFeedings(data);
    }

    fetchFeedings();

    const channel = supabase
      .channel(`feedings-${family.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'feedings',
        filter: `family_id=eq.${family.id}`
      }, (payload) => {
        setFeedings(prev => {
          const newFeeding = payload.new as Feeding;
          if (prev.some(f => f.id === newFeeding.id)) return prev;
          return [newFeeding, ...prev].sort(
            (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
          );
        });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'feedings',
        filter: `family_id=eq.${family.id}`
      }, (payload) => {
        setFeedings(prev => prev.filter(f => f.id !== (payload.old as Feeding).id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [family?.id]);

  const createFamily = useCallback(async (): Promise<string> => {
    const code = generateCode();
    const { data, error: err } = await supabase
      .from('families')
      .insert({ code })
      .select()
      .single();

    if (err || !data) throw new Error('Failed to create family');

    setFamily(data);
    localStorage.setItem('familyCode', code);
    return code;
  }, []);

  const joinFamily = useCallback(async (code: string): Promise<boolean> => {
    const normalized = code.toLowerCase().trim();
    const { data } = await supabase
      .from('families')
      .select('*')
      .eq('code', normalized)
      .single();

    if (!data) return false;

    setFamily(data);
    localStorage.setItem('familyCode', normalized);
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
        formula: family.current_formula,
      })
      .select()
      .single();

    if (inserted) {
      setFeedings(prev => {
        if (prev.some(f => f.id === inserted.id)) return prev;
        return [inserted, ...prev].sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
        );
      });
    }
  }, [family]);

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
      is_estimate: false,
      vitamin_d: false,
      probiotics: false,
      formula: family.current_formula,
    }));

    const { data } = await supabase.from('feedings').insert(rows).select();
    if (data) {
      setFeedings(prev =>
        [...data, ...prev].sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
        )
      );
    }
  }, [family]);

  const updateSettings = useCallback(async (settings: Partial<Pick<Family, 'default_amount_ml' | 'feeding_interval_minutes' | 'day_break_hour' | 'current_formula'>>) => {
    if (!family) return;

    const { data } = await supabase
      .from('families')
      .update(settings)
      .eq('id', family.id)
      .select()
      .single();

    if (data) setFamily(data);
  }, [family]);

  return (
    <AppContext.Provider value={{
      family, feedings, loading, error, configured,
      createFamily, joinFamily, addFeeding, deleteFeeding, importFeedings, updateSettings,
    }}>
      {children}
    </AppContext.Provider>
  );
}
