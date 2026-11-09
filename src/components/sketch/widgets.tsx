import { CountUp } from "@/components/design/count-up";
import {
  club,
  formatInr,
  initials,
  leaderboard,
  member,
  weekly,
} from "@/components/design/demo-data";
import { Arrow, Doodle, type IconName } from "./illustrations";
import { SketchCheckIn } from "./sketch-checkin";

type Style = React.CSSProperties;
const delay = (i: number): Style => ({ "--i": i }) as Style;

export function Card({
  c,
  i = 0,
  className = "",
  children,
}: {
  c?: 1 | 2 | 3 | 4 | 5 | 6;
  i?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <article className={`sk-card dk-reveal ${className}`} data-c={c} style={delay(i)}>
      {children}
    </article>
  );
}

function Head({ icon, label }: { icon: IconName; label: string }) {
  return (
    <header className="sk-head">
      <Doodle name={icon} className="sk-head-ill" />
      <span className="sk-label">{label}</span>
    </header>
  );
}

export function MembersWidget() {
  return (
    <Card c={3} i={0}>
      <Head icon="heart" label="Active members" />
      <p className="sk-big">
        <CountUp to={184} />
      </p>
      <p className="sk-hand">+12 this month ↗</p>
      <div className="sk-avatars" aria-hidden>
        {["PN", "AM", "RK", "SK", "DP"].map((x, k) => (
          <span key={x} data-k={(k % 6) + 1}>
            {x}
          </span>
        ))}
        <span className="sk-more">+179</span>
      </div>
    </Card>
  );
}

export function StreakWidget() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <Card c={2} i={1}>
      <Head icon="flame" label="Streak" />
      <p className="sk-big">
        <CountUp to={12} /> <small>days</small>
      </p>
      <ol className="sk-week">
        {days.map((d, k) => (
          <li key={k} data-state={k < 6 ? "done" : "today"}>
            <svg viewBox="0 0 30 30" aria-hidden>
              <circle cx="15" cy="15" r="12" className="sk-day-ring" />
              {k < 6 && <path pathLength={1} className="sk-tick" d="M8 15.5l5 5 9-11" />}
            </svg>
            <span>{d}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function BarsWidget() {
  const max = Math.max(...weekly);
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <Card c={4} i={2} className="sk-w2">
      <Head icon="stopwatch" label="Check-ins this week" />
      <svg
        viewBox="0 0 280 150"
        className="sk-chart"
        role="img"
        aria-label="Bar chart of weekly check-ins, busiest on Saturday"
      >
        {[0, 1, 2].map((g) => (
          <path key={g} className="sk-gridline" d={`M0 ${30 + g * 40}H280`} />
        ))}
        {weekly.map((v, k) => {
          const h = (v / max) * 100;
          const today = k === 5;
          return (
            <g key={k} className="sk-bar" style={{ "--k": k } as Style}>
              <rect
                x={14 + k * 38}
                y={118 - h}
                width="26"
                height={h}
                rx="4"
                className={`ink ${today ? "f1" : "f2"}`}
              />
              {!today && (
                <rect
                  x={14 + k * 38}
                  y={118 - h}
                  width="26"
                  height={h}
                  rx="4"
                  fill="url(#sk-hatch)"
                  className="sk-hatch-fill"
                />
              )}
              <text x={27 + k * 38} y="140" textAnchor="middle" className="sk-axis">
                {labels[k]}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="sk-hand sk-note-right">Saturday = best day!</p>
    </Card>
  );
}

export function RingWidget() {
  return (
    <Card c={5} i={3}>
      <Head icon="bolt" label="In the gym now" />
      <div className="sk-ring-wrap">
        <svg
          viewBox="0 0 120 120"
          className="sk-ring"
          role="img"
          aria-label="62 of 80 spots in use"
        >
          <circle cx="60" cy="60" r="46" className="sk-ring-bg" />
          <circle cx="60" cy="60" r="46" pathLength={100} className="sk-ring-fg" />
          <circle cx="60" cy="60" r="34" className="sk-ring-dash" />
        </svg>
        <p className="sk-ring-num">
          <CountUp to={62} />
          <small>/80</small>
        </p>
      </div>
    </Card>
  );
}

export function LedgerWidget() {
  const rows = [
    { n: "Aarav Mehta", m: 150000, paid: true, via: "UPI" },
    { n: "Sara Khan", m: 225000, paid: false, via: "Cash" },
    { n: "Dev Patel", m: 150000, paid: true, via: "Card" },
  ];
  return (
    <Card i={4} className="sk-w2 sk-paper">
      <Head icon="medal" label="Dues ledger" />
      <ul className="sk-ledger">
        {rows.map((r) => (
          <li key={r.n}>
            <span className="sk-ledger-name">{r.n}</span>
            <span className="sk-ledger-via">{r.via}</span>
            <b>{formatInr(r.m)}</b>
            <span className="sk-stamp" data-paid={r.paid}>
              {r.paid ? "PAID" : "DUE"}
            </span>
          </li>
        ))}
      </ul>
      <p className="sk-hand">we only record it, never collect it</p>
    </Card>
  );
}

export function ScheduleWidget() {
  const rows: { t: string; n: string; icon: IconName; left: number }[] = [
    { t: "6:30", n: "Strength Basics", icon: "dumbbell", left: 4 },
    { t: "8:00", n: "Morning Flow", icon: "yogi", left: 9 },
    { t: "18:00", n: "Kettlebell Burn", icon: "kettlebell", left: 1 },
  ];
  return (
    <Card c={6} i={5}>
      <Head icon="yogi" label="Today's classes" />
      <ul className="sk-sched">
        {rows.map((r) => (
          <li key={r.n}>
            <span className="sk-hand sk-time">{r.t}</span>
            <Doodle name={r.icon} className="sk-mini" />
            <span>
              <b>{r.n}</b>
              <small>{r.left} spots left</small>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function PrWidget() {
  const pts = [110, 115, 120, 125, 130, 137.5, 142.5];
  const lo = 100;
  const hi = 150;
  const xy = pts.map((v, k) => [20 + k * 40, 110 - ((v - lo) / (hi - lo)) * 90] as const);
  const d = xy.map(([x, y], k) => `${k ? "L" : "M"}${x} ${y}`).join(" ");
  return (
    <Card i={6} className="sk-w2 sk-paper">
      <Head icon="trophy" label="Deadlift 1RM · Priya" />
      <svg
        viewBox="0 0 280 130"
        className="sk-chart"
        role="img"
        aria-label="Deadlift personal best rising from 110 to 142.5 kilograms"
      >
        {[0, 1, 2].map((g) => (
          <path key={g} className="sk-gridline" d={`M0 ${24 + g * 40}H280`} />
        ))}
        <path d={`${d} L260 120 L20 120Z`} className="sk-area" />
        <path d={d} pathLength={1} className="sk-line" />
        {xy.map(([x, y], k) => (
          <circle
            key={k}
            cx={x}
            cy={y}
            r={k === 6 ? 6 : 4}
            className={k === 6 ? "f1 ink sk-dot-last" : "f2 ink"}
            strokeWidth={2.5}
          />
        ))}
      </svg>
      <p className="sk-hand sk-pr">
        new PR! <b>142.5 kg</b> <Arrow className="sk-pr-arrow" />
      </p>
    </Card>
  );
}

export function CheckInWidget() {
  return (
    <Card c={1} i={7} className="sk-w2">
      <Head icon="qr" label="Member check-in" />
      <SketchCheckIn />
    </Card>
  );
}

/* ---------- ticket-style ID card ---------- */

const barRects = (() => {
  const out: { x: number; w: number }[] = [];
  let x = 0;
  for (let i = 0; i < 40; i++) {
    const w = 1 + ((i * 7 + (i % 3) * 5) % 4);
    if (x + w > 120) break;
    out.push({ x, w });
    x += w + 1.2;
  }
  return out;
})();

export function IdTicket() {
  return (
    <div className="sk-ticket" aria-label="Sample member ID card">
      <div className="sk-ticket-stub">
        <span>MEMBER</span>
      </div>
      <div className="sk-ticket-main">
        <div className="sk-ticket-top">
          <Doodle name="dumbbell" className="sk-ticket-logo" />
          <div>
            <p className="sk-ticket-club">{club.name}</p>
            <p className="sk-ticket-city">{club.city}</p>
          </div>
        </div>
        <div className="sk-ticket-who">
          <span className="sk-ticket-avatar">{initials(member.name)}</span>
          <div>
            <p className="sk-ticket-name">{member.name}</p>
            <p className="sk-ticket-plan">{member.plan}</p>
            <p className="sk-ticket-meta">
              {member.id} · until {member.expiry}
            </p>
          </div>
        </div>
        <svg viewBox="0 0 120 22" className="sk-barcode" preserveAspectRatio="none" aria-hidden>
          {barRects.map((b, i) => (
            <rect key={i} x={b.x} y="0" width={b.w} height="22" />
          ))}
        </svg>
        <span className="sk-ticket-stamp">ACTIVE</span>
      </div>
    </div>
  );
}

/* ---------- leaderboard with podium ---------- */

export function Podium() {
  const top = leaderboard.slice(0, 3);
  const slots = [
    { p: top[1], x: 18, h: 62, c: "f4", rank: 2 },
    { p: top[0], x: 98, h: 92, c: "f2", rank: 1 },
    { p: top[2], x: 178, h: 44, c: "f1", rank: 3 },
  ];
  return (
    <svg
      viewBox="0 0 270 190"
      className="sk-podium"
      role="img"
      aria-label="Podium: Priya Nair first, Aarav Mehta second, Rohan Kulkarni third"
    >
      {slots.map((s) => (
        <g key={s.rank} className="sk-podium-col" style={{ "--k": s.rank } as Style}>
          <rect x={s.x} y={170 - s.h} width="74" height={s.h} rx="5" className={`ink ${s.c}`} />
          <rect
            x={s.x}
            y={170 - s.h}
            width="74"
            height={s.h}
            rx="5"
            fill="url(#sk-hatch)"
            className="sk-hatch-fill"
          />
          <text x={s.x + 37} y={170 - s.h + 30} textAnchor="middle" className="sk-podium-rank">
            {s.rank}
          </text>
          <circle cx={s.x + 37} cy={170 - s.h - 26} r="20" className="ink f6" />
          <text x={s.x + 37} y={170 - s.h - 21} textAnchor="middle" className="sk-podium-init">
            {initials(s.p.name)}
          </text>
          {s.rank === 1 && (
            <svg
              x={s.x + 21}
              y={170 - s.h - 78}
              width="32"
              height="32"
              viewBox="0 0 120 120"
              className="sk-crown"
            >
              <path className="ink f2" d="M14 92 8 34l30 26 22-40 22 40 30-26-6 58Z" />
            </svg>
          )}
        </g>
      ))}
      <path className="ink" strokeWidth={3} d="M4 171H266" />
    </svg>
  );
}

export function BoardList() {
  const max = Math.max(...leaderboard.map((r) => r.score));
  return (
    <ol className="sk-board">
      {leaderboard.map((r, i) => (
        <li
          key={r.name}
          data-pending={r.status === "pending" || undefined}
          style={{ "--i": i, "--w": `${(r.score / max) * 100}%` } as Style}
        >
          <span className="sk-rank">{r.status === "pending" ? "–" : r.rank}</span>
          <span className="sk-av" data-k={(i % 6) + 1}>
            {initials(r.name)}
          </span>
          <span className="sk-board-main">
            <b>{r.name}</b>
            <span className="sk-meter">
              <i />
            </span>
          </span>
          <span className="sk-score">
            {r.score}
            <small> kg</small>
          </span>
          <span className="sk-board-tag">{r.status === "pending" ? "Pending" : r.delta}</span>
        </li>
      ))}
    </ol>
  );
}
