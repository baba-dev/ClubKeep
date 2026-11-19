"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  MUSCLE_GROUPS,
  activitiesForMuscle,
  type MuscleId,
  type MuscleSide,
} from "@/lib/personal/muscle-map";
import { bandInfo, loadBand, type Band, type ColorMode } from "@/lib/personal/load-bands";
import { RECENCY_BANDS, VOLUME_BANDS } from "@/lib/personal/load-bands";
import {
  BACK_LANDMARKS,
  BACK_LINES,
  BACK_REGIONS,
  BODY_VIEWBOX,
  DECOR_CENTER,
  DECOR_LEFT_BACK,
  DECOR_LEFT_FRONT,
  FRONT_LANDMARKS,
  FRONT_LINES,
  FRONT_REGIONS,
} from "./body-paths";
import "./body-map.css";

/** Primary activities come first, so the cap keeps the most relevant ones. */
const MAX_ACTIVITIES_SHOWN = 5;
const MIRROR = "translate(200 0) scale(-1 1)";
const SWIPE_PX = 48;
const TURN_OUT_MS = 170;
const TURN_IN_MS = 220;
const SIDES: { side: MuscleSide; label: string }[] = [
  { side: "front", label: "Front" },
  { side: "back", label: "Back" },
];

export interface BodyMapProps {
  /** Load per muscle on a 0..1 scale (see muscleLoad). Missing muscles count as 0. */
  load: Partial<Record<MuscleId, number>>;
  /** Colour band per muscle (0..4). When omitted it is derived from `load`. */
  bands?: Partial<Record<MuscleId, Band>>;
  /** Which legend and labels to use: how much work, or how long ago. */
  mode?: ColorMode;
  /** Optional short text per muscle, e.g. a recent girth measurement, shown in the detail panel. */
  notes?: Partial<Record<MuscleId, string | readonly string[]>>;
  /** Wording for the load figure in the detail panel, e.g. "of your most-worked muscle". */
  loadPhrase?: string;
}

export function BodyMap({
  load,
  bands,
  mode = "volume",
  notes,
  loadPhrase = "of your most-worked muscle",
}: BodyMapProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [side, setSide] = useState<MuscleSide>("front");
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");
  const [selected, setSelected] = useState<MuscleId | null>(null);
  const [hovered, setHovered] = useState<MuscleId | null>(null);
  const timers = useRef<number[]>([]);
  const swipe = useRef<{ x: number; at: number } | null>(null);
  const justSwiped = useRef(false);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const regions = side === "front" ? FRONT_REGIONS : BACK_REGIONS;
  const lines = side === "front" ? FRONT_LINES : BACK_LINES;
  const decor = side === "front" ? DECOR_LEFT_FRONT : DECOR_LEFT_BACK;
  const landmarks = side === "front" ? FRONT_LANDMARKS : BACK_LANDMARKS;
  const muscles = MUSCLE_GROUPS.filter((m) => m.side === side);
  // Fill-in order follows the body, head to feet, using the top of each muscle's first outline.
  const topOf = (id: MuscleId) =>
    Number(regions[id]?.[0]?.match(/^M\s*[\d.]+[\s,]+([\d.]+)/)?.[1] ?? 0);
  const rank = new Map(
    [...muscles].sort((a, b) => topOf(a.id) - topOf(b.id)).map((m, i) => [m.id, i] as const)
  );
  const percent = (id: MuscleId) => Math.round((load[id] ?? 0) * 100);
  const bandOf = (id: MuscleId): Band => bands?.[id] ?? loadBand(load[id] ?? 0);
  const labelOf = (id: MuscleId) => bandInfo(mode, bandOf(id)).label;

  function flipTo(next: MuscleSide) {
    if (next === side || phase !== "idle") return;
    setSelected(null);
    setHovered(null);
    // Reduced motion: switch instantly. Everything decorative below is also off in CSS.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSide(next);
      return;
    }
    setPhase("out");
    timers.current.push(
      window.setTimeout(() => {
        setSide(next);
        setPhase("in");
        timers.current.push(window.setTimeout(() => setPhase("idle"), TURN_IN_MS));
      }, TURN_OUT_MS)
    );
  }

  function choose(id: MuscleId) {
    if (justSwiped.current) return;
    setSelected((cur) => (cur === id ? null : id));
  }
  function onKey(e: KeyboardEvent, id: MuscleId) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(id);
    }
  }
  function onPointerDown(e: PointerEvent) {
    swipe.current = { x: e.clientX, at: e.timeStamp };
  }
  function onPointerUp(e: PointerEvent) {
    const start = swipe.current;
    swipe.current = null;
    if (!start || e.timeStamp - start.at > 700) return;
    if (Math.abs(e.clientX - start.x) >= SWIPE_PX) {
      justSwiped.current = true;
      window.setTimeout(() => (justSwiped.current = false), 300);
      flipTo(side === "front" ? "back" : "front");
    }
  }

  // Each half is drawn once and mirrored; both halves select the same muscle group.
  const half = (flip: boolean) => (
    <g transform={flip ? MIRROR : undefined} key={(flip ? "r" : "l") + side}>
      {decor.map((d) => (
        <path key={d} d={d} className="bm-decor" />
      ))}
      {muscles.map((m) => {
        const band = bandOf(m.id);
        return (
          <g
            key={m.id}
            className="bm-m"
            data-band={band}
            role="button"
            tabIndex={flip ? -1 : 0}
            aria-hidden={flip || undefined}
            aria-pressed={selected === m.id}
            aria-label={`${m.label}, ${labelOf(m.id)}, ${percent(m.id)} percent`}
            style={{ "--i": rank.get(m.id) ?? 0 } as CSSProperties}
            onClick={() => choose(m.id)}
            onKeyDown={(e) => onKey(e, m.id)}
            onPointerEnter={() => setHovered(m.id)}
            onPointerLeave={() => setHovered((cur) => (cur === m.id ? null : cur))}
            onFocus={() => setHovered(m.id)}
            onBlur={() => setHovered((cur) => (cur === m.id ? null : cur))}
          >
            {(regions[m.id] ?? []).map((d) => (
              <g key={d}>
                <path d={d} className="bm-base" />
                <path d={d} className="bm-shade" fill={`url(#sh-${uid})`} />
                {band > 0 && <path d={d} className="bm-pat" fill={`url(#pat-${uid}-${band})`} />}
                <path d={d} className="bm-hit" />
              </g>
            ))}
          </g>
        );
      })}
      {Object.values(lines)
        .flat()
        .map((d) => (
          <path key={d} d={d} className="bm-line" />
        ))}
      {landmarks.map((d) => (
        <path key={d} d={d} className="bm-landmark" />
      ))}
    </g>
  );

  const halo = (flip: boolean, cls: string) => (
    <g transform={flip ? MIRROR : undefined} key={cls + (flip ? "r" : "l")} aria-hidden>
      {[...decor, ...Object.values(regions).flat()].map((d) => (
        <path key={d} d={d} className={cls} />
      ))}
    </g>
  );

  const selectedMuscle = selected ? MUSCLE_GROUPS.find((m) => m.id === selected) : undefined;
  const captionId = hovered ?? selected;
  const caption = captionId ? MUSCLE_GROUPS.find((m) => m.id === captionId) : undefined;
  const legend = mode === "volume" ? VOLUME_BANDS : RECENCY_BANDS;

  return (
    <section className="hm-bodymap" aria-label="Muscle map">
      <div className="hm-bodymap-tabs" role="group" aria-label="Body side">
        {SIDES.map((s) => (
          <button
            key={s.side}
            type="button"
            className="hm-bodymap-tab"
            aria-pressed={side === s.side}
            onClick={() => flipTo(s.side)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="bm-stage">
        <p className="bm-caption" aria-hidden key={caption?.id ?? "hint"}>
          {caption ? (
            <>
              {caption.label}
              <span
                className="bm-caption-band"
                style={{ "--bm-chip": `var(--bm-b${bandOf(caption.id)})` } as CSSProperties}
              >
                {labelOf(caption.id)}
              </span>
            </>
          ) : (
            <span className="bm-caption-hint">Tap a muscle. Swipe to turn.</span>
          )}
        </p>
        <div className="bm-turn" data-phase={phase}>
          <svg
            className="hm-bodymap-figure"
            viewBox={BODY_VIEWBOX}
            role="group"
            aria-label={`${side} view`}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
          >
            <defs>
              <linearGradient id={`sh-${uid}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0.3" />
                <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
                <stop offset="1" stopColor="#000" stopOpacity="0.28" />
              </linearGradient>
              {/* One pattern per band, so colour is never the only signal. */}
              <pattern id={`pat-${uid}-1`} width="5" height="5" patternUnits="userSpaceOnUse">
                <circle
                  cx="2.5"
                  cy="2.5"
                  r="0.6"
                  style={{ fill: "var(--bm-pattern)" }}
                  fillOpacity="0.2"
                />
              </pattern>
              <pattern
                id={`pat-${uid}-2`}
                width="5"
                height="5"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <path
                  d="M0 0H5"
                  strokeWidth="0.6"
                  strokeOpacity="0.14"
                  style={{ stroke: "var(--bm-pattern)" }}
                />
              </pattern>
              <pattern
                id={`pat-${uid}-3`}
                width="4"
                height="4"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <path
                  d="M0 0H4M0 0V4"
                  strokeWidth="0.5"
                  strokeOpacity="0.12"
                  style={{ stroke: "var(--bm-pattern)" }}
                />
              </pattern>
              <pattern
                id={`pat-${uid}-4`}
                width="4"
                height="4"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <path
                  d="M0 0H4M0 0V4"
                  strokeWidth="0.7"
                  strokeOpacity="0.18"
                  style={{ stroke: "var(--bm-pattern)" }}
                />
              </pattern>
            </defs>
            {halo(false, "bm-outline")}
            {halo(true, "bm-outline")}
            {halo(false, "bm-skin")}
            {halo(true, "bm-skin")}
            {DECOR_CENTER.map((d) => (
              <path key={d} d={d} className="bm-decor" aria-hidden />
            ))}
            {half(false)}
            {half(true)}
          </svg>
        </div>
      </div>

      <ul className="bm-legend" aria-label="Colour key">
        {legend.map((b) => (
          <li key={b.key}>
            <svg className="bm-swatch" viewBox="0 0 22 14" aria-hidden>
              <rect width="22" height="14" data-band={b.band} />
              {b.band > 0 && <rect width="22" height="14" fill={`url(#pat-${uid}-${b.band})`} />}
            </svg>
            {b.label}
            {mode === "volume" && b.range ? ` (${b.range})` : ""}
          </li>
        ))}
      </ul>

      <div className="hm-bodymap-detail" aria-live="polite">
        {selectedMuscle ? (
          <>
            <h3>{selectedMuscle.label}</h3>
            <p>
              {labelOf(selectedMuscle.id)}. Training load {percent(selectedMuscle.id)}% {loadPhrase}
              .
            </p>
            {[notes?.[selectedMuscle.id] ?? []].flat().map((line) => (
              <p key={line}>{line}</p>
            ))}
            <ul>
              {activitiesForMuscle(selectedMuscle.id)
                .slice(0, MAX_ACTIVITIES_SHOWN)
                .map((a) => (
                  <li key={a.key}>
                    {a.label} <span>({a.role})</span>
                  </li>
                ))}
              {activitiesForMuscle(selectedMuscle.id).length > MAX_ACTIVITIES_SHOWN && (
                <li>
                  +{activitiesForMuscle(selectedMuscle.id).length - MAX_ACTIVITIES_SHOWN} more
                </li>
              )}
            </ul>
          </>
        ) : (
          <p>Tap a muscle to see which of your activities train it.</p>
        )}
      </div>

      <details className="hm-bodymap-all">
        <summary>All {side} muscles as a list</summary>
        <ul>
          {muscles.map((m) => (
            <li key={m.id}>
              <span>{m.label}</span>
              <span>
                {labelOf(m.id)}, {percent(m.id)}%
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
