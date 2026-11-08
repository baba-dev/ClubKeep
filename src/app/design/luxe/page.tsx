import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  Crown,
  Droplet,
  Dumbbell,
  Flame,
  Gem,
  HeartPulse,
  LayoutDashboard,
  MapPin,
  Medal,
  Palette,
  QrCode,
  Search,
  Shapes,
  Sparkles,
  Timer,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { CountUp } from "@/components/design/count-up";
import {
  club,
  formatInr,
  initials,
  leaderboard,
  member,
  plans,
  stats,
} from "@/components/design/demo-data";
import { RevealRoot } from "@/components/design/reveal-root";
import { ThemeToggle } from "@/components/design/theme-toggle";
import { AreaChart, Gauge, HeroArt, LuxeDefs, LuxeQr, MiniSpark } from "@/components/luxe/art";
import { LuxeCheckIn, ScrollSpy } from "@/components/luxe/luxe-client";
import {
  luxeCss,
  luxeDark,
  luxeLight,
  orangeRamp,
  roleGroups,
  roleNames,
} from "@/components/luxe/tokens";
import "./luxe.css";

export const metadata: Metadata = { title: "ClubKeep · Luxe" };

const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "members", label: "Members", icon: Users },
  { id: "plans", label: "Plans", icon: Gem },
  { id: "icons", label: "Icons", icon: Shapes },
  { id: "tokens", label: "Tokens", icon: Palette },
];

const rv = (i: number) => ({ "--i": i }) as React.CSSProperties;

const feed = [
  { n: "Priya Nair", t: "6:41", m: "QR", icon: QrCode },
  { n: "Aarav Mehta", t: "6:38", m: "GPS", icon: MapPin },
  { n: "Rohan Kulkarni", t: "6:32", m: "Staff", icon: UserCheck },
  { n: "Sara Khan", t: "6:20", m: "QR", icon: QrCode },
  { n: "Dev Patel", t: "6:12", m: "GPS", icon: MapPin },
];

const classes = [
  { t: "6:30", n: "Strength Basics", c: "Kiran", left: 4, icon: Dumbbell },
  { t: "8:00", n: "Morning Flow", c: "Anaya", left: 9, icon: Sparkles },
  { t: "18:00", n: "Kettlebell Burn", c: "Kiran", left: 1, icon: Flame },
];

const ledger = [
  { n: "Aarav Mehta", m: 150000, via: "UPI", paid: true },
  { n: "Sara Khan", m: 225000, via: "Cash", paid: false },
  { n: "Dev Patel", m: 150000, via: "Card", paid: true },
];

const iconKit = [
  { i: Dumbbell, l: "Strength" },
  { i: Trophy, l: "Season" },
  { i: Timer, l: "Timing" },
  { i: Flame, l: "Streak" },
  { i: HeartPulse, l: "Health" },
  { i: Zap, l: "Energy" },
  { i: Medal, l: "Rank" },
  { i: QrCode, l: "Check-in" },
  { i: Droplet, l: "Hydrate" },
  { i: CalendarDays, l: "Classes" },
  { i: Users, l: "Members" },
  { i: Crown, l: "Champion" },
];

function Panel({
  i = 0,
  className = "",
  title,
  eyebrow,
  action,
  children,
}: {
  i?: number;
  className?: string;
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className={`lx-panel dk-reveal ${className}`} style={rv(i)}>
      <header className="lx-panel-head">
        <div>
          {eyebrow && <p className="lx-eyebrow">{eyebrow}</p>}
          <h3 className="lx-h3">{title}</h3>
        </div>
        {action}
      </header>
      {children}
    </article>
  );
}

function SectionHead({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="lx-sechead dk-reveal">
      <p className="lx-eyebrow">{eyebrow}</p>
      <h2 className="lx-h2">{title}</h2>
      {children && <p className="lx-sub">{children}</p>}
    </div>
  );
}

function IdCard({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={compact ? "lx-idcard lx-idcard-compact" : "lx-idcard"}
      aria-label="Sample member ID card"
    >
      <div className="lx-idcard-top">
        <span className="lx-mark lx-mark-sm">IW</span>
        <div>
          <p className="lx-idcard-club">{club.name}</p>
          <p className="lx-idcard-sub">{club.city}</p>
        </div>
        <span className="lx-chip-gold">Active</span>
      </div>
      <div className="lx-idcard-mid">
        <svg viewBox="0 0 44 34" className="lx-emv" aria-hidden>
          <rect x="1" y="1" width="42" height="32" rx="6" />
          <path d="M1 12h42M1 22h42M16 1v32M28 1v32" />
        </svg>
        <div>
          <p className="lx-idcard-name">{member.name}</p>
          <p className="lx-idcard-plan">{member.plan}</p>
        </div>
        <LuxeQr />
      </div>
      <p className="lx-idcard-meta">
        {member.id} <span>·</span> Valid until {member.expiry}
      </p>
    </div>
  );
}

export default function LuxePage() {
  const max = Math.max(...leaderboard.map((r) => r.score));
  const podium = [leaderboard[1], leaderboard[0], leaderboard[2]];
  return (
    <div className="lx-root">
      <style dangerouslySetInnerHTML={{ __html: luxeCss() }} />
      <LuxeDefs />
      <RevealRoot />
      <ScrollSpy ids={nav.map((n) => n.id)} />

      {/* ───────── left rail ───────── */}
      <aside className="lx-rail">
        <Link href="/design" className="lx-brand" aria-label="Back to all directions">
          <span className="lx-mark">CK</span>
          <span className="lx-brand-text">ClubKeep</span>
        </Link>
        <nav className="lx-nav" aria-label="Sections">
          {nav.map((n) => (
            <a key={n.id} href={`#${n.id}`} data-spy={n.id}>
              <n.icon size={18} strokeWidth={1.6} aria-hidden />
              <span>{n.label}</span>
            </a>
          ))}
        </nav>
        <div className="lx-club">
          <div className="lx-club-row">
            <span className="lx-avatar lx-avatar-gold">IW</span>
            <div>
              <p className="lx-club-name">{club.name}</p>
              <p className="lx-club-plan">Growth plan</p>
            </div>
          </div>
          <div className="lx-meter" aria-label="184 of 300 members">
            <i style={{ width: "61%" }} />
          </div>
          <p className="lx-club-note">184 / 300 members</p>
        </div>
      </aside>

      <div className="lx-body">
        {/* ───────── top bar ───────── */}
        <header className="lx-bar">
          <Link href="/design" className="lx-bar-brand" aria-label="Back to all directions">
            <span className="lx-mark">CK</span>
          </Link>
          <div className="lx-search" role="search">
            <Search size={16} strokeWidth={1.6} aria-hidden />
            <span>Search members, payments, classes</span>
            <kbd>⌘K</kbd>
          </div>
          <div className="lx-bar-right">
            <button type="button" className="lx-iconbtn" aria-label="Notifications">
              <Bell size={18} strokeWidth={1.6} />
              <i aria-hidden />
            </button>
            <ThemeToggle />
          </div>
        </header>

        <main className="lx-main">
          {/* ───────── cover ───────── */}
          <section id="overview" className="lx-cover">
            <div className="lx-cover-copy">
              <p className="lx-pill dk-reveal">
                <span className="lx-pulse" /> {club.name} · Season 4
              </p>
              <h1 className="lx-h1 dk-reveal" style={rv(1)}>
                Run your club with <em>quiet confidence.</em>
              </h1>
              <p className="lx-lede dk-reveal" style={rv(2)}>
                Check-ins, dues, ID cards and season leaderboards in one calm, precise workspace.
                Built for the owner&rsquo;s phone, polished for the member&rsquo;s.
              </p>
              <div className="lx-cta dk-reveal" style={rv(3)}>
                <button type="button" className="lx-btn lx-btn-primary">
                  Start free <ArrowRight size={16} aria-hidden />
                </button>
                <button type="button" className="lx-btn">
                  Watch the tour
                </button>
              </div>
              <ul className="lx-trust dk-reveal" style={rv(4)}>
                <li>
                  <Check size={14} aria-hidden /> Live in 30 minutes
                </li>
                <li>
                  <Check size={14} aria-hidden /> No payment fees on club dues
                </li>
                <li>
                  <Check size={14} aria-hidden /> Export your data any time
                </li>
              </ul>
            </div>
            <div className="lx-cover-art dk-reveal" style={rv(2)}>
              <HeroArt />
            </div>
          </section>

          {/* ───────── KPI strip ───────── */}
          <section className="lx-kpis dk-reveal" aria-label="Key numbers">
            {[
              {
                l: "Active members",
                v: stats.active,
                d: "+12 this month",
                s: [30, 34, 33, 40, 46, 52, 60],
              },
              {
                l: "Check-ins today",
                v: stats.checkinsToday,
                d: "Peak 6 to 8 AM",
                s: [20, 28, 22, 35, 31, 44, 40],
              },
              {
                l: "Dues pending",
                v: stats.duesMinor / 100,
                p: "₹",
                d: "9 members · recorded",
                s: [50, 44, 47, 41, 38, 35, 30],
              },
              {
                l: "Renewals due",
                v: stats.renewals,
                d: "Next 7 days",
                s: [8, 11, 10, 14, 13, 16, 17],
              },
            ].map((k) => (
              <div key={k.l} className="lx-kpi">
                <p className="lx-eyebrow">{k.l}</p>
                <p className="lx-num">
                  <CountUp to={k.v} prefix={k.p} />
                </p>
                <p className="lx-delta">
                  <TrendingUp size={13} aria-hidden /> {k.d}
                </p>
                <MiniSpark data={k.s} />
              </div>
            ))}
          </section>

          {/* ───────── activity ───────── */}
          <section id="activity" className="lx-section">
            <SectionHead
              eyebrow="Activity"
              title={
                <>
                  What&rsquo;s happening <em>right now</em>
                </>
              }
            >
              Live numbers, one glance, one thumb.
            </SectionHead>
            <div className="lx-grid">
              <Panel
                i={0}
                className="lx-c8"
                eyebrow="Check-ins"
                title="This week"
                action={
                  <div className="lx-seg" role="tablist" aria-label="Range">
                    <span data-on>7D</span>
                    <span>30D</span>
                    <span>Season</span>
                  </div>
                }
              >
                <AreaChart />
              </Panel>

              <Panel i={1} className="lx-c4" eyebrow="Occupancy" title="In the gym now">
                <div className="lx-gauge-wrap">
                  <Gauge value={62} max={80} />
                  <p className="lx-gauge-num">
                    <CountUp to={62} />
                    <small>/ 80</small>
                  </p>
                </div>
                <p className="lx-muted">78% full · quiet again after 9 AM</p>
              </Panel>

              <Panel
                i={0}
                className="lx-c7"
                eyebrow="Season 4 · Deadlift 1RM"
                title="Club leaderboard"
                action={<span className="lx-chip-gold">Club-approved only</span>}
              >
                <ol className="lx-board">
                  {leaderboard.map((r, i) => (
                    <li
                      key={r.name}
                      data-pending={r.status === "pending" || undefined}
                      style={
                        { "--i": i, "--w": `${(r.score / max) * 100}%` } as React.CSSProperties
                      }
                    >
                      <span className="lx-rank">{r.status === "pending" ? "–" : r.rank}</span>
                      <span className="lx-avatar">{initials(r.name)}</span>
                      <span className="lx-board-main">
                        <b>{r.name}</b>
                        <span className="lx-bar-track">
                          <i />
                        </span>
                      </span>
                      <span className="lx-score">
                        {r.score}
                        <small> kg</small>
                      </span>
                      <span className="lx-tag">{r.status === "pending" ? "Pending" : r.delta}</span>
                    </li>
                  ))}
                </ol>
              </Panel>

              <Panel i={1} className="lx-c5" eyebrow="Live" title="Recent check-ins">
                <ul className="lx-feed">
                  {feed.map((f) => (
                    <li key={f.n}>
                      <span className="lx-avatar">{initials(f.n)}</span>
                      <span className="lx-feed-main">
                        <b>{f.n}</b>
                        <small>
                          <f.icon size={12} aria-hidden /> {f.m}
                        </small>
                      </span>
                      <time>{f.t} AM</time>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel i={0} className="lx-c5" eyebrow="Today" title="Classes">
                <ul className="lx-sched">
                  {classes.map((c) => (
                    <li key={c.n}>
                      <time>{c.t}</time>
                      <span className="lx-sched-icon">
                        <c.icon size={18} strokeWidth={1.5} aria-hidden />
                      </span>
                      <span className="lx-sched-main">
                        <b>{c.n}</b>
                        <small>
                          with {c.c} · {c.left} spots left
                        </small>
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel
                i={1}
                className="lx-c7"
                eyebrow="Ledger"
                title="Dues"
                action={<span className="lx-muted">recorded, never collected</span>}
              >
                <table className="lx-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Method</th>
                      <th className="lx-r">Amount</th>
                      <th className="lx-r">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((r) => (
                      <tr key={r.n}>
                        <td>
                          <span className="lx-avatar lx-avatar-sm">{initials(r.n)}</span> {r.n}
                        </td>
                        <td className="lx-muted">{r.via}</td>
                        <td className="lx-r lx-mono">{formatInr(r.m)}</td>
                        <td className="lx-r">
                          <span
                            className={
                              r.paid ? "lx-status lx-status-paid" : "lx-status lx-status-due"
                            }
                          >
                            {r.paid ? "Paid" : "Due"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </div>
          </section>

          {/* ───────── member side ───────── */}
          <section id="members" className="lx-section">
            <SectionHead
              eyebrow="The member side"
              title={
                <>
                  An app members <em>keep opening</em>
                </>
              }
            >
              Their ID, their streak and their rank, one tap from the home screen.
            </SectionHead>
            <div className="lx-members">
              <div className="lx-members-copy dk-reveal">
                <div
                  className="lx-podium"
                  role="img"
                  aria-label="Podium: Priya Nair first, Aarav Mehta second, Rohan Kulkarni third"
                >
                  {podium.map((p) => (
                    <div key={p.name} className="lx-pod" data-rank={p.rank}>
                      {p.rank === 1 && <Crown size={22} strokeWidth={1.4} aria-hidden />}
                      <span className="lx-avatar lx-avatar-lg">{initials(p.name)}</span>
                      <b>{p.name.split(" ")[0]}</b>
                      <small>{p.score} kg</small>
                      <span className="lx-pod-block">{p.rank}</span>
                    </div>
                  ))}
                </div>
                <ul className="lx-points">
                  {[
                    [
                      "Digital and printable ID",
                      "Credit-card size, club-branded, QR to the profile.",
                    ],
                    ["Three ways to check in", "QR scan, GPS radius or a quick staff tap."],
                    ["Honest rankings", "Only scores the club approves ever appear."],
                  ].map(([t, d]) => (
                    <li key={t}>
                      <span className="lx-tick-badge">
                        <Check size={14} strokeWidth={2.2} aria-hidden />
                      </span>
                      <span>
                        <b>{t}</b>
                        <small>{d}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lx-phone-stage dk-reveal" style={rv(1)}>
                <div className="lx-phone">
                  <div className="lx-phone-notch" aria-hidden />
                  <div className="lx-phone-screen">
                    <div className="lx-phone-status" aria-hidden>
                      <span>6:41</span>
                      <span>5G ▮▮▮</span>
                    </div>
                    <p className="lx-eyebrow">Good morning</p>
                    <p className="lx-phone-hello">Priya</p>
                    <IdCard compact />
                    <div className="lx-streak">
                      <p>
                        <Flame size={16} strokeWidth={1.6} aria-hidden /> <b>12</b> day streak
                      </p>
                      <div>
                        {[1, 1, 1, 1, 1, 1, 0].map((d, k) => (
                          <i key={k} data-on={d || undefined} />
                        ))}
                      </div>
                    </div>
                    <LuxeCheckIn />
                  </div>
                </div>
                <div className="lx-float lx-float-a">
                  <Trophy size={16} strokeWidth={1.6} aria-hidden /> New personal best · 142.5 kg
                </div>
                <div className="lx-float lx-float-b">
                  <Medal size={16} strokeWidth={1.6} aria-hidden /> Rank #1 this season
                </div>
              </div>
            </div>
          </section>

          {/* ───────── plans ───────── */}
          <section id="plans" className="lx-section">
            <SectionHead
              eyebrow="Pricing"
              title={
                <>
                  Flat tiers, <em>no surprises</em>
                </>
              }
            >
              Billed per club. Members are always free.
            </SectionHead>
            <div className="lx-plans">
              {plans.map((p, i) => (
                <article
                  key={p.name}
                  className={p.featured ? "lx-plan dk-reveal lx-plan-hot" : "lx-plan dk-reveal"}
                  style={rv(i)}
                >
                  {p.featured && <span className="lx-flag">Most popular</span>}
                  <h3 className="lx-h3">{p.name}</h3>
                  <p className="lx-plan-blurb">{p.blurb}</p>
                  <p className="lx-price">
                    {p.price}
                    <small> / month</small>
                  </p>
                  <p className="lx-muted">{p.note}</p>
                  <ul className="lx-checks">
                    {p.items.map((it) => (
                      <li key={it}>
                        <Check size={15} strokeWidth={2.2} aria-hidden /> {it}
                      </li>
                    ))}
                  </ul>
                  <button type="button" className={p.featured ? "lx-btn lx-btn-primary" : "lx-btn"}>
                    Choose {p.name}
                  </button>
                </article>
              ))}
            </div>
          </section>

          {/* ───────── icons ───────── */}
          <section id="icons" className="lx-section">
            <SectionHead
              eyebrow="Icon language"
              title={
                <>
                  Fine lines, <em>one accent</em>
                </>
              }
            >
              1.5px monoline icons with rounded caps. Gold-to-orange gradient strokes on hairline
              tiles.
            </SectionHead>
            <div className="lx-icons">
              {iconKit.map((k, i) => (
                <figure key={k.l} className="lx-icon dk-reveal" style={rv(i % 6)}>
                  <k.i size={34} strokeWidth={1.4} stroke="url(#lx-gold)" aria-hidden />
                  <figcaption>{k.l}</figcaption>
                </figure>
              ))}
            </div>
          </section>

          {/* ───────── tokens ───────── */}
          <section id="tokens" className="lx-section">
            <SectionHead
              eyebrow="Design tokens"
              title={
                <>
                  The system, <em>in brief</em>
                </>
              }
            >
              Every chip is split: light on the left, dark on the right. Flip the mode to compare.
            </SectionHead>
            <div className="lx-tokens">
              <Panel i={0} className="lx-t-wide" eyebrow="Brand" title="Orange ramp">
                <div className="lx-ramp">
                  {orangeRamp.map((o) => (
                    <div key={o.step} className="lx-ramp-step">
                      <span style={{ background: o.hex }} />
                      <b>{o.step}</b>
                      <code>{o.hex}</code>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel i={1} className="lx-t-wide" eyebrow="Semantic" title="Colour roles">
                {roleGroups.map((g) => (
                  <div key={g.label} className="lx-roles">
                    <p className="lx-eyebrow">{g.label}</p>
                    <div className="lx-roles-row">
                      {g.keys.map((k) => (
                        <div key={k} className="lx-role">
                          <span
                            style={{
                              background: `linear-gradient(90deg, ${luxeLight[k]} 50%, ${luxeDark[k]} 50%)`,
                            }}
                          />
                          <b>{roleNames[k]}</b>
                          <code>{luxeLight[k]}</code>
                          <code>{luxeDark[k]}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </Panel>

              <Panel i={0} eyebrow="Type" title="Fraunces + Nunito">
                <p className="lx-spec-display">Ironworks</p>
                <code>Display · Fraunces 500 · -0.02em · headlines and numerals</code>
                <p className="lx-spec-body">
                  Members check in with a tap, and the club approves every score before it counts.
                </p>
                <code>Body · Nunito 500 · 1rem / 1.6 · friendly and readable</code>
                <p className="lx-spec-mono">CK-0042 · 142.5 kg · 06:41</p>
                <code>Data · Geist Mono · tabular figures</code>
              </Panel>

              <Panel i={1} eyebrow="Surface" title="Line, radius, elevation">
                <div className="lx-surf">
                  <span className="lx-surf-a">Hairline 1px</span>
                  <span className="lx-surf-b">Radius 14 / 22</span>
                  <span className="lx-surf-c">Soft lift</span>
                  <span className="lx-surf-d">Gold edge</span>
                </div>
                <code>
                  Light: warm paper, white cards, orange-tinted shadow. Dark: glossy black, gold
                  gradient hairline.
                </code>
              </Panel>

              <Panel
                i={2}
                className="lx-t-wide"
                eyebrow="Motion"
                title="Calm, precise, a little glossy"
              >
                <ul className="lx-motion">
                  <li>
                    <b>Reveal</b>
                    <code>fade + 20px rise · 650ms · cubic-bezier(.22, 1, .36, 1)</code>
                  </li>
                  <li>
                    <b>Line draw</b>
                    <code>stroke-dashoffset · 1.4s ease-out · charts and hero</code>
                  </li>
                  <li>
                    <b>Gold sheen</b>
                    <code>gradient sweep · 4s · primary button and featured plan</code>
                  </li>
                  <li>
                    <b>Count-up</b>
                    <code>1.4s ease-out quart · stats and gauge</code>
                  </li>
                  <li>
                    <b>Press</b>
                    <code>translateY(1px) scale(.98) · 120ms</code>
                  </li>
                </ul>
                <p className="lx-muted">All motion stops under reduced-motion settings.</p>
              </Panel>
            </div>
          </section>

          <footer className="lx-foot">
            <p className="lx-muted">Orange, gold and a very sharp pencil.</p>
            <Link href="/design" className="lx-btn">
              See the other directions
            </Link>
          </footer>
        </main>
      </div>

      {/* ───────── mobile tab bar ───────── */}
      <nav className="lx-tabbar" aria-label="Sections">
        {nav.slice(0, 5).map((n) => (
          <a key={n.id} href={`#${n.id}`} data-spy={n.id}>
            <n.icon size={20} strokeWidth={1.6} aria-hidden />
            <span>{n.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
