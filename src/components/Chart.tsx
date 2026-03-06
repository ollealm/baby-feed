'use client';

interface ChartProps {
  data: { label: string; ml: number; times: number }[];
}

export function Chart({ data }: ChartProps) {
  if (data.length < 2) return null;

  const maxMl = Math.max(...data.map(d => d.ml), 1);
  const maxTimes = Math.max(...data.map(d => d.times), 1);

  const w = 100;
  const h = 50;
  const padL = 0;
  const padR = 0;
  const padT = 4;
  const padB = 8;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  function toX(i: number) {
    return padL + (i / (data.length - 1)) * chartW;
  }

  function mlToY(v: number) {
    return padT + chartH - (v / maxMl) * chartH;
  }

  function timesToY(v: number) {
    return padT + chartH - (v / maxTimes) * chartH;
  }

  function polyline(points: { x: number; y: number }[]) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  }

  const mlPoints = data.map((d, i) => ({ x: toX(i), y: mlToY(d.ml) }));
  const timesPoints = data.map((d, i) => ({ x: toX(i), y: timesToY(d.times) }));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32" preserveAspectRatio="none">
        {/* Grid lines */}
        <line x1={padL} y1={padT} x2={padL + chartW} y2={padT} stroke="currentColor" className="text-border dark:text-dark-border" strokeWidth="0.2" />
        <line x1={padL} y1={padT + chartH / 2} x2={padL + chartW} y2={padT + chartH / 2} stroke="currentColor" className="text-border dark:text-dark-border" strokeWidth="0.2" />
        <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH} stroke="currentColor" className="text-border dark:text-dark-border" strokeWidth="0.2" />

        {/* Amount line (blue) */}
        <path d={polyline(mlPoints)} fill="none" stroke="#2563eb" strokeWidth="0.8" strokeLinejoin="round" />
        {mlPoints.map((p, i) => (
          <circle key={`ml-${i}`} cx={p.x} cy={p.y} r="0.8" fill="#2563eb" />
        ))}

        {/* Times line (orange) */}
        <path d={polyline(timesPoints)} fill="none" stroke="#f59e0b" strokeWidth="0.8" strokeLinejoin="round" />
        {timesPoints.map((p, i) => (
          <circle key={`t-${i}`} cx={p.x} cy={p.y} r="0.8" fill="#f59e0b" />
        ))}
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-[10px] text-muted dark:text-dark-muted mt-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-0.5 bg-[#2563eb] rounded" />
          ml
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-0.5 bg-[#f59e0b] rounded" />
          times
        </span>
      </div>
    </div>
  );
}
