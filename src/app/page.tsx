'use client';

import { AppShell } from '@/components/AppShell';
import { Timer } from '@/components/Timer';
import { FeedingForm } from '@/components/FeedingForm';
import { FeedingList } from '@/components/FeedingList';
import { Stats } from '@/components/Stats';
import { FeedingPatterns } from '@/components/FeedingPatterns';
import { History } from '@/components/History';
import Link from 'next/link';

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

export default function Home() {
  return (
    <AppShell>
      <Timer />
      <FeedingForm />
      <FeedingList />
      <Stats />
      <FeedingPatterns />
      <History />

      <div className="mt-6 flex justify-center gap-4">
        <Link
          href="/data"
          className="flex items-center gap-2 px-4 py-2 rounded text-sm text-muted dark:text-dark-muted hover:text-foreground dark:hover:text-dark-foreground"
        >
          <DataIcon />
          <span>All Data</span>
        </Link>
        <Link
          href="/nutrition"
          className="flex items-center gap-2 px-4 py-2 rounded text-sm text-muted dark:text-dark-muted hover:text-foreground dark:hover:text-dark-foreground"
        >
          <NutritionIcon />
          <span>Nutrition</span>
        </Link>
      </div>
    </AppShell>
  );
}
