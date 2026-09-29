'use client';

import { useSleep } from '@/lib/sleepContext';
import { formatDuration, formatTime, getDayStart, localDateKey } from '@/lib/utils';
import { SleepAnalysis, SleepEventInfo } from '@/lib/sleep';
import { SleepEvent } from '@/lib/types';
import { SleepIcon, WakeIcon } from './SleepForm';

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function infoLabel(info: SleepEventInfo | undefined) {
  if (!info || info.kind === 'none') return null;
  if (info.kind === 'unpaired') {
    return <span className="text-yellow-600 dark:text-yellow-400">unpaired</span>;
  }
  return <span className="text-muted dark:text-dark-muted">{info.kind} {formatDuration(info.ms)}</span>;
}

export function ExcludeToggle({ dayKey }: { dayKey: string }) {
  const { excludedDays, setDayExcluded } = useSleep();
  const excluded = excludedDays.has(dayKey);
  return (
    <button
      onClick={() => setDayExcluded(dayKey, !excluded)}
      className={`text-[11px] font-medium px-1.5 rounded select-none transition-colors normal-case tracking-normal ${
        excluded
          ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
          : 'bg-gray-100 dark:bg-dark-border text-muted dark:text-dark-muted'
      }`}
    >
      {excluded ? 'Naps not tracked' : 'Exclude naps'}
    </button>
  );
}

function DaySection({
  label, dayKey, events, napMs, info,
}: {
  label: string;
  dayKey: string;
  events: SleepEvent[];
  napMs: number | null;
  info: Map<string, SleepEventInfo>;
}) {
  const { editingSleepEvent, setEditingSleepEvent, excludedDays } = useSleep();
  const excluded = excludedDays.has(dayKey);

  return (
    <div className="mt-6">
      <div className="flex justify-between items-baseline">
        <h3 className="flex items-baseline gap-2 text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide">
          {label}
          <ExcludeToggle dayKey={dayKey} />
        </h3>
        {napMs !== null && napMs > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-muted dark:text-dark-muted text-right">{formatDuration(napMs)} naps</span>
            <div className="w-6" />
          </div>
        )}
      </div>
      {excluded && (
        <p className="text-xs text-muted dark:text-dark-muted mt-0.5">
          Only wake-up and bedtime count in statistics
        </p>
      )}

      {events.length === 0 ? (
        <p className="text-sm text-muted dark:text-dark-muted mt-1">No sleep logged</p>
      ) : (
        <div className="mt-1">
          {events.map(e => {
            const isEditing = editingSleepEvent?.id === e.id;
            return (
              <div
                key={e.id}
                className={`flex items-center justify-between py-px -mx-2 px-2 rounded transition-colors ${isEditing ? 'bg-primary/10 dark:bg-primary/20' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm w-11">{formatTime(new Date(e.time))}</span>
                  <span className="flex items-center gap-1 text-sm">
                    {e.kind === 'sleep' ? <SleepIcon size={13} /> : <WakeIcon size={13} />}
                    {e.kind === 'sleep' ? 'Asleep' : 'Awake'}
                  </span>
                  {e.is_estimate && <span className="text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-1 rounded">~</span>}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-right">{infoLabel(info.get(e.id))}</span>
                  <span
                    onClick={() => setEditingSleepEvent(isEditing ? null : e)}
                    className={`w-6 flex items-center justify-center leading-none cursor-pointer ${
                      isEditing ? 'text-primary' : 'text-gray-300 dark:text-dark-border'
                    }`}
                  >
                    <PencilIcon />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SleepList({ analysis, now, dayBreakHour }: { analysis: SleepAnalysis; now: Date; dayBreakHour: number }) {
  const { sleepEvents } = useSleep();

  const todayStart     = getDayStart(now, dayBreakHour);
  const yesterdayStart = getDayStart(new Date(todayStart.getTime() - 1), dayBreakHour);

  const todayEvents     = sleepEvents.filter(e => new Date(e.time) >= todayStart);
  const yesterdayEvents = sleepEvents.filter(e => {
    const t = new Date(e.time);
    return t >= yesterdayStart && t < todayStart;
  });

  const todayKey = localDateKey(todayStart);
  const yesterdayKey = localDateKey(yesterdayStart);
  const napMsOf = (key: string) => analysis.days.find(d => d.key === key)?.napMs ?? null;

  return (
    <>
      <DaySection label="Today"     dayKey={todayKey}     events={todayEvents}     napMs={napMsOf(todayKey)}     info={analysis.eventInfo} />
      <DaySection label="Yesterday" dayKey={yesterdayKey} events={yesterdayEvents} napMs={napMsOf(yesterdayKey)} info={analysis.eventInfo} />
    </>
  );
}
