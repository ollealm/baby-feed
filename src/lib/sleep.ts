import { SleepEvent } from './types';
import { getDayStart, localDateKey } from './utils';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Awake gaps up to this long keep a night going (night wakings); longer gaps end it. */
const MAX_NIGHT_WAKING = 60 * MIN;
/** The night belonging to a day break is seeded from the sleep that overlaps [break - 8h, break + 4h] the most... */
const NIGHT_SEED_BEFORE = 8 * HOUR;
const NIGHT_SEED_AFTER = 4 * HOUR;
/** ...by at least this much. */
const NIGHT_MIN_SEED = 90 * MIN;
/** Sleeps starting earlier than this before the day break are never part of the night (evening naps). */
const NIGHT_EARLIEST_START = 12 * HOUR;
/** Days back used for "usual" values in the live timer. */
const TYPICAL_DAYS = 7;

export interface SleepSession {
  start: number;
  /** now, for an ongoing sleep */
  end: number;
  ongoing: boolean;
  estimate: boolean;
  night: boolean;
}

/** What each event in the list means once paired up. */
export type SleepEventInfo =
  | { kind: 'nap' | 'night'; ms: number }  // wake event: the sleep it ends
  | { kind: 'awake'; ms: number }          // sleep event: the awake time before it
  | { kind: 'unpaired' }
  | { kind: 'none' };

export interface SleepDay {
  key: string;
  /** Day break that starts this day */
  start: number;
  excluded: boolean;
  /** Morning wake-up: end of the night before */
  wakeUp: number | null;
  /** Start of the night after */
  bedtime: number | null;
  naps: SleepSession[];
  /** null when the day is excluded or untracked */
  napMs: number | null;
  napCount: number | null;
  /** Sleep during the night after, once that night is over */
  nightMs: number | null;
  nightWakings: number | null;
  longestStretch: number | null;
  totalMs: number | null;
  /** Wake-up → nap → … → bedtime gaps; empty when excluded */
  awakeWindows: number[];
}

export interface CurrentSleepState {
  asleep: boolean;
  since: number;
  /** Asleep for the night, or awake during it (night waking) */
  night: boolean;
  /** Start of the current night, when asleep at night */
  nightStart: number | null;
}

export interface SleepAnalysis {
  sessions: SleepSession[];
  /** Newest first; days[0] is today */
  days: SleepDay[];
  eventInfo: Map<string, SleepEventInfo>;
  current: CurrentSleepState | null;
}

function pairSessions(events: SleepEvent[], now: number) {
  const sorted = [...events].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  const sessions: SleepSession[] = [];
  // Wake events keyed to the session they end, so the list can label them
  const sessionOfWake = new Map<string, SleepSession>();
  const eventInfo = new Map<string, SleepEventInfo>();

  let pendingSleep: SleepEvent | null = null;
  let lastWake: SleepEvent | null = null;

  for (const e of sorted) {
    const t = new Date(e.time).getTime();
    if (e.kind === 'sleep') {
      // Two sleeps in a row: the earlier one never got a wake-up
      if (pendingSleep) eventInfo.set(pendingSleep.id, { kind: 'unpaired' });
      eventInfo.set(e.id, lastWake && !pendingSleep
        ? { kind: 'awake', ms: t - new Date(lastWake.time).getTime() }
        : { kind: 'none' });
      pendingSleep = e;
    } else {
      if (pendingSleep) {
        const session: SleepSession = {
          start: new Date(pendingSleep.time).getTime(),
          end: t,
          ongoing: false,
          estimate: pendingSleep.is_estimate || e.is_estimate,
          night: false,
        };
        sessions.push(session);
        sessionOfWake.set(e.id, session);
      } else {
        // Two wakes in a row (the very first event may simply be a wake-up)
        eventInfo.set(e.id, lastWake ? { kind: 'unpaired' } : { kind: 'none' });
      }
      pendingSleep = null;
      lastWake = e;
    }
  }

  if (pendingSleep) {
    sessions.push({
      start: new Date(pendingSleep.time).getTime(),
      end: Math.max(now, new Date(pendingSleep.time).getTime()),
      ongoing: true,
      estimate: pendingSleep.is_estimate,
      night: false,
    });
  }

  return { sessions, sessionOfWake, eventInfo };
}

/** Indices of the sessions making up the night around a day break, or null. */
function findNight(sessions: SleepSession[], dayBreak: number): { first: number; last: number } | null {
  const windowStart = dayBreak - NIGHT_SEED_BEFORE;
  const windowEnd = dayBreak + NIGHT_SEED_AFTER;

  let seed = -1;
  let best = 0;
  sessions.forEach((s, i) => {
    const overlap = Math.min(s.end, windowEnd) - Math.max(s.start, windowStart);
    if (overlap > best) { best = overlap; seed = i; }
  });
  if (seed < 0 || best < NIGHT_MIN_SEED) return null;

  let first = seed;
  let last = seed;
  while (
    first > 0 &&
    sessions[first].start - sessions[first - 1].end <= MAX_NIGHT_WAKING &&
    sessions[first - 1].start >= dayBreak - NIGHT_EARLIEST_START
  ) first--;
  while (
    last < sessions.length - 1 &&
    sessions[last + 1].start - sessions[last].end <= MAX_NIGHT_WAKING &&
    sessions[last + 1].start <= windowEnd
  ) last++;

  return { first, last };
}

const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

// "Usual" values for the live timer use the median, so one badly logged day doesn't skew them
function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function analyzeSleep(
  events: SleepEvent[],
  excludedDays: Set<string>,
  dayBreakHour: number,
  nowDate: Date,
): SleepAnalysis {
  const now = nowDate.getTime();
  const { sessions, sessionOfWake, eventInfo } = pairSessions(events, now);

  const todayStart = getDayStart(nowDate, dayBreakHour);
  if (events.length === 0) {
    return { sessions, days: [], eventInfo, current: null };
  }

  const firstTime = Math.min(...events.map(e => new Date(e.time).getTime()));
  const firstDayStart = getDayStart(new Date(firstTime), dayBreakHour);

  // Day breaks from the first logged day through tomorrow's. Stepped by calendar
  // date (not +24h) so DST changes keep the break on the configured hour.
  const breaks: Date[] = [];
  for (let d = new Date(firstDayStart); d.getTime() <= todayStart.getTime() + DAY; d.setDate(d.getDate() + 1)) {
    breaks.push(new Date(d));
  }

  const nights = breaks.map(b => {
    const range = findNight(sessions, b.getTime());
    if (!range) return null;
    const chain = sessions.slice(range.first, range.last + 1);
    chain.forEach(s => { s.night = true; });
    const lastSession = chain[chain.length - 1];
    return {
      chain,
      start: chain[0].start,
      end: lastSession.end,
      // The baby might still go back to sleep shortly after waking
      complete: !lastSession.ongoing && (now - lastSession.end > MAX_NIGHT_WAKING || lastSession.end >= b.getTime()),
    };
  });

  const days: SleepDay[] = [];
  for (let i = 0; i < breaks.length - 1; i++) {
    const start = breaks[i].getTime();
    const end = breaks[i + 1].getTime();
    const key = localDateKey(breaks[i]);
    const excluded = excludedDays.has(key);
    const before = nights[i];
    const after = nights[i + 1];

    const wakeUp = before && before.complete ? before.end : null;
    const bedtime = after ? after.start : null;
    const naps = sessions.filter(s => !s.night && s.start >= start && s.start < end);
    const tracked = wakeUp !== null || bedtime !== null || naps.length > 0;

    const nightDone = after && after.complete;
    const nightMs = nightDone ? after.chain.reduce((sum, s) => sum + (s.end - s.start), 0) : null;
    const napMs = excluded || !tracked ? null : naps.reduce((sum, s) => sum + (s.end - s.start), 0);

    const awakeWindows: number[] = [];
    if (!excluded && wakeUp !== null) {
      let prevEnd: number | null = wakeUp;
      for (const nap of naps) {
        if (prevEnd !== null) awakeWindows.push(nap.start - prevEnd);
        prevEnd = nap.ongoing ? null : nap.end;
      }
      if (bedtime !== null && prevEnd !== null) awakeWindows.push(bedtime - prevEnd);
    }

    days.push({
      key,
      start,
      excluded,
      wakeUp,
      bedtime,
      naps,
      napMs,
      napCount: napMs === null ? null : naps.length,
      nightMs,
      nightWakings: nightDone ? after.chain.length - 1 : null,
      longestStretch: nightDone ? Math.max(...after.chain.map(s => s.end - s.start)) : null,
      totalMs: napMs !== null && nightMs !== null ? napMs + nightMs : null,
      awakeWindows,
    });
  }
  days.reverse();

  // Label each wake event with the sleep it ended
  for (const [id, session] of sessionOfWake) {
    eventInfo.set(id, { kind: session.night ? 'night' : 'nap', ms: session.end - session.start });
  }
  // Awake time is meaningless on days whose naps weren't logged
  for (const e of events) {
    if (eventInfo.get(e.id)?.kind === 'awake' &&
        excludedDays.has(localDateKey(getDayStart(new Date(e.time), dayBreakHour)))) {
      eventInfo.set(e.id, { kind: 'none' });
    }
  }

  return { sessions, days, eventInfo, current: currentState(sessions, events, days, dayBreakHour) };
}

function currentState(
  sessions: SleepSession[],
  events: SleepEvent[],
  days: SleepDay[],
  dayBreakHour: number,
): CurrentSleepState | null {
  const latest = events.reduce<SleepEvent | null>(
    (a, e) => !a || new Date(e.time).getTime() > new Date(a.time).getTime() ? e : a, null);
  if (!latest) return null;
  const since = new Date(latest.time).getTime();

  if (latest.kind === 'wake') {
    // Woke from a night sleep that isn't the morning wake-up: a night waking
    const ended = sessions.find(s => !s.ongoing && s.end === since);
    const night = !!ended?.night && days[0]?.wakeUp !== since;
    return { asleep: false, since, night, nightStart: null };
  }

  const session = sessions[sessions.length - 1];
  let night = session.night;
  if (!night) {
    // Not yet recognisable as a night (e.g. an hour after bedtime): compare with the usual bedtime
    const offset = since - getDayStart(new Date(since), dayBreakHour).getTime();
    const usualBedtime = typicalBedtimeOffset(days);
    night = offset >= (usualBedtime !== null ? usualBedtime - 90 * MIN : 13 * HOUR);
  }

  // Walk back over short night wakings to find when the night began
  let nightStart: number | null = null;
  if (night) {
    let i = sessions.length - 1;
    while (i > 0 && sessions[i].start - sessions[i - 1].end <= MAX_NIGHT_WAKING) i--;
    nightStart = sessions[i].start;
  }

  return { asleep: true, since, night, nightStart };
}

/** Past days (excluding today), newest first */
function recentDays(days: SleepDay[], n: number): SleepDay[] {
  return days.slice(1, 1 + n);
}

function typicalBedtimeOffset(days: SleepDay[]): number | null {
  return median(recentDays(days, TYPICAL_DAYS).filter(d => d.bedtime !== null).map(d => d.bedtime! - d.start));
}

export function typicalNapMs(days: SleepDay[]): number | null {
  return median(recentDays(days, TYPICAL_DAYS).filter(d => !d.excluded).flatMap(d => d.naps.map(s => s.end - s.start)));
}

/** Usual length of the n-th awake window of the day (0 = after morning wake-up). */
export function typicalAwakeWindow(days: SleepDay[], index: number): number | null {
  const recent = recentDays(days, TYPICAL_DAYS);
  const same = recent.map(d => d.awakeWindows[index]).filter((v): v is number => v !== undefined);
  if (same.length >= 2) return median(same);
  return median(recent.flatMap(d => d.awakeWindows));
}

/** Average of a per-day value over the last n full days, skipping days where it's unknown. */
export function averageOver(days: SleepDay[], n: number, pick: (d: SleepDay) => number | null): number | null {
  return mean(recentDays(days, n).map(pick).filter((v): v is number => v !== null));
}

/** Nap time between the day break and the same time of day, on a given day. */
export function napMsUntil(day: SleepDay, elapsed: number): number {
  const cutoff = day.start + elapsed;
  return day.naps.reduce((sum, s) => sum + Math.max(0, Math.min(s.end, cutoff) - s.start), 0);
}

/** Average nap time up to this time of day over the last n full days. */
export function averageNapMsAtThisTime(days: SleepDay[], n: number, elapsed: number): number | null {
  return mean(recentDays(days, n).filter(d => d.napMs !== null).map(d => napMsUntil(d, elapsed)));
}
