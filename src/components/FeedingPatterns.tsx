'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/lib/context';
import {
  FeedingPattern,
  FeedingPatternAnalysis,
  analyzeFeedingPatterns,
  formatPatternMinute,
} from '@/lib/feedingPatterns';

const DAY_MINUTES = 24 * 60;
const STRIP_HEIGHT = 64;

function frequencyLabel(share: number): string {
  if (share >= 0.67) return 'Strong';
  if (share >= 0.4) return 'Regular';
  return 'Light';
}

function rangeLabel(pattern: FeedingPattern): string {
  return `${formatPatternMinute(pattern.rangeStartMinute)}-${formatPatternMinute(pattern.rangeEndMinute)}`;
}

// Fraction of the strip width for a minute-of-day, with the strip starting at day break.
function stripPosition(minute: number, dayBreakHour: number): number {
  return ((minute - dayBreakHour * 60 + DAY_MINUTES) % DAY_MINUTES) / DAY_MINUTES;
}

function DensityStrip({
  analysis,
  dayBreakHour,
  nowMinute,
}: {
  analysis: FeedingPatternAnalysis;
  dayBreakHour: number;
  nowMinute: number;
}) {
  const { density, amountDensity, gridMinutes, patterns } = analysis;
  if (density.length === 0) return null;

  const width = density.length;
  // Reorder a curve so x=0 is the day break hour, and close the wrap-around gap.
  const startIndex = Math.round((dayBreakHour * 60) / gridMinutes) % density.length;
  const rotate = (values: number[]) =>
    Array.from({ length: values.length + 1 }, (_, i) => values[(startIndex + i) % values.length]);
  const curve = (values: number[]) =>
    rotate(values)
      .map((value, i) => `${i === 0 ? 'M' : 'L'} ${(i / values.length) * width} ${STRIP_HEIGHT * (1 - value * 0.92)}`)
      .join(' ');
  const areaPath = `M 0 ${STRIP_HEIGHT} ${curve(density).replace('M', 'L')} L ${width} ${STRIP_HEIGHT} Z`;
  const amountPath = amountDensity.length === density.length ? curve(amountDensity) : null;

  const hourLabels = [0, 3, 6, 9, 12, 15, 18, 21].map((offset) => ({
    offset,
    label: String((dayBreakHour + offset) % 24).padStart(2, '0'),
  }));

  return (
    <div className="px-2 pt-2">
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${STRIP_HEIGHT}`}
          preserveAspectRatio="none"
          className="w-full block text-muted dark:text-dark-muted"
          style={{ height: STRIP_HEIGHT }}
          aria-hidden="true"
        >
          <path d={areaPath} fill="currentColor" opacity="0.25" />
          {amountPath && (
            <path
              d={amountPath}
              fill="none"
              className="stroke-primary dark:stroke-blue-500"
              strokeWidth="1.5"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              opacity="0.8"
            />
          )}
        </svg>
        {patterns.map((pattern) => (
          <div
            key={pattern.centerMinute}
            className="absolute top-0 bottom-0 w-px bg-primary"
            style={{ left: `${stripPosition(pattern.centerMinute, dayBreakHour) * 100}%` }}
          />
        ))}
        <div
          className="absolute top-0 bottom-0 w-px bg-amber-500"
          style={{ left: `${stripPosition(nowMinute, dayBreakHour) * 100}%` }}
        />
      </div>
      <div className="relative h-4 text-[10px] text-muted dark:text-dark-muted">
        {hourLabels.map(({ offset, label }) => (
          <span key={offset} className="absolute" style={{ left: `${(offset / 24) * 100}%` }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function FeedingPatterns() {
  const { feedings, family } = useApp();
  const [analysisNow, setAnalysisNow] = useState(() => new Date());

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') setAnalysisNow(new Date());
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  if (!family || feedings.length === 0) return null;

  const analysis = analyzeFeedingPatterns(feedings, family.day_break_hour, { now: analysisNow });
  if (analysis.recentFeedCount < 4) return null;

  const { patterns, recentFeedCount, coveredFeedCount } = analysis;
  const coveragePct = Math.round((coveredFeedCount / recentFeedCount) * 100);

  return (
    <div className="mt-8">
      <h3 className="text-xs font-semibold text-muted dark:text-dark-muted uppercase tracking-wide">
        Patterns
        <span className="ml-1 font-normal normal-case">(last 3 weeks, recent days weigh more)</span>
      </h3>

      <div className="mt-2 bg-surface dark:bg-dark-surface rounded-md overflow-hidden">
        <DensityStrip
          analysis={analysis}
          dayBreakHour={family.day_break_hour}
          nowMinute={analysisNow.getHours() * 60 + analysisNow.getMinutes()}
        />
        {patterns.length === 0 ? (
          <p className="text-sm text-muted dark:text-dark-muted py-2 px-2">
            No repeated time points yet
          </p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted dark:text-dark-muted">
                  <th className="text-left font-normal py-1.5 px-2">Time</th>
                  <th className="text-left font-normal py-1.5 px-2">Range</th>
                  <th className="text-right font-normal py-1.5 px-2">Days</th>
                  <th className="text-right font-normal py-1.5 px-2">Avg</th>
                  <th className="text-right font-normal py-1.5 px-2">Signal</th>
                </tr>
              </thead>
              <tbody>
                {patterns.map((pattern) => (
                  <tr
                    key={`${pattern.centerMinute}-${pattern.feedCount}`}
                    className="border-t border-border dark:border-dark-border"
                  >
                    <td className="py-1.5 px-2 font-semibold">
                      {formatPatternMinute(pattern.centerMinute)}
                    </td>
                    <td className="py-1.5 px-2 text-muted dark:text-dark-muted">
                      {rangeLabel(pattern)}
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      {pattern.daysSeen}/{pattern.loggedDays}
                    </td>
                    <td className="py-1.5 px-2 text-right font-semibold">
                      {pattern.avgAmountMl} ml
                    </td>
                    <td className="py-1.5 px-2 text-right text-muted dark:text-dark-muted">
                      {frequencyLabel(pattern.shareOfLoggedDays)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-border dark:border-dark-border py-1.5 px-2 text-xs text-muted dark:text-dark-muted">
              Patterns cover {coveredFeedCount} of {recentFeedCount} feeds ({coveragePct}%)
            </p>
          </>
        )}
      </div>
    </div>
  );
}
