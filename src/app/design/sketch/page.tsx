import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { plans, ticker } from "@/components/design/demo-data";
import { RevealRoot } from "@/components/design/reveal-root";
import { ThemeToggle } from "@/components/design/theme-toggle";
import { HeroScene } from "@/components/sketch/hero-scene";
import {
  Arrow,
  Circled,
  Doodle,
  Scribble,
  SketchDefs,
  type IconName,
} from "@/components/sketch/illustrations";
import {
  paletteGroups,
  sketchCss,
  sketchDark,
  sketchLight,
  tokenNames,
} from "@/components/sketch/tokens";
import {
  BarsWidget,
  BoardList,
  Card,
  CheckInWidget,
  IdTicket,
  LedgerWidget,
  MembersWidget,
  Podium,
  PrWidget,
  RingWidget,
  ScheduleWidget,
  StreakWidget,
} from "@/components/sketch/widgets";
import "./sketch.css";

export const metadata: Metadata = { title: "ClubKeep · Pen & Pencil" };

const kit: { n: IconName; label: string; c: number }[] = [
  { n: "dumbbell", label: "strength", c: 1 },
  { n: "kettlebell", label: "kettlebell", c: 5 },
  { n: "trophy", label: "season", c: 2 },
  { n: "stopwatch", label: "timing", c: 4 },
  { n: "flame", label: "streak", c: 6 },
  { n: "heart", label: "health", c: 6 },
  { n: "bolt", label: "energy", c: 2 },
  { n: "medal", label: "rank", c: 3 },
  { n: "bottle", label: "hydrate", c: 4 },
  { n: "yogi", label: "yoga", c: 3 },
  { n: "sparkle", label: "new", c: 5 },
  { n: "qr", label: "check-in", c: 1 },
];

const rv = (i: number) => ({ "--i": i }) as React.CSSProperties;

export default function SketchPage() {
  return (
    <div className="sk-root">
      <style dangerouslySetInnerHTML={{ __html: sketchCss() }} />
      <SketchDefs />
      <RevealRoot />

      <header className="sk-top">
        <Link href="/design" className="sk-logo-link" aria-label="Back to all directions">
          <span className="sk-logo">
            <Doodle name="dumbbell" />
          </span>
          <span className="sk-wordmark">ClubKeep</span>
        </Link>
        <nav className="sk-nav" aria-label="Sections">
          <a href="#widgets">Widgets</a>
          <a href="#ranks">Leaderboard</a>
          <a href="#plans">Plans</a>
          <a href="#kit">Illustrations</a>
          <a href="#tokens">Tokens</a>
        </nav>
        <ThemeToggle />
      </header>

      <main className="sk-main">
        {/* HERO */}
        <section className="sk-hero">
          <div className="sk-hero-copy">
            <p className="sk-hand sk-kicker dk-reveal">for gyms, clubs &amp; studios</p>
            <h1 className="sk-h1 dk-reveal" style={rv(1)}>
              Run your club,{" "}
              <span className="sk-circled">
                keep your
                <Circled />
              </span>{" "}
              members.
            </h1>
            <p className="sk-lede dk-reveal" style={rv(2)}>
              Check-ins, dues, ID cards and season leaderboards in one friendly app. Sketched with
              ink and pencil, built for one thumb.
            </p>
            <div className="sk-cta dk-reveal" style={rv(3)}>
              <button type="button" className="sk-btn sk-btn-primary">
                Start free <ArrowRight size={18} aria-hidden />
              </button>
              <button type="button" className="sk-btn">
                Watch the 60s tour
              </button>
            </div>
            <p className="sk-hand sk-promise dk-reveal" style={rv(4)}>
              <Arrow flip className="sk-promise-arrow" /> live in under 30 minutes
            </p>
          </div>
          <div className="sk-hero-art dk-reveal" style={rv(2)}>
            <HeroScene />
          </div>
        </section>

        <div className="sk-tape" aria-hidden>
          <div className="sk-tape-track">
            {[...ticker, ...ticker, ...ticker, ...ticker].map((x, i) => (
              <span key={i}>
                {x}
                <Doodle name="sparkle" />
              </span>
            ))}
          </div>
        </div>

        {/* WIDGETS */}
        <section id="widgets" className="sk-section">
          <div className="sk-sechead dk-reveal">
            <p className="sk-hand">01 · the dashboard</p>
            <h2 className="sk-h2">
              Your club,{" "}
              <span className="sk-underlined">
                at a glance
                <Scribble />
              </span>
            </h2>
          </div>
          <div className="sk-grid">
            <MembersWidget />
            <StreakWidget />
            <BarsWidget />
            <RingWidget />
            <LedgerWidget />
            <ScheduleWidget />
            <PrWidget />
            <CheckInWidget />
          </div>
        </section>

        {/* LEADERBOARD + ID */}
        <section id="ranks" className="sk-section">
          <div className="sk-sechead dk-reveal">
            <p className="sk-hand">02 · members in motion</p>
            <h2 className="sk-h2">
              Season 4{" "}
              <span className="sk-underlined">
                leaderboard
                <Scribble />
              </span>
            </h2>
            <p className="sk-sub">
              Only club-approved scores count. Pending ones wait in the wings.
            </p>
          </div>
          <div className="sk-split">
            <Card c={2} i={0} className="sk-podium-card">
              <Podium />
              <p className="sk-hand">deadlift 1RM · kg</p>
            </Card>
            <Card i={1} className="sk-paper">
              <BoardList />
            </Card>
          </div>
          <div className="sk-id-row dk-reveal" style={rv(2)}>
            <IdTicket />
            <div className="sk-id-copy">
              <p className="sk-hand">credit-card size, print-ready</p>
              <h3 className="sk-h3">A member ID that feels like a ticket to something good.</h3>
              <p className="sk-sub">
                Club branding, plan, expiry and a QR to the member profile. Five layouts coming;
                this is the default.
              </p>
            </div>
          </div>
        </section>

        {/* PLANS */}
        <section id="plans" className="sk-section">
          <div className="sk-sechead dk-reveal">
            <p className="sk-hand">03 · honest pricing</p>
            <h2 className="sk-h2">
              Flat tiers,{" "}
              <span className="sk-underlined">
                no surprises
                <Scribble />
              </span>
            </h2>
          </div>
          <div className="sk-plans">
            {plans.map((p, i) => (
              <Card
                key={p.name}
                c={([4, 2, 5] as const)[i]}
                i={i}
                className={p.featured ? "sk-plan sk-plan-hot" : "sk-plan"}
              >
                <span className="sk-tape-piece" aria-hidden />
                {p.featured && <span className="sk-sticker">most loved!</span>}
                <h3 className="sk-h3">{p.name}</h3>
                <p className="sk-price">
                  {p.price}
                  <small>/mo</small>
                </p>
                <p className="sk-hand">{p.note}</p>
                <ul className="sk-checks">
                  {p.items.map((it) => (
                    <li key={it}>
                      <svg viewBox="0 0 24 24" aria-hidden>
                        <path d="M4 13l5 5L20 6" />
                      </svg>
                      {it}
                    </li>
                  ))}
                </ul>
                <button type="button" className={p.featured ? "sk-btn sk-btn-primary" : "sk-btn"}>
                  Choose {p.name}
                </button>
              </Card>
            ))}
          </div>
        </section>

        {/* ILLUSTRATION KIT */}
        <section id="kit" className="sk-section">
          <div className="sk-sechead dk-reveal">
            <p className="sk-hand">04 · the sticker sheet</p>
            <h2 className="sk-h2">
              One doodle kit,{" "}
              <span className="sk-underlined">
                two moods
                <Scribble />
              </span>
            </h2>
            <p className="sk-sub">
              Every illustration is inline SVG that recolours itself: bright fills with ink lines in
              light mode, deep fills with gold lines and neon highlights in dark.
            </p>
          </div>
          <div className="sk-kit">
            {kit.map((k, i) => (
              <figure key={k.n} className="sk-kit-item dk-reveal" data-c={k.c} style={rv(i % 6)}>
                <Doodle name={k.n} />
                <figcaption className="sk-hand">{k.label}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* TOKENS */}
        <section id="tokens" className="sk-section">
          <div className="sk-sechead dk-reveal">
            <p className="sk-hand">05 · design tokens</p>
            <h2 className="sk-h2">
              The rules,{" "}
              <span className="sk-underlined">
                on paper
                <Scribble />
              </span>
            </h2>
            <p className="sk-sub">
              Each chip is split: light value on the left, dark on the right. Flip the mode to
              compare.
            </p>
          </div>

          <div className="sk-tokens">
            <Card i={0} className="sk-paper sk-tok-colors">
              {paletteGroups.map((g) => (
                <div key={g.label} className="sk-pal">
                  <p className="sk-label">{g.label}</p>
                  <div className="sk-pal-row">
                    {g.keys.map((k) => (
                      <div key={k} className="sk-chip">
                        <span
                          className="sk-chip-swatch"
                          style={{
                            background: `linear-gradient(90deg, ${sketchLight[k]} 50%, ${sketchDark[k]} 50%)`,
                          }}
                        />
                        <b>{tokenNames[k]}</b>
                        <code>{sketchLight[k]}</code>
                        <code>{sketchDark[k]}</code>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Card>

            <Card i={1} c={2}>
              <p className="sk-label">Typography</p>
              <p className="sk-spec-display">Nunito 900</p>
              <code>Headlines · 900 · -0.02em · friendly rounded terminals</code>
              <p className="sk-spec-body">
                Members check in with a tap, and the club approves every score before it counts.
              </p>
              <code>Body · Nunito 500 · 1.05rem / 1.6</code>
              <p className="sk-spec-hand">scribbled notes &amp; annotations</p>
              <code>Handwriting · Caveat 600 · used sparingly, never for UI labels</code>
            </Card>

            <Card i={2} c={6}>
              <p className="sk-label">Line, shape &amp; shadow</p>
              <div className="sk-lines">
                <span style={{ borderWidth: 2 }}>2px</span>
                <span style={{ borderWidth: 2.5 }}>2.5px</span>
                <span style={{ borderWidth: 3.5 }}>3.5px</span>
              </div>
              <div className="sk-shadows">
                <span className="sk-sh-a">hard 4</span>
                <span className="sk-sh-b">hard 7</span>
                <span className="sk-sh-c">pressed</span>
              </div>
              <code>Radius 14 · 20 · pill · wobble filter scale 2.6</code>
            </Card>

            <Card i={3} c={3}>
              <p className="sk-label">Motion</p>
              <ul className="sk-motion">
                <li>
                  <b>Pop-in</b>
                  <code>cubic-bezier(.34,1.56,.64,1) · 600ms</code>
                </li>
                <li>
                  <b>Draw-on</b>
                  <code>stroke-dashoffset · 1.2s ease-out</code>
                </li>
                <li>
                  <b>Wiggle</b>
                  <code>±3° · 400ms on hover</code>
                </li>
                <li>
                  <b>Press</b>
                  <code>translate 3px, shadow to 0 · 90ms</code>
                </li>
                <li>
                  <b>Confetti</b>
                  <code>22 pieces · 900ms</code>
                </li>
              </ul>
              <p className="sk-hand">all of it stops under reduced-motion</p>
            </Card>
          </div>
        </section>
      </main>

      <footer className="sk-foot">
        <p className="sk-hand">made with ink &amp; a very sharp pencil</p>
        <Link href="/design" className="sk-btn">
          See the other directions
        </Link>
      </footer>
    </div>
  );
}
