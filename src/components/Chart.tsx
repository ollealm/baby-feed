'use client';

interface ChartProps {
  data: { label: string; ml: number; times: number }[];
}

export function Chart({ data }: ChartProps) {
  if (data.length < 2) return null;

  const maxMl = Math.max(...data.map(d => d.ml), 1);
  const maxTimes = Math.max(...data.map(d => d.times), 1);

  // SVG coordinate space
  const w = 100;
  const h = 56;
  const padL = 6;   // space for times labels on left
  const padR = 8;   // space for ml labels on right
  const padT = 3;
  const padB = 6;   // space for x-axis labels
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
  function path(points: { x: number; y: number }[]) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  }

  const mlPoints = data.map((d, i) => ({ x: toX(i), y: mlToY(d.ml) }));
  const timesPoints = data.map((d, i) => ({ x: toX(i), y: timesToY(d.times) }));

  function labelIndices(values: number[]): Set<number> {
    const n = values.length;
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    const maxIdx = values.lastIndexOf(maxVal);
    const minIdx = values.indexOf(minVal);
    const midIdx = Math.floor((n - 1) / 2);
    return new Set([maxIdx, minIdx, midIdx]);
  }

  const mlLabelIdx = labelIndices(data.map(d => d.ml));
  const timesLabelIdx = labelIndices(data.map(d => d.times));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-36" preserveAspectRatio="none">
      {/* Grid lines */}
      {[0, 0.5, 1].map(t => (
        <line
          key={t}
          x1={padL} y1={padT + chartH * (1 - t)}
          x2={padL + chartW} y2={padT + chartH * (1 - t)}
          stroke="#e5e7eb" strokeWidth="0.3"
        />
      ))}

      {/* Times line (orange) */}
      <path d={path(timesPoints)} fill="none" stroke="#f59e0b" strokeWidth="0.7" strokeLinejoin="round" />
      {timesPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="0.7" fill="#f59e0b" />
      ))}

      {/* Amount line (blue) */}
      <path d={path(mlPoints)} fill="none" stroke="#2563eb" strokeWidth="0.7" strokeLinejoin="round" />
      {mlPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="0.7" fill="#2563eb" />
      ))}

      {/* Times labels — left side of selected points */}
      {timesPoints.map((p, i) => timesLabelIdx.has(i) && (
        <text
          key={i}
          x={p.x - 0.8}
          y={p.y - 1.2}
          fontSize="2.2"
          fill="#f59e0b"
          textAnchor="end"
        >
          {data[i].times}
        </text>
      ))}

      {/* ml labels — right side of selected points */}
      {mlPoints.map((p, i) => mlLabelIdx.has(i) && (
        <text
          key={i}
          x={p.x + 0.8}
          y={p.y - 1.2}
          fontSize="2.2"
          fill="#2563eb"
          textAnchor="start"
        >
          {data[i].ml}
        </text>
      ))}

      {/* X-axis date labels — first and last only */}
      <text x={padL} y={h - 0.5} fontSize="2.5" fill="#9ca3af" textAnchor="start">
        {data[0].label}
      </text>
      <text x={padL + chartW} y={h - 0.5} fontSize="2.5" fill="#9ca3af" textAnchor="end">
        {data[data.length - 1].label}
      </text>

      {/* Axis labels */}
      <text x={padL - 0.5} y={padT + 2.5} fontSize="2.2" fill="#f59e0b" textAnchor="end">
        {maxTimes}
      </text>
      <text x={padL - 0.5} y={padT + chartH} fontSize="2.2" fill="#f59e0b" textAnchor="end">
        0
      </text>
      <text x={padL + chartW + 0.5} y={padT + 2.5} fontSize="2.2" fill="#2563eb" textAnchor="start">
        {maxMl}
      </text>
      <text x={padL + chartW + 0.5} y={padT + chartH} fontSize="2.2" fill="#2563eb" textAnchor="start">
        0
      </text>
    </svg>
  );
}
