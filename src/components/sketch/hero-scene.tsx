import { IconGlyph, type IconName } from "./illustrations";

type Item = { n: IconName; x: number; y: number; s: number; r: number; d: number };

const items: Item[] = [
  { n: "dumbbell", x: 40, y: 120, s: 230, r: -10, d: 0 },
  { n: "kettlebell", x: 290, y: 60, s: 160, r: 4, d: 1 },
  { n: "trophy", x: 350, y: 200, s: 170, r: 3, d: 2 },
  { n: "stopwatch", x: 70, y: 270, s: 130, r: -4, d: 3 },
  { n: "flame", x: 215, y: 290, s: 120, r: 4, d: 4 },
  { n: "bolt", x: 430, y: 20, s: 80, r: 8, d: 5 },
  { n: "medal", x: 130, y: 20, s: 100, r: -6, d: 6 },
];

const sparkles = [
  { x: 24, y: 70, s: 34, d: 7 },
  { x: 500, y: 150, s: 28, d: 8 },
  { x: 300, y: 12, s: 22, d: 9 },
  { x: 520, y: 330, s: 36, d: 10 },
];

export function HeroScene() {
  return (
    <svg
      viewBox="0 0 560 460"
      className="sk-hero-scene"
      role="img"
      aria-label="Doodles of gym gear: dumbbell, kettlebell, trophy, stopwatch and medal"
    >
      {/* backdrop blob + hatching */}
      <g className="sk-pop" style={{ "--d": -1 } as React.CSSProperties}>
        <circle cx="285" cy="238" r="196" className="f2 ink" />
        <circle cx="285" cy="238" r="196" fill="url(#sk-hatch)" className="sk-hatch-fill" />
      </g>

      <g filter="url(#sk-rough)">
        {items.map((it) => (
          <g key={it.n} transform={`rotate(${it.r} ${it.x + it.s / 2} ${it.y + it.s / 2})`}>
            <g className="sk-pop" style={{ "--d": it.d } as React.CSSProperties}>
              <svg
                x={it.x}
                y={it.y}
                width={it.s}
                height={it.s}
                viewBox="0 0 120 120"
                overflow="visible"
              >
                <IconGlyph name={it.n} />
              </svg>
            </g>
          </g>
        ))}
        {sparkles.map((s, i) => (
          <g key={i} className="sk-pop sk-twinkle" style={{ "--d": s.d } as React.CSSProperties}>
            <svg x={s.x} y={s.y} width={s.s} height={s.s} viewBox="0 0 120 120">
              <IconGlyph name="sparkle" />
            </svg>
          </g>
        ))}
      </g>

      {/* handwritten notes */}
      <text x="26" y="36" className="sk-note">
        hello, champ!
      </text>
      <path pathLength={1} className="sk-arrow-line sk-draw" d="M150 40c26 4 40 20 46 40" />
      <text x="330" y="448" className="sk-note sk-note-sm">
        check in. lift. repeat.
      </text>
    </svg>
  );
}
