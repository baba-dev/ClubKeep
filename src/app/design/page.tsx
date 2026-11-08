import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { RevealRoot } from "@/components/design/reveal-root";
import { ThemeToggle } from "@/components/design/theme-toggle";
import { themes } from "@/components/design/themes";

const trends = [
  {
    name: "Bento grids",
    note: "Modular tiles of mixed size keep dense dashboards scannable on a phone.",
    used: ["bento", "aurora", "neon"],
  },
  {
    name: "Glass and aurora gradients",
    note: "Blurred translucent layers over slow-moving colour. Needs a solid fallback for contrast.",
    used: ["aurora"],
  },
  {
    name: "Neo-brutalism",
    note: "Thick borders, hard offset shadows, flat saturated fills. Memorable and cheap to render.",
    used: ["brutal"],
  },
  {
    name: "Expressive type",
    note: "One characterful display face (serif, condensed or variable) paired with a neutral body face.",
    used: ["editorial", "neon", "clay", "bento"],
  },
  {
    name: "Claymorphism and spring motion",
    note: "Puffy inset-highlight surfaces and overshoot easing feel tactile and friendly.",
    used: ["clay"],
  },
  {
    name: "Semantic, mode-aware tokens",
    note: "Every colour is a role (surface, ink, line) with a light and dark value, so a mode switch never re-styles components.",
    used: ["aurora", "bento", "brutal", "editorial", "neon", "clay"],
  },
  {
    name: "Scroll reveals and count-ups",
    note: "Staggered entrances and animated numbers give dashboards a sense of life without heavy libraries.",
    used: ["aurora", "bento", "brutal", "editorial", "neon", "clay"],
  },
  {
    name: "View-transition mode switch",
    note: "Light and dark crossfade through the View Transitions API instead of snapping.",
    used: ["aurora", "bento", "brutal", "editorial", "neon", "clay"],
  },
];

export default function DesignIndex() {
  return (
    <div className="dk-root dk-index" data-dk="bento">
      <RevealRoot />
      <div className="dk-bg" aria-hidden />
      <header className="dk-top">
        <span className="dk-brand">
          <span className="dk-logo">CK</span>
          <span>ClubKeep design lab</span>
        </span>
        <ThemeToggle />
      </header>

      <main className="dk-main">
        <section className="dk-index-hero">
          <p className="dk-eyebrow dk-reveal">
            <span className="dk-dot" /> {themes.length} directions · light and dark
          </p>
          <h1 className="dk-display dk-reveal" style={{ "--i": 1 } as React.CSSProperties}>
            Pick the feel of <em className="dk-hl">ClubKeep</em>.
          </h1>
          <p className="dk-lede dk-reveal" style={{ "--i": 2 } as React.CSSProperties}>
            Each direction is a full mockup with the same demo club: ID card, dashboard,
            leaderboard, check-in, pricing, plus a live token sheet for colour, type, shape and
            motion. Use the toggle (top right) on any page to flip between light and dark.
          </p>
        </section>

        <Link
          href="/design/luxe"
          className="dk-card dk-reveal"
          style={{ "--i": 0, display: "block", marginBottom: 24 } as React.CSSProperties}
        >
          <p className="dk-label">New · Luxe</p>
          <h2 className="dk-h3">Orange + gold, sleek app-shell layout, light and dark →</h2>
        </Link>
        <Link
          href="/design/sketch"
          className="dk-card dk-reveal"
          style={{ "--i": 1, display: "block", marginBottom: 24 } as React.CSSProperties}
        >
          <p className="dk-label">Pen &amp; Pencil</p>
          <h2 className="dk-h3">Hand-drawn widgets, Aurora palette →</h2>
        </Link>

        <section className="dk-gallery">
          {themes.map((t, i) => (
            <Link
              key={t.id}
              href={`/design/${t.id}`}
              className="dk-gcard dk-reveal"
              style={{ "--i": i % 3 } as React.CSSProperties}
            >
              <div className="dk-root dk-mini" data-dk={t.id} aria-hidden>
                <div className="dk-bg" />
                <p className="dk-mini-title">{t.headline}</p>
                <div className="dk-mini-row">
                  <span className="dk-btn dk-btn-primary">Check in</span>
                  <span className="dk-btn dk-btn-ghost">Plans</span>
                </div>
                <div className="dk-mini-card">
                  <span className="dk-avatar">PN</span>
                  <span className="dk-mini-lines">
                    <i />
                    <i />
                  </span>
                  <b>142.5</b>
                </div>
                <div className="dk-mini-dots">
                  {[t.light.accent, t.light.accent2, t.dark.accent, t.dark.accent2].map((c, k) => (
                    <i key={k} style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div className="dk-gmeta">
                <div className="dk-gtitle">
                  <h2 className="dk-h3">
                    {i + 1}. {t.name}
                  </h2>
                  <ArrowUpRight size={18} aria-hidden />
                </div>
                <p className="dk-sub">{t.tagline}</p>
                <ul className="dk-tags">
                  {t.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
                <p className="dk-fine">
                  <strong>Best for:</strong> {t.bestFor}
                </p>
                <p className="dk-fine">
                  <strong>Type:</strong> {t.fonts.display.name} + {t.fonts.body.name}
                </p>
              </div>
            </Link>
          ))}
        </section>

        <section className="dk-section">
          <div className="dk-sechead dk-reveal">
            <span className="dk-secnum">↗</span>
            <h2 className="dk-h2">Trends behind these directions</h2>
            <p className="dk-sub">
              A curated read of current product-design patterns, not a measured ranking. Mix and
              match: for example Calm Bento layout with Studio Clay motion.
            </p>
          </div>
          <div className="dk-trends">
            {trends.map((tr, i) => (
              <article
                key={tr.name}
                className="dk-card dk-reveal"
                style={{ "--i": i % 4 } as React.CSSProperties}
              >
                <h3 className="dk-h3">{tr.name}</h3>
                <p className="dk-plan-blurb">{tr.note}</p>
                <p className="dk-trend-used">
                  {tr.used.length === themes.length
                    ? "All directions"
                    : tr.used.map((id) => themes.find((x) => x.id === id)?.name).join(" · ")}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
