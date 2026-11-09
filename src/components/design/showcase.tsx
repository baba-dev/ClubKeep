import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, Clock, Flame, Sparkles, Trophy } from "lucide-react";
import { CheckInDemo } from "./check-in-demo";
import { CountUp } from "./count-up";
import { initials, leaderboard, plans, stats, ticker, weekly } from "./demo-data";
import { IdCard } from "./id-card";
import { RevealRoot } from "./reveal-root";
import { ThemeToggle } from "./theme-toggle";
import { themes, type Palette, type Theme } from "./themes";

const swatches: { key: keyof Palette; label: string }[] = [
  { key: "bg", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "surface2", label: "Surface 2" },
  { key: "fg", label: "Foreground" },
  { key: "muted", label: "Muted" },
  { key: "line", label: "Line" },
  { key: "accent", label: "Accent" },
  { key: "accent2", label: "Accent 2" },
];

function Highlighted({ text, part }: { text: string; part: string }) {
  const i = text.indexOf(part);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <em className="dk-hl">{part}</em>
      {text.slice(i + part.length)}
    </>
  );
}

function Sparkline() {
  const max = Math.max(...weekly);
  const pts = weekly.map((v, i) => [(i / (weekly.length - 1)) * 100, 40 - (v / max) * 34] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 100 44" className="dk-spark" preserveAspectRatio="none" aria-hidden>
      <path d={`${d} L100 44 L0 44 Z`} className="dk-spark-fill" />
      <path d={d} pathLength={1} className="dk-spark-line" />
    </svg>
  );
}

function SectionHead({ n, title, sub }: { n: string; title: string; sub?: string }) {
  return (
    <div className="dk-sechead dk-reveal">
      <span className="dk-secnum">{n}</span>
      <h2 className="dk-h2">{title}</h2>
      {sub && <p className="dk-sub">{sub}</p>}
    </div>
  );
}

export function Showcase({ theme: t }: { theme: Theme }) {
  const index = themes.findIndex((x) => x.id === t.id);
  const f = t.fonts;
  const max = Math.max(...leaderboard.map((r) => r.score));

  return (
    <div className="dk-root" data-dk={t.id}>
      <RevealRoot />
      <div className="dk-bg" aria-hidden />

      <header className="dk-top">
        <Link href="/design" className="dk-back">
          <ArrowLeft size={16} aria-hidden /> All directions
        </Link>
        <div className="dk-brand">
          <span className="dk-logo">CK</span>
          <span>ClubKeep</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="dk-main">
        {/* HERO */}
        <section className="dk-hero">
          <div className="dk-hero-copy">
            <p className="dk-eyebrow dk-reveal" style={{ "--i": 0 } as React.CSSProperties}>
              <span className="dk-dot" /> Direction {index + 1} of {themes.length} · {t.name}
            </p>
            <h1 className="dk-display dk-reveal" style={{ "--i": 1 } as React.CSSProperties}>
              <Highlighted text={t.headline} part={t.highlight} />
            </h1>
            <p className="dk-lede dk-reveal" style={{ "--i": 2 } as React.CSSProperties}>
              {t.blurb}
            </p>
            <div className="dk-cta dk-reveal" style={{ "--i": 3 } as React.CSSProperties}>
              <button type="button" className="dk-btn dk-btn-primary">
                Start free <ArrowRight size={16} aria-hidden />
              </button>
              <button type="button" className="dk-btn dk-btn-ghost">
                See the member app
              </button>
            </div>
            <ul className="dk-tags dk-reveal" style={{ "--i": 4 } as React.CSSProperties}>
              {t.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          </div>

          <div className="dk-hero-art dk-reveal" style={{ "--i": 2 } as React.CSSProperties}>
            <div className="dk-blob" aria-hidden />
            <IdCard />
            <span className="dk-chip dk-chip-a">
              <BadgeCheck size={16} aria-hidden /> Check-in confirmed
            </span>
            <span className="dk-chip dk-chip-b">
              <Flame size={16} aria-hidden /> 12 day streak
            </span>
          </div>
        </section>

        <div className="dk-ticker" aria-hidden>
          <div className="dk-ticker-track">
            {[...ticker, ...ticker, ...ticker, ...ticker].map((x, i) => (
              <span key={i}>
                {x} <Sparkles size={14} />
              </span>
            ))}
          </div>
        </div>

        {/* DASHBOARD */}
        <section className="dk-section">
          <SectionHead n="01" title="Owner dashboard" sub="Live numbers, one glance, one thumb." />
          <div className="dk-bento">
            <article
              className="dk-card dk-reveal dk-tile-wide"
              style={{ "--i": 0 } as React.CSSProperties}
            >
              <p className="dk-label">Active members</p>
              <p className="dk-bignum">
                <CountUp to={stats.active} />
              </p>
              <p className="dk-delta">+12 this month</p>
              <Sparkline />
            </article>
            <article className="dk-card dk-reveal" style={{ "--i": 1 } as React.CSSProperties}>
              <p className="dk-label">Check-ins today</p>
              <p className="dk-bignum">
                <CountUp to={stats.checkinsToday} />
              </p>
              <p className="dk-delta">
                <Clock size={13} aria-hidden /> Peak 6 to 8 AM
              </p>
            </article>
            <article
              className="dk-card dk-card-accent dk-reveal"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              <p className="dk-label">Dues pending</p>
              <p className="dk-bignum">
                <CountUp to={stats.duesMinor / 100} prefix="₹" />
              </p>
              <p className="dk-delta">9 members · recorded only</p>
            </article>
            <article className="dk-card dk-reveal" style={{ "--i": 3 } as React.CSSProperties}>
              <p className="dk-label">Renewals due</p>
              <p className="dk-bignum">
                <CountUp to={stats.renewals} />
              </p>
              <p className="dk-delta">Next 7 days</p>
            </article>
          </div>
        </section>

        {/* LEADERBOARD + CHECK-IN */}
        <section className="dk-section">
          <SectionHead
            n="02"
            title="Members, in motion"
            sub="Season leaderboard and one-tap check-in."
          />
          <div className="dk-split">
            <article className="dk-card dk-board dk-reveal">
              <header className="dk-board-head">
                <div>
                  <p className="dk-label">Season 4 · Deadlift 1RM</p>
                  <h3 className="dk-h3">
                    <Trophy size={18} aria-hidden /> Club leaderboard
                  </h3>
                </div>
                <span className="dk-badge">Club-approved only</span>
              </header>
              <ol className="dk-rows">
                {leaderboard.map((r, i) => (
                  <li
                    key={r.name}
                    className="dk-row"
                    data-pending={r.status === "pending" || undefined}
                    data-podium={r.rank <= 3 && r.status === "approved" ? r.rank : undefined}
                    style={{ "--i": i, "--w": `${(r.score / max) * 100}%` } as React.CSSProperties}
                  >
                    <span className="dk-rank">{r.status === "pending" ? "–" : r.rank}</span>
                    <span className="dk-avatar">{initials(r.name)}</span>
                    <span className="dk-row-main">
                      <span className="dk-row-name">{r.name}</span>
                      <span className="dk-bar">
                        <span className="dk-bar-fill" />
                      </span>
                    </span>
                    <span className="dk-row-score">
                      {r.score}
                      <small> kg</small>
                    </span>
                    <span className="dk-row-delta">
                      {r.status === "pending" ? "Pending" : r.delta}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="dk-fine">
                Pending scores stay off the board until the club approves them.
              </p>
            </article>

            <article className="dk-card dk-reveal" style={{ "--i": 2 } as React.CSSProperties}>
              <p className="dk-label">Member app</p>
              <h3 className="dk-h3">Check in</h3>
              <CheckInDemo />
            </article>
          </div>
        </section>

        {/* PRICING */}
        <section className="dk-section">
          <SectionHead
            n="03"
            title="Honest pricing"
            sub="Flat tiers, no hidden fees, export any time."
          />
          <div className="dk-plans">
            {plans.map((p, i) => (
              <article
                key={p.name}
                className={
                  p.featured
                    ? "dk-card dk-plan dk-reveal dk-plan-featured"
                    : "dk-card dk-plan dk-reveal"
                }
                style={{ "--i": i } as React.CSSProperties}
              >
                {p.featured && <span className="dk-badge dk-plan-flag">Most popular</span>}
                <h3 className="dk-h3">{p.name}</h3>
                <p className="dk-price">
                  {p.price}
                  <small> /mo</small>
                </p>
                <p className="dk-fine">{p.note}</p>
                <p className="dk-plan-blurb">{p.blurb}</p>
                <ul className="dk-list">
                  {p.items.map((it) => (
                    <li key={it}>
                      <BadgeCheck size={16} aria-hidden /> {it}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`dk-btn ${p.featured ? "dk-btn-primary" : "dk-btn-ghost"}`}
                >
                  Choose {p.name}
                </button>
              </article>
            ))}
          </div>
        </section>

        {/* TOKEN SHEET */}
        <section className="dk-section dk-tokens">
          <SectionHead
            n="04"
            title="Design tokens"
            sub="Each swatch shows light (top left) and dark (bottom right). Toggle the mode to watch them swap."
          />

          <div className="dk-token-grid">
            <article className="dk-card dk-reveal dk-token-colors">
              <p className="dk-label">Colour</p>
              <div className="dk-swatches">
                {swatches.map((s) => (
                  <div className="dk-swatch" key={s.key}>
                    <span
                      className="dk-swatch-chip"
                      style={{
                        background: `linear-gradient(135deg, ${t.light[s.key]} 50%, ${t.dark[s.key]} 50%)`,
                      }}
                    />
                    <span className="dk-swatch-name">{s.label}</span>
                    <code>{t.light[s.key]}</code>
                    <code>{t.dark[s.key]}</code>
                  </div>
                ))}
              </div>
            </article>

            <article
              className="dk-card dk-reveal dk-token-type"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              <p className="dk-label">Typography</p>
              <div className="dk-type">
                <p className="dk-type-display">Ironworks</p>
                <code>
                  Display · {f.display.name} {f.display.weight} · {f.display.track} tracking
                </code>
              </div>
              <div className="dk-type">
                <p className="dk-type-title">Season 4 leaderboard</p>
                <code>Title · {f.display.name} · 1.5rem</code>
              </div>
              <div className="dk-type">
                <p className="dk-type-body">
                  Members check in with a tap, and the club approves every score before it counts.
                </p>
                <code>Body · {f.body.name} 400 · 1rem / 1.6</code>
              </div>
              <div className="dk-type">
                <p className="dk-type-mono">CK-0042 · 142.5 kg · +91 98••• ••210</p>
                <code>Mono · Geist Mono · tabular figures</code>
              </div>
            </article>

            <article
              className="dk-card dk-reveal dk-token-shape"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              <p className="dk-label">Shape and elevation</p>
              <div className="dk-radii">
                {(["sm", "md", "lg"] as const).map((k) => (
                  <div key={k} className="dk-radius-demo" style={{ borderRadius: t.radius[k] }}>
                    <span>{k}</span>
                    <code>{t.radius[k]}</code>
                  </div>
                ))}
              </div>
              <div className="dk-shadows">
                {(["sm", "md", "lg"] as const).map((k) => (
                  <div
                    key={k}
                    className="dk-shadow-demo"
                    style={{ boxShadow: `var(--dk-shadow-${k})` }}
                  >
                    shadow-{k}
                  </div>
                ))}
              </div>
              <code>Border width {t.borderWidth}</code>
            </article>

            <article
              className="dk-card dk-reveal dk-token-motion"
              style={{ "--i": 3 } as React.CSSProperties}
            >
              <p className="dk-label">Motion</p>
              <p className="dk-motion-name">
                {t.motion.easeName} <code>{t.motion.ease}</code>
              </p>
              <div className="dk-track" aria-hidden>
                <span className="dk-track-dot" />
              </div>
              <ul className="dk-motion-list">
                <li>
                  <span>Fast (hover, press)</span>
                  <code>{t.motion.durFast}</code>
                </li>
                <li>
                  <span>Base (reveal)</span>
                  <code>{t.motion.dur}</code>
                </li>
                <li>
                  <span>Rise distance</span>
                  <code>{t.motion.rise}</code>
                </li>
              </ul>
              <p className="dk-fine">Signature: {t.motion.signature}.</p>
              <div className="dk-cta">
                <button type="button" className="dk-btn dk-btn-primary">
                  Hover and press me
                </button>
              </div>
              <p className="dk-fine">All motion switches off under reduced-motion settings.</p>
            </article>
          </div>
        </section>
      </main>

      <footer className="dk-foot">
        <p className="dk-label">More directions</p>
        <nav className="dk-foot-nav">
          {themes
            .filter((x) => x.id !== t.id)
            .map((x) => (
              <Link key={x.id} href={`/design/${x.id}`} className="dk-btn dk-btn-ghost">
                {x.name}
              </Link>
            ))}
        </nav>
      </footer>
    </div>
  );
}
