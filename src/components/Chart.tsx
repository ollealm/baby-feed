'use client';

export interface ChartDay {
  label: string;
  formulaKcal: number;
  foodKcal: number;
  bottles: number;
  meals: number;
}

interface ChartProps {
  data: ChartDay[];
  rollingDays?: number;
}

function rollingAvg(values: number[], window: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

const W = 360;
const H = 150;
const PAD_LEFT = 6;
const PAD_RIGHT = 6;
const PAD_TOP = 10;
const PAD_BOTTOM = 18;
const PLOT_W = W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = H - PAD_TOP - PAD_BOTTOM;

export function Chart({ data, rollingDays = 3 }: ChartProps) {
  if (data.length < 2) return null;

  const smooth = (pick: (d: ChartDay) => number) => rollingAvg(data.map(pick), rollingDays);
  // Only the fully-windowed portion is shown
  const validFrom = Math.min(rollingDays - 1, data.length - 1);
  const formula = smooth(d => d.formulaKcal).slice(validFrom);
  const food    = smooth(d => d.foodKcal).slice(validFrom);
  const bottles = smooth(d => d.bottles).slice(validFrom);
  const meals   = smooth(d => d.meals).slice(validFrom);
  const validDays = data.slice(validFrom);
  const n = formula.length;

  const total = formula.map((v, i) => v + food[i]);
  const maxKcal = Math.max(...total, 1);
  const maxTimes = Math.max(...bottles, ...meals, 1);

  const toX = (i: number) => n <= 1 ? PAD_LEFT + PLOT_W / 2 : PAD_LEFT + (i / (n - 1)) * PLOT_W;
  const kcalToY = (v: number) => PAD_TOP + PLOT_H - (v / maxKcal) * PLOT_H;
  const timesToY = (v: number) => PAD_TOP + PLOT_H - (v / maxTimes) * PLOT_H;
  const baseY = PAD_TOP + PLOT_H;

  const pt = (x: number, y: number) => `${x.toFixed(2)},${y.toFixed(2)}`;
  const line = (values: number[], toY: (v: number) => number) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'}${pt(toX(i), toY(v))}`).join(' ');

  // Stacked areas: formula from the baseline, food on top of formula
  const formulaArea =
    `M${pt(toX(0), baseY)} ` +
    formula.map((v, i) => `L${pt(toX(i), kcalToY(v))}`).join(' ') +
    ` L${pt(toX(n - 1), baseY)} Z`;
  const foodArea =
    `M${pt(toX(0), kcalToY(formula[0]))} ` +
    total.map((v, i) => `L${pt(toX(i), kcalToY(v))}`).join(' ') + ' ' +
    [...formula.keys()].reverse().map(i => `L${pt(toX(i), kcalToY(formula[i]))}`).join(' ') +
    ' Z';

  // ~5 date ticks along the x axis
  const tickStep = Math.max(1, Math.ceil(n / 5));
  const ticks = validDays
    .map((d, i) => ({ label: d.label, i }))
    .filter(({ i }) => i % tickStep === 0);

  const last = n - 1;
  const legendNum = 'font-semibold text-foreground dark:text-dark-foreground';

  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted dark:text-dark-muted px-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-primary/40 dark:bg-blue-500/40" />
          formula <span className={legendNum}>{Math.round(formula[last])}</span> kcal
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-orange-500/50" />
          food <span className={legendNum}>{Math.round(food[last])}</span> kcal
        </span>
        <span>total <span className={legendNum}>{Math.round(total[last])}</span> kcal</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted dark:text-dark-muted px-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-primary dark:bg-blue-500" />
          bottles <span className={legendNum}>{bottles[last].toFixed(1)}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-orange-500" />
          meals <span className={legendNum}>{meals[last].toFixed(1)}</span>
        </span>
        <span>total <span className={legendNum}>{(bottles[last] + meals[last]).toFixed(1)}</span> times</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto mt-1">
        {/* Grid lines */}
        {[0, 0.5, 1].map(t => (
          <line
            key={t}
            x1={PAD_LEFT} y1={PAD_TOP + PLOT_H * (1 - t)}
            x2={PAD_LEFT + PLOT_W} y2={PAD_TOP + PLOT_H * (1 - t)}
            className="stroke-border dark:stroke-dark-border" strokeWidth="1"
          />
        ))}

        {/* Stacked kcal areas */}
        <path d={formulaArea} className="fill-primary dark:fill-blue-500" opacity="0.25" />
        <path d={foodArea} className="fill-orange-500" opacity="0.35" />

        {/* Date ticks */}
        {ticks.map(({ label, i }, tickIndex) => (
          <text
            key={i}
            x={toX(i)} y={H - 4}
            fontSize="9"
            textAnchor={tickIndex === 0 ? 'start' : 'middle'}
            className="fill-muted dark:fill-dark-muted"
          >
            {label}
          </text>
        ))}

        {/* Times lines (own scale) */}
        <path d={line(bottles, timesToY)} fill="none" className="stroke-primary dark:stroke-blue-500" strokeWidth="1.5" strokeLinejoin="round" />
        <path d={line(meals, timesToY)} fill="none" className="stroke-orange-500" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
