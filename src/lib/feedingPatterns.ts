import { Feeding } from './types';
import { getDayStart } from './utils';

const DAY_MINUTES = 24 * 60;
export const FEEDING_PATTERN_LOOKBACK_DAYS = 21;
const DEFAULT_HALF_LIFE_DAYS = 7;
const DEFAULT_GRID_MINUTES = 5;
const DEFAULT_KERNEL_SD_MINUTES = 35;
const DEFAULT_PROMINENCE_FRACTION = 0.1;
const DEFAULT_MAX_PATTERNS = 12;

interface PatternPoint {
  minute: number;
  amount_ml: number;
  dayKey: string;
  weight: number;
}

export interface FeedingPattern {
  centerMinute: number;
  rangeStartMinute: number;
  rangeEndMinute: number;
  feedCount: number;
  daysSeen: number;
  loggedDays: number;
  avgAmountMl: number;
  shareOfLoggedDays: number;
  spreadMinutes: number;
}

export interface FeedingPatternAnalysis {
  patterns: FeedingPattern[];
  /** Normalized density (0..1) sampled every gridMinutes, index 0 = midnight. */
  density: number[];
  gridMinutes: number;
  recentFeedCount: number;
  coveredFeedCount: number;
  loggedDays: number;
}

interface AnalyzeOptions {
  now?: Date;
  lookbackDays?: number;
  halfLifeDays?: number;
  gridMinutes?: number;
  kernelSdMinutes?: number;
  prominenceFraction?: number;
  maxPatterns?: number;
}

function normalizeMinute(minute: number): number {
  return ((Math.round(minute) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
}

function minuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function signedMinuteOffset(fromMinute: number, toMinute: number): number {
  const raw = normalizeMinute(toMinute) - normalizeMinute(fromMinute);
  if (raw > DAY_MINUTES / 2) return raw - DAY_MINUTES;
  if (raw < -DAY_MINUTES / 2) return raw + DAY_MINUTES;
  return raw;
}

function recencyWeight(time: Date, now: Date, halfLifeDays: number): number {
  const ageDays = Math.max(0, (now.getTime() - time.getTime()) / (24 * 60 * 60 * 1000));
  return Math.pow(2, -ageDays / halfLifeDays);
}

interface WeightedValue {
  value: number;
  weight: number;
}

function weightedPercentile(values: WeightedValue[], percentileValue: number): number {
  const sorted = [...values].sort((a, b) => a.value - b.value);
  const totalWeight = sorted.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return sorted[0]?.value ?? 0;

  let cumulative = 0;
  const midpoints = sorted.map((item) => {
    const midpoint = cumulative + item.weight / 2;
    cumulative += item.weight;
    return { value: item.value, midpoint };
  });

  const target = percentileValue * totalWeight;
  if (target <= midpoints[0].midpoint) return midpoints[0].value;
  if (target >= midpoints[midpoints.length - 1].midpoint) return midpoints[midpoints.length - 1].value;

  for (let i = 1; i < midpoints.length; i++) {
    if (target <= midpoints[i].midpoint) {
      const span = midpoints[i].midpoint - midpoints[i - 1].midpoint;
      const fraction = span === 0 ? 0 : (target - midpoints[i - 1].midpoint) / span;
      return midpoints[i - 1].value + fraction * (midpoints[i].value - midpoints[i - 1].value);
    }
  }

  return midpoints[midpoints.length - 1].value;
}

function weightedMedian(values: WeightedValue[]): number {
  return weightedPercentile(values, 0.5);
}

function sortFromDayBreak(a: FeedingPattern, b: FeedingPattern, dayBreakHour: number): number {
  const dayBreakMinute = dayBreakHour * 60;
  const aOffset = (a.centerMinute - dayBreakMinute + DAY_MINUTES) % DAY_MINUTES;
  const bOffset = (b.centerMinute - dayBreakMinute + DAY_MINUTES) % DAY_MINUTES;
  return aOffset - bOffset;
}

// Weighted circular KDE with a von Mises kernel evaluated on a fixed grid.
function estimateDensity(points: PatternPoint[], gridMinutes: number, kernelSdMinutes: number): number[] {
  const gridCount = Math.floor(DAY_MINUTES / gridMinutes);
  const sdRadians = (2 * Math.PI * kernelSdMinutes) / DAY_MINUTES;
  const kappa = 1 / (sdRadians * sdRadians);

  return Array.from({ length: gridCount }, (_, gridIndex) => {
    const gridMinute = gridIndex * gridMinutes;

    return points.reduce((density, point) => {
      const angle = (2 * Math.PI * signedMinuteOffset(gridMinute, point.minute)) / DAY_MINUTES;
      return density + point.weight * Math.exp(kappa * (Math.cos(angle) - 1));
    }, 0);
  });
}

function findLocalMaxima(density: number[]): number[] {
  return density
    .map((score, index) => {
      const previous = density[(index - 1 + density.length) % density.length];
      const next = density[(index + 1) % density.length];
      return { index, isPeak: score >= previous && score > next };
    })
    .filter((candidate) => candidate.isPeak)
    .map((candidate) => candidate.index);
}

// Index of the lowest density grid point on the circular arc from one peak to the next.
function valleyIndexBetween(density: number[], fromIndex: number, toIndex: number): number {
  const length = density.length;
  const span = (toIndex - fromIndex + length) % length;
  let bestIndex = (fromIndex + 1) % length;

  for (let step = 1; step < span; step++) {
    const index = (fromIndex + step) % length;
    if (density[index] < density[bestIndex]) bestIndex = index;
  }

  return bestIndex;
}

// Watershed segmentation: keep merging the pair of peaks separated by the
// shallowest valley until every remaining valley is at least prominenceFraction
// of the max density below its lower neighboring peak.
function watershedPeaks(
  density: number[],
  prominenceFraction: number,
  maxPatterns: number
): { peakIndices: number[]; valleyIndices: number[] } {
  let peakIndices = findLocalMaxima(density).sort((a, b) => a - b);
  const maxDensity = Math.max(...density);
  const minDepth = prominenceFraction * maxDensity;

  while (peakIndices.length > 1) {
    const valleyIndices = peakIndices.map((peakIndex, i) =>
      valleyIndexBetween(density, peakIndex, peakIndices[(i + 1) % peakIndices.length])
    );

    let weakestValley = -1;
    let weakestDepth = Infinity;
    valleyIndices.forEach((valleyIndex, i) => {
      const leftPeak = density[peakIndices[i]];
      const rightPeak = density[peakIndices[(i + 1) % peakIndices.length]];
      const depth = Math.min(leftPeak, rightPeak) - density[valleyIndex];
      if (depth < weakestDepth) {
        weakestDepth = depth;
        weakestValley = i;
      }
    });

    if (weakestDepth >= minDepth && peakIndices.length <= maxPatterns) {
      return { peakIndices, valleyIndices };
    }

    // Merge across the weakest valley: drop the lower of the two peaks it separates.
    const leftIndex = weakestValley;
    const rightIndex = (weakestValley + 1) % peakIndices.length;
    const dropIndex =
      density[peakIndices[leftIndex]] <= density[peakIndices[rightIndex]] ? leftIndex : rightIndex;
    peakIndices = peakIndices.filter((_, i) => i !== dropIndex);
  }

  return { peakIndices, valleyIndices: [] };
}

// Every point belongs to the basin (arc between two adjacent valleys) it falls in.
function assignPointsToBasins(
  points: PatternPoint[],
  peakIndices: number[],
  valleyIndices: number[],
  gridMinutes: number
): PatternPoint[][] {
  const assignments = peakIndices.map((): PatternPoint[] => []);

  if (peakIndices.length === 1) {
    return [points.slice()];
  }

  // Basin i spans from valley i-1 to valley i and contains peak i... determine by
  // locating, for each point, the surrounding pair of valleys and the peak between them.
  const valleys = valleyIndices.map((index) => index * gridMinutes).sort((a, b) => a - b);
  const peaks = peakIndices.map((index) => index * gridMinutes);

  for (const point of points) {
    // Find the arc [valleys[j], valleys[j+1]) containing the point (circularly).
    let arcStart = valleys[valleys.length - 1];
    let arcEnd = valleys[0];
    for (let j = 0; j < valleys.length; j++) {
      const start = valleys[j];
      const end = valleys[(j + 1) % valleys.length];
      const span = (end - start + DAY_MINUTES) % DAY_MINUTES;
      const offset = (point.minute - start + DAY_MINUTES) % DAY_MINUTES;
      if (offset < span || span === 0) {
        arcStart = start;
        arcEnd = end;
        break;
      }
    }

    // The basin's peak is the (single) peak inside that arc.
    const arcSpan = (arcEnd - arcStart + DAY_MINUTES) % DAY_MINUTES;
    const peakInArc = peaks.findIndex((peak) => {
      const offset = (peak - arcStart + DAY_MINUTES) % DAY_MINUTES;
      return offset <= arcSpan;
    });
    if (peakInArc >= 0) assignments[peakInArc].push(point);
  }

  return assignments;
}

function emptyAnalysis(gridMinutes: number, recentFeedCount: number, loggedDays: number): FeedingPatternAnalysis {
  return { patterns: [], density: [], gridMinutes, recentFeedCount, coveredFeedCount: 0, loggedDays };
}

export function analyzeFeedingPatterns(
  feedings: Feeding[],
  dayBreakHour: number,
  options: AnalyzeOptions = {}
): FeedingPatternAnalysis {
  const now = options.now ?? new Date();
  const lookbackDays = options.lookbackDays ?? FEEDING_PATTERN_LOOKBACK_DAYS;
  const halfLifeDays = options.halfLifeDays ?? DEFAULT_HALF_LIFE_DAYS;
  const gridMinutes = options.gridMinutes ?? DEFAULT_GRID_MINUTES;
  const kernelSdMinutes = options.kernelSdMinutes ?? DEFAULT_KERNEL_SD_MINUTES;
  const prominenceFraction = options.prominenceFraction ?? DEFAULT_PROMINENCE_FRACTION;
  const maxPatterns = options.maxPatterns ?? DEFAULT_MAX_PATTERNS;
  const rangeStart = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  const recentFeedings = feedings.filter((feeding) => {
    const time = new Date(feeding.time);
    return feeding.amount_ml > 0 && time >= rangeStart && time <= now;
  });

  if (recentFeedings.length < 4) return emptyAnalysis(gridMinutes, recentFeedings.length, 0);

  const points = recentFeedings.map((feeding) => {
    const time = new Date(feeding.time);
    return {
      minute: minuteOfDay(time),
      amount_ml: feeding.amount_ml,
      dayKey: localDayKey(getDayStart(time, dayBreakHour)),
      weight: recencyWeight(time, now, halfLifeDays),
    };
  });

  // Each logged day carries the recency weight of its most recent feeding, so
  // "share of days" reflects how consistent the pattern is lately, not historically.
  const dayWeights = new Map<string, number>();
  for (const point of points) {
    dayWeights.set(point.dayKey, Math.max(dayWeights.get(point.dayKey) ?? 0, point.weight));
  }
  const loggedDays = dayWeights.size;
  if (loggedDays < 2) return emptyAnalysis(gridMinutes, recentFeedings.length, loggedDays);
  const totalDayWeight = Array.from(dayWeights.values()).reduce((sum, weight) => sum + weight, 0);

  const minDaysForPattern = Math.max(3, Math.ceil(loggedDays * 0.15));
  const density = estimateDensity(points, gridMinutes, kernelSdMinutes);
  const maxDensity = Math.max(...density);
  const normalizedDensity = density.map((value) => (maxDensity > 0 ? value / maxDensity : 0));
  const { peakIndices, valleyIndices } = watershedPeaks(density, prominenceFraction, maxPatterns);

  if (peakIndices.length === 0) {
    return { ...emptyAnalysis(gridMinutes, recentFeedings.length, loggedDays), density: normalizedDensity };
  }

  const patterns = assignPointsToBasins(points, peakIndices, valleyIndices, gridMinutes)
    .map((cluster, index): FeedingPattern | null => {
      if (cluster.length === 0) return null;
      const daysSeen = new Set(cluster.map((point) => point.dayKey)).size;
      if (daysSeen < minDaysForPattern) return null;

      const peakMinute = peakIndices[index] * gridMinutes;
      const initialOffsets = cluster.map((point) => ({
        value: signedMinuteOffset(peakMinute, point.minute),
        weight: point.weight,
      }));
      const centerMinute = normalizeMinute(peakMinute + weightedMedian(initialOffsets));

      const offsets = cluster.map((point) => ({
        value: signedMinuteOffset(centerMinute, point.minute),
        weight: point.weight,
      }));
      const rangeStartMinute = centerMinute + weightedPercentile(offsets, 0.25);
      const rangeEndMinute = centerMinute + weightedPercentile(offsets, 0.75);
      const spreadMinutes = rangeEndMinute - rangeStartMinute;

      const clusterWeight = cluster.reduce((sum, point) => sum + point.weight, 0);
      const weightedAmount = cluster.reduce((sum, point) => sum + point.weight * point.amount_ml, 0);
      const seenDayWeight = Array.from(new Set(cluster.map((point) => point.dayKey))).reduce(
        (sum, dayKey) => sum + (dayWeights.get(dayKey) ?? 0),
        0
      );

      return {
        centerMinute,
        rangeStartMinute: normalizeMinute(rangeStartMinute),
        rangeEndMinute: normalizeMinute(rangeEndMinute),
        feedCount: cluster.length,
        daysSeen,
        loggedDays,
        avgAmountMl: Math.round(weightedAmount / clusterWeight),
        shareOfLoggedDays: totalDayWeight > 0 ? seenDayWeight / totalDayWeight : 0,
        spreadMinutes: Math.round(spreadMinutes),
      };
    })
    .filter((pattern): pattern is FeedingPattern => pattern !== null)
    .sort((a, b) => sortFromDayBreak(a, b, dayBreakHour));

  return {
    patterns,
    density: normalizedDensity,
    gridMinutes,
    recentFeedCount: recentFeedings.length,
    coveredFeedCount: patterns.reduce((sum, pattern) => sum + pattern.feedCount, 0),
    loggedDays,
  };
}

export function formatPatternMinute(minute: number): string {
  const date = new Date(2000, 0, 1, 0, normalizeMinute(minute));
  return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}
