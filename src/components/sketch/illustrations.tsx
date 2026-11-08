import type { CSSProperties } from "react";

// Hand-drawn style doodles on a 120x120 grid. Shapes use shared classes:
//   .ink  = outline (ink in light, gold in dark)   .f1-.f6 = mode-aware fills
//   .hi-a/.hi-b/.hi-c = highlight strokes (neon in dark)

export type IconName =
  | "dumbbell"
  | "kettlebell"
  | "trophy"
  | "stopwatch"
  | "flame"
  | "heart"
  | "bolt"
  | "medal"
  | "bottle"
  | "yogi"
  | "sparkle"
  | "qr";

const glyphs: Record<IconName, React.ReactNode> = {
  dumbbell: (
    <>
      <path className="ink" strokeWidth={6} d="M36 60h48" />
      <rect className="ink f2" x="26" y="34" width="14" height="52" rx="5" />
      <rect className="ink f2" x="80" y="34" width="14" height="52" rx="5" />
      <rect className="ink f1" x="10" y="44" width="14" height="32" rx="5" />
      <rect className="ink f1" x="96" y="44" width="14" height="32" rx="5" />
      <path className="hi-a" d="M33 42v12M87 42v12" />
    </>
  ),
  kettlebell: (
    <>
      <path className="ink" strokeWidth={8} d="M40 54C34 14 86 14 80 54" />
      <path
        className="ink f5"
        d="M60 42c-22 0-36 14-36 32 0 16 12 28 36 28s36-12 36-28c0-18-14-32-36-32Z"
      />
      <path className="hi-b" d="M38 76c0 8 5 14 12 17" />
      <path className="ink" strokeWidth={2.5} d="M50 66h20M52 74h16" />
    </>
  ),
  trophy: (
    <>
      <path className="ink" d="M36 28H20c0 18 8 26 18 28M84 28h16c0 18-8 26-18 28" />
      <path className="ink f2" d="M34 14h52v34c0 18-12 28-26 28S34 66 34 48Z" />
      <path className="ink" d="M60 76v14" strokeWidth={6} />
      <rect className="ink f1" x="38" y="90" width="44" height="14" rx="4" />
      <path className="hi-c" d="M44 24v22" />
      <path
        className="ink f6"
        d="M60 28l4 9 10 1-8 7 3 10-9-6-9 6 3-10-8-7 10-1Z"
        strokeWidth={2.5}
      />
    </>
  ),
  stopwatch: (
    <>
      <path className="ink" strokeWidth={5} d="M60 28V20M48 14h24M90 36l7-7" />
      <circle className="ink f4" cx="60" cy="70" r="38" />
      <path className="ink f2" strokeWidth={2.5} d="M60 70V42a28 28 0 0 1 24 14Z" />
      <path className="ink" strokeWidth={4} d="M60 70l16-14" />
      <circle className="ink f1" cx="60" cy="70" r="5" />
      <path className="hi-a" d="M32 62a30 30 0 0 1 10-18" />
    </>
  ),
  flame: (
    <>
      <path
        className="ink f1"
        d="M60 8c8 24 34 34 34 66 0 22-16 34-34 34S26 96 26 74c0-16 10-22 14-34 6 8 8 12 14 12 0-16 0-28 6-44Z"
      />
      <path
        className="ink f2"
        d="M60 60c5 12 18 17 18 30 0 10-8 16-18 16s-18-6-18-16c0-13 13-18 18-30Z"
        strokeWidth={3}
      />
      <path className="hi-c" d="M38 70c-4 8-2 14 2 20" />
    </>
  ),
  heart: (
    <>
      <path
        className="ink f6"
        d="M60 104C16 76 12 42 34 30c12-6 22-1 26 10 4-11 14-16 26-10 22 12 18 46-26 74Z"
      />
      <path className="ink" strokeWidth={4} d="M14 62h28l8-18 12 38 8-24h32" />
      <path className="hi-a" d="M34 40c-6 2-9 8-8 14" />
    </>
  ),
  bolt: (
    <>
      <path className="ink f2" d="M70 6 24 68h30l-10 46 52-68H68Z" />
      <path className="hi-b" d="M64 24 42 56" />
    </>
  ),
  medal: (
    <>
      <path className="ink f4" d="M34 6h22l8 34H46ZM86 6H64l-8 34h18Z" />
      <circle className="ink f2" cx="60" cy="76" r="32" />
      <circle className="ink" strokeWidth={2.5} strokeDasharray="3 5" cx="60" cy="76" r="23" />
      <path className="ink" strokeWidth={5} d="M54 68l7-5v28" />
      <path className="hi-c" d="M38 66a24 24 0 0 1 8-12" />
    </>
  ),
  bottle: (
    <>
      <rect className="ink f5" x="46" y="6" width="28" height="14" rx="4" />
      <path
        className="ink f4"
        d="M42 22h36v10c8 6 10 12 10 20v46c0 6-4 10-10 10H42c-6 0-10-4-10-10V52c0-8 2-14 10-20Z"
      />
      <rect className="ink f3" x="38" y="56" width="44" height="30" rx="3" strokeWidth={2.5} />
      <path
        className="ink"
        strokeWidth={3}
        d="M60 62c-5 7-7 10-7 14a7 7 0 0 0 14 0c0-4-2-7-7-14Z"
      />
      <path className="hi-a" d="M42 38v14" />
    </>
  ),
  yogi: (
    <>
      <circle className="ink f6" cx="60" cy="60" r="50" strokeWidth={2.5} strokeDasharray="4 6" />
      <circle className="ink f2" cx="60" cy="30" r="9" />
      <path
        className="ink"
        strokeWidth={6}
        d="M60 40v34M60 74v28M60 74l24 12-22 8M60 46C44 44 46 24 60 14c14 10 16 30 0 32"
      />
      <path className="ink" strokeWidth={4} d="M24 106h72" />
    </>
  ),
  sparkle: (
    <>
      <path
        className="ink f2"
        d="M60 6c2 34 20 52 54 54-34 2-52 20-54 54-2-34-20-52-54-54 34-2 52-20 54-54Z"
      />
    </>
  ),
  qr: (
    <>
      <rect className="ink f4" x="14" y="14" width="36" height="36" rx="5" />
      <rect className="ink f4" x="70" y="14" width="36" height="36" rx="5" />
      <rect className="ink f4" x="14" y="70" width="36" height="36" rx="5" />
      <rect className="ink f1" x="25" y="25" width="14" height="14" rx="2" />
      <rect className="ink f1" x="81" y="25" width="14" height="14" rx="2" />
      <rect className="ink f1" x="25" y="81" width="14" height="14" rx="2" />
      <path className="ink" strokeWidth={5} d="M70 74h12M94 74v12M70 94h12M92 100h14M70 84h4" />
    </>
  ),
};

export function IconGlyph({ name }: { name: IconName }) {
  return <>{glyphs[name]}</>;
}

export function Doodle({
  name,
  className = "",
  style,
  title,
}: {
  name: IconName;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`sk-ill ${className}`}
      style={style}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {glyphs[name]}
    </svg>
  );
}

/** Shared filters/patterns. Rendered once per page. */
export function SketchDefs() {
  return (
    <svg width="0" height="0" className="sk-defs" aria-hidden focusable="false">
      <defs>
        <filter id="sk-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02"
            numOctaves="2"
            seed="4"
            result="n"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale="1.1"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <pattern
          id="sk-hatch"
          width="9"
          height="9"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <path d="M0 0v9" stroke="currentColor" strokeWidth="2" />
        </pattern>
        <pattern id="sk-dots" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.6" fill="currentColor" />
        </pattern>
      </defs>
    </svg>
  );
}

export function Scribble({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 16"
      className={`sk-scribble ${className}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path pathLength={1} d="M3 11C30 3 60 14 90 7s70 5 100-2c12-2 22 0 27 3" />
    </svg>
  );
}

export function Circled({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 70"
      className={`sk-circled-svg ${className}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        pathLength={1}
        d="M30 12C70-2 160 0 186 24c10 14-18 38-86 40C40 66 4 52 8 32 12 14 52 6 120 8"
      />
    </svg>
  );
}

export function Arrow({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 100 70"
      className={`sk-arrow ${className}`}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden
    >
      <path pathLength={1} className="sk-arrow-line" d="M6 8C34 2 70 20 82 56" />
      <path pathLength={1} className="sk-arrow-line" d="M66 48l16 10 6-18" />
    </svg>
  );
}
