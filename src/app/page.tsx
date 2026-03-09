'use client';

import { useApp } from '@/lib/context';
import { useTheme } from '@/components/ThemeProvider';
import { Onboarding } from '@/components/Onboarding';
import { Timer } from '@/components/Timer';
import { FeedingForm } from '@/components/FeedingForm';
import { FeedingList } from '@/components/FeedingList';
import { Stats } from '@/components/Stats';
import { History } from '@/components/History';
import Link from 'next/link';

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function DataIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function NutritionIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}

function ReloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
    </svg>
  );
}

export default function Home() {
  const { family, loading, configured } = useApp();
  const { theme, toggle } = useTheme();

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <h1 className="text-2xl font-bold">Baby Feed</h1>
        <p className="text-muted dark:text-dark-muted">Set up Supabase to get started.</p>
        <p className="text-sm text-muted dark:text-dark-muted">
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted dark:text-dark-muted">Loading...</p>
      </div>
    );
  }

  if (!family) {
    return <Onboarding />;
  }

  return (
    <div>
      <header className="flex items-center justify-between py-3">
        <button
          onClick={() => window.location.reload()}
          className="p-2 rounded-lg text-muted dark:text-dark-muted hover:text-foreground dark:hover:text-dark-foreground"
          aria-label="Reload"
        >
          <ReloadIcon />
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-muted dark:text-dark-muted hover:text-foreground dark:hover:text-dark-foreground"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
          <Link
            href="/settings"
            className="p-2 rounded-lg text-muted dark:text-dark-muted hover:text-foreground dark:hover:text-dark-foreground"
          >
            <SettingsIcon />
          </Link>
        </div>
      </header>

      <Timer />
      <FeedingForm />
      <FeedingList />
      <Stats />
      <History />

      <div className="mt-6 flex justify-center gap-4">
        <Link
          href="/data"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-muted dark:text-dark-muted hover:text-foreground dark:hover:text-dark-foreground"
        >
          <DataIcon />
          <span>All Data</span>
        </Link>
        <Link
          href="/nutrition"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-muted dark:text-dark-muted hover:text-foreground dark:hover:text-dark-foreground"
        >
          <NutritionIcon />
          <span>Nutrition</span>
        </Link>
      </div>
    </div>
  );
}
