'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/lib/context';
import { useSleep } from '@/lib/sleepContext';
import { analyzeSleep } from '@/lib/sleep';
import { AppShell } from '@/components/AppShell';
import { SleepTimer } from '@/components/SleepTimer';
import { SleepForm } from '@/components/SleepForm';
import { SleepList } from '@/components/SleepList';
import { SleepStats } from '@/components/SleepStats';
import { SleepHistory } from '@/components/SleepHistory';

export default function SleepPage() {
  return (
    <AppShell>
      <SleepView />
    </AppShell>
  );
}

function SleepView() {
  const { family, feedings } = useApp();
  const { sleepEvents, excludedDays } = useSleep();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    function handleVisibility() {
      if (document.visibilityState === 'visible') setNow(new Date());
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const dayBreakHour = family?.day_break_hour ?? 5;
  const feedingTimes = useMemo(() => feedings.map(f => new Date(f.time).getTime()), [feedings]);
  const analysis = useMemo(
    () => analyzeSleep(sleepEvents, excludedDays, dayBreakHour, now, feedingTimes),
    [sleepEvents, excludedDays, dayBreakHour, now, feedingTimes],
  );

  if (!family) return null;

  return (
    <>
      <SleepTimer analysis={analysis} now={now} />
      <SleepForm />
      <SleepList analysis={analysis} now={now} dayBreakHour={dayBreakHour} />
      <SleepStats analysis={analysis} now={now} />
      <SleepHistory analysis={analysis} dayBreakHour={dayBreakHour} rollingDays={family.chart_rolling_days ?? 3} />
    </>
  );
}
