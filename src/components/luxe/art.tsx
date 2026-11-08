import { weekly } from "@/components/design/demo-data";

/** Shared gradients. Rendered once per page; referenced as url(#lx-gold) etc. */
export function LuxeDefs() {
  return (
    <svg width="0" height="0" className="lx-defs" aria-hidden focusable="false">
      <defs>
        <linearGradient id="lx-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--stroke-a)" />
          <stop offset="0.5" stopColor="var(--lx-gold-b)" />
          <stop offset="1" stopColor="var(--lx-accent)" />
        </linearGradient>
        <linearGradient id="lx-fire" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--lx-gold-b)" />
          <stop offset="1" stopColor="var(--lx-accent)" />
        </linearGradient>
        <linearGradient id="lx-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--lx-accent)" stopOpacity="0.38" />
          <stop offset="1" stopColor="var(--lx-accent)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lx-plate" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--lx-gold-a)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--lx-accent)" stopOpacity="0.06" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const ticks = Array.from({ length: 72 }, (_, i) => {
  const a = (i / 72) * Math.PI * 2;
  const long = i % 6 === 0;
  const r1 = 232;
  const r2 = long ? 244 : 238;
  return {
    x1: 310 + Math.cos(a) * r1,
    y1: 270 + Math.sin(a) * r1,
    x2: 310 + Math.cos(a) * r2,
    y2: 270 + Math.sin(a) * r2,
    long,
  };
});

/** Fine technical line drawing: construction circles, gear, dimension lines. */
export function HeroArt() {
  return (
    <svg
      viewBox="0 0 620 540"
      className="lx-hero-art"
      role="img"
      aria-label="Line drawing of a dumbbell, kettlebell and trophy on a technical grid"
    >
      <g className="lx-orbit">
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            className={t.long ? "lx-tick-long" : "lx-tick"}
          />
        ))}
      </g>
      <circle cx="310" cy="270" r="92" className="lx-guide" />
      <circle cx="310" cy="270" r="152" className="lx-guide lx-dash" />
      <circle cx="310" cy="270" r="212" className="lx-guide" />
      <path d="M310 30V510M70 270H550" className="lx-guide lx-dash" />

      {/* dumbbell */}
      <g transform="rotate(-24 310 270)" className="lx-draw-group">
        <path d="M262 270h96" className="lx-stroke lx-bold lx-solid" />
        <rect x="236" y="222" width="26" height="96" rx="9" className="lx-stroke lx-plate" />
        <rect x="206" y="238" width="22" height="64" rx="8" className="lx-stroke lx-plate" />
        <rect x="358" y="222" width="26" height="96" rx="9" className="lx-stroke lx-plate" />
        <rect x="392" y="238" width="22" height="64" rx="8" className="lx-stroke lx-plate" />
        <path d="M244 236v22M366 236v22" className="lx-shine" />
      </g>

      {/* kettlebell */}
      <g className="lx-draw-group">
        <path d="M92 360C80 292 180 292 168 360" className="lx-stroke lx-bold" />
        <circle cx="130" cy="402" r="48" className="lx-stroke lx-plate" />
        <path d="M104 392h52M108 408h44" className="lx-stroke lx-thin" />
        <path d="M98 420a36 36 0 0 0 14 18" className="lx-shine" />
      </g>

      {/* trophy */}
      <g className="lx-draw-group">
        <path d="M452 112h64v40c0 24-14 40-32 40s-32-16-32-40Z" className="lx-stroke lx-plate" />
        <path
          d="M452 124h-18c0 20 8 30 22 34M516 124h18c0 20-8 30-22 34"
          className="lx-stroke lx-thin"
        />
        <path d="M484 192v26M462 232h44" className="lx-stroke lx-bold" />
        <path
          d="M484 128l5 11 12 1-9 8 3 12-11-7-11 7 3-12-9-8 12-1Z"
          className="lx-stroke lx-thin"
        />
        <path d="M462 126v30" className="lx-shine" />
      </g>

      {/* dimension line + callout */}
      <g className="lx-dim">
        <path d="M206 468h208M206 460v16M414 460v16" />
        <text x="310" y="490" textAnchor="middle">
          20 kg · Olympic bar
        </text>
      </g>
      <g className="lx-callout">
        <path d="M440 330l36-30h70" />
        <circle cx="440" cy="330" r="4" />
        <rect x="486" y="282" width="92" height="34" rx="17" />
        <text x="532" y="304" textAnchor="middle">
          PR 142.5 kg
        </text>
      </g>

      {/* sparkles */}
      {[
        [78, 120, 14],
        [560, 420, 12],
        [300, 56, 10],
      ].map(([x, y, s]) => (
        <path
          key={`${x}-${y}`}
          transform={`translate(${x} ${y})`}
          d={`M0 ${-s}C1 -2 2 -1 ${s} 0 2 1 1 2 0 ${s} -1 2 -2 1 ${-s} 0 -2 -1 -1 -2 0 ${-s}Z`}
          className="lx-sparkle"
        />
      ))}
    </svg>
  );
}

/** Catmull-Rom to cubic Bezier smoothing. */
function smooth(pts: readonly (readonly [number, number])[]) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AreaChart() {
  const w = 640;
  const h = 230;
  const px = 36;
  const top = 26;
  const bottom = 34;
  const max = 80;
  const pts = weekly.map(
    (v, i) =>
      [
        px + (i / (weekly.length - 1)) * (w - px * 2),
        top + (1 - v / max) * (h - top - bottom),
      ] as const
  );
  const line = smooth(pts);
  const peak = pts[5];
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="lx-area-chart"
      role="img"
      aria-label="Weekly check-ins, peaking Saturday at 72"
    >
      {[0, 1, 2, 3].map((g) => {
        const y = top + (g / 3) * (h - top - bottom);
        return <path key={g} d={`M${px} ${y}H${w - px}`} className="lx-gridline" />;
      })}
      <path
        d={`${line} L${pts[6][0]} ${h - bottom} L${pts[0][0]} ${h - bottom}Z`}
        fill="url(#lx-area)"
        className="lx-area-fill"
      />
      <path d={line} pathLength={1} className="lx-area-line" />
      {pts.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i === 5 ? 6 : 3.5}
          className={i === 5 ? "lx-dot-peak" : "lx-dot"}
        />
      ))}
      <path d={`M${peak[0]} ${peak[1] + 8}V${h - bottom}`} className="lx-peak-line" />
      <g className="lx-peak-tag" transform={`translate(${peak[0]} ${peak[1] - 20})`}>
        <rect x="-30" y="-16" width="60" height="26" rx="13" />
        <text textAnchor="middle" y="2">
          72 today
        </text>
      </g>
      {days.map((d, i) => (
        <text key={d} x={pts[i][0]} y={h - 10} textAnchor="middle" className="lx-axis">
          {d}
        </text>
      ))}
    </svg>
  );
}

export function Gauge({ value, max }: { value: number; max: number }) {
  const cx = 120;
  const cy = 120;
  const r = 96;
  const arc = `M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const pct = (value / max) * 100;
  const marks = Array.from({ length: 21 }, (_, i) => {
    const a = Math.PI + (i / 20) * Math.PI;
    const r1 = r + 12;
    const r2 = r + (i % 5 === 0 ? 20 : 16);
    return {
      x1: cx + Math.cos(a) * r1,
      y1: cy + Math.sin(a) * r1,
      x2: cx + Math.cos(a) * r2,
      y2: cy + Math.sin(a) * r2,
    };
  });
  return (
    <svg
      viewBox="0 0 240 140"
      className="lx-gauge"
      role="img"
      aria-label={`${value} of ${max} spots in use`}
    >
      {marks.map((m, i) => (
        <line key={i} {...m} className="lx-tick" />
      ))}
      <path d={arc} pathLength={100} className="lx-gauge-bg" />
      <path
        d={arc}
        pathLength={100}
        className="lx-gauge-fg"
        style={{ "--p": pct } as React.CSSProperties}
      />
    </svg>
  );
}

export function MiniSpark({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map(
    (v, i) => [(i / (data.length - 1)) * 100, 22 - ((v - min) / (max - min || 1)) * 18] as const
  );
  return (
    <svg viewBox="0 0 100 26" className="lx-spark" preserveAspectRatio="none" aria-hidden>
      <path d={smooth(pts)} pathLength={1} />
    </svg>
  );
}

/** Decorative pseudo-QR (not scannable). */
export function LuxeQr() {
  const n = 17;
  const cells: React.ReactNode[] = [];
  const eye = (x: number, y: number) => x < 6 && y < 6;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const inEye = eye(x, y) || eye(n - 1 - x, y) || eye(x, n - 1 - y);
      if (inEye) continue;
      if ((x * 5 + y * 11 + x * y) % 4 < 2)
        cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
    }
  }
  const finder = (x: number, y: number) => (
    <g key={`f${x}${y}`}>
      <rect x={x} y={y} width="6" height="6" />
      <rect x={x + 1} y={y + 1} width="4" height="4" fill="#0b0705" />
      <rect x={x + 2} y={y + 2} width="2" height="2" />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className="lx-qr" fill="currentColor" aria-hidden>
      {cells}
      {finder(0, 0)}
      {finder(n - 6, 0)}
      {finder(0, n - 6)}
    </svg>
  );
}
