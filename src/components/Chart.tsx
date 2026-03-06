'use client';

interface ChartProps {
  data: { label: string; ml: number; times: number }[];
  rollingDays?: number;
}

function rollingAvg(values: number[], window: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export function Chart({ data, rollingDays = 3 }: ChartProps) {
  if (data.length < 2) return null;

  const smoothedMl    = rollingAvg(data.map(d => d.ml),    rollingDays);
  const smoothedTimes = rollingAvg(data.map(d => d.times), rollingDays);

  const maxMl    = Math.max(...smoothedMl,    1);
  const maxTimes = Math.max(...smoothedTimes, 1);

  // SVG coordinate space — no padding needed for labels
  const w = 100;
  const h = 50;
  const pad = 1.5;
  const chartW = w - pad * 2;
  const chartH = h - pad * 2;

  function toX(i: number) {
    return pad + (i / (data.length - 1)) * chartW;
  }
  function mlToY(v: number) {
    return pad + chartH - (v / maxMl) * chartH;
  }
  function timesToY(v: number) {
    return pad + chartH - (v / maxTimes) * chartH;
  }
  function path(points: { x: number; y: number }[]) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  }

  const mlPoints    = smoothedMl.map((v, i)    => ({ x: toX(i), y: mlToY(v) }));
  const timesPoints = smoothedTimes.map((v, i) => ({ x: toX(i), y: timesToY(v) }));

  // Only draw from the first index where a full window of data exists
  const validFrom = Math.min(rollingDays - 1, data.length - 1);
  const validMlPoints    = mlPoints.slice(validFrom);
  const validTimesPoints = timesPoints.slice(validFrom);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32" preserveAspectRatio="none">
      {/* Grid lines */}
      {[0, 0.5, 1].map(t => (
        <line
          key={t}
          x1={pad} y1={pad + chartH * (1 - t)}
          x2={pad + chartW} y2={pad + chartH * (1 - t)}
          stroke="#e5e7eb" strokeWidth="0.4"
        />
      ))}

      {/* Times line (orange) — only valid points */}
      <path d={path(validTimesPoints)} fill="none" stroke="#f59e0b" strokeWidth="0.8" strokeLinejoin="round" />
      {validTimesPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="0.8" fill="#f59e0b" />
      ))}

      {/* Amount line (blue) — only valid points */}
      <path d={path(validMlPoints)} fill="none" stroke="#2563eb" strokeWidth="0.8" strokeLinejoin="round" />
      {validMlPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="0.8" fill="#2563eb" />
      ))}
    </svg>
  );
}
