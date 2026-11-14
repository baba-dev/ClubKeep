"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  Crown,
  Dumbbell,
  Eye,
  Flag,
  Flame,
  IdCard,
  Layers3,
  KeyRound,
  Link2,
  Search,
  Plus,
  RotateCcw,
  ScanLine,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  UsersRound,
  WalletCards,
  XCircle,
  Zap,
} from "lucide-react";
import {
  DEMO_NAV,
  DEMO_ROLES,
  initialDemo,
  demoCurrency,
  demoRoute,
  type DemoRole,
  type DemoView,
  type DemoState,
} from "@/lib/demo-fixtures";

const tabIcons: Record<DemoView, typeof Activity> = {
  overview: BarChart3,
  onboarding: Building2,
  invites: Link2,
  members: UsersRound,
  plans: Layers3,
  attendance: ScanLine,
  renewals: CalendarClock,
  finance: WalletCards,
  competition: Dumbbell,
  leaderboard: Trophy,
  challenges: Flag,
  profile: Eye,
  settings: Settings2,
  discover: Search,
  "account-security": KeyRound,
  "member-card": IdCard,
  "my-payments": CreditCard,
  "my-sessions": Activity,
  "admin-directory": ShieldCheck,
};
const roleDescriptions: Record<DemoRole, string> = {
  owner: "Club owner · full business operations",
  manager: "Club manager · staff management and approvals",
  staff: "Front desk · arrivals and assisted member service",
  member: "Athlete · private self-service and club competitions",
  admin: "Platform admin · moderation and platform oversight",
};
const hero: Record<DemoView, [string, string]> = {
  overview: [
    "Your club. In motion.",
    "One beautifully focused command centre for the people, numbers and moments that matter.",
  ],
  onboarding: [
    "Launch something great.",
    "Walk through a real-world club setup without creating production data.",
  ],
  invites: [
    "Bring your people in.",
    "Explore short-lived member-only invitations and owner-controlled access.",
  ],
  members: [
    "Every athlete matters.",
    "Explore a roster, create a member, and see how memberships fit together.",
  ],
  plans: [
    "Plans that fit your club.",
    "Build flexible memberships with clear pricing, durations and renewal journeys.",
  ],
  attendance: [
    "Every arrival counts.",
    "Experience reception check-in and the secure rotating-pass concept.",
  ],
  renewals: [
    "Keep your people close.",
    "Track expiring memberships and experience member-initiated renewal requests.",
  ],
  finance: [
    "Clarity in every rupee.",
    "Record external cash, UPI and card payments, inspect dues and issue receipts.",
  ],
  competition: [
    "Built for the next personal best.",
    "Season scoring, independent verification and a high-energy operations studio.",
  ],
  leaderboard: [
    "Earn your place.",
    "Private club-only rankings based on independently approved performances.",
  ],
  challenges: [
    "Progress worth celebrating.",
    "Club challenges, consistency goals and earned milestones without health surveillance.",
  ],
  profile: [
    "Show the world your club.",
    "Preview publication and approval of your club's public-facing profile.",
  ],
  settings: [
    "Your club. Your rules.",
    "Review identity, vertical, regional settings and presentation.",
  ],
  discover: [
    "Find your community.",
    "Preview searchable, owner-approved club profiles and private-by-default discovery.",
  ],
  "account-security": [
    "Your account. Your protection.",
    "Explore verified sign-in, passkeys, password recovery and session-security boundaries.",
  ],
  "member-card": [
    "Made to belong.",
    "A beautiful digital membership identity, never a static entry credential.",
  ],
  "my-payments": [
    "Every payment, accounted for.",
    "See the member's private ledger and immutable receipt concept.",
  ],
  "my-sessions": [
    "Keep showing up.",
    "Celebrate a personal attendance history and learn about secure check-in.",
  ],
  "admin-directory": [
    "Trust is built in.",
    "Review a fictional club directory submission from the platform side.",
  ],
};
const cardClass = "rounded-3xl border border-[#f3c08c]/15 bg-[#18191f] p-5 sm:p-7";
const fieldClass =
  "mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#0e1016] px-4 text-sm text-white focus-visible:outline-2 focus-visible:outline-[#ffc081]";
const mainButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ffdfaa] to-[#ed852f] px-5 text-sm font-black text-[#24130c] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-[#ffd6a3] disabled:opacity-40";
const secondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#f5bd79]/30 bg-[#322317]/40 px-4 text-sm font-bold text-[#ffd09a] transition hover:border-[#ffd5a1] focus-visible:outline-2 focus-visible:outline-[#ffd6a3] disabled:opacity-40";

function Panel({
  title,
  icon: Icon,
  children,
  extra,
}: {
  title: string;
  icon?: typeof Activity;
  children: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <section className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg font-black tracking-tight sm:text-xl">
          {Icon && <Icon className="size-6 text-[#ffbb78]" aria-hidden="true" />}
          {title}
        </h2>
        {extra}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e8af75]/15 bg-gradient-to-br from-[#292019] to-[#15151a] p-5">
      <Icon className="size-6 text-[#ffc079]" aria-hidden="true" />
      <p className="mt-4 text-3xl font-black tracking-tight text-[#ffe0ac] tabular-nums sm:text-4xl">
        {value}
      </p>
      <p className="mt-2 text-xs font-semibold text-[#cbb5a1]">{label}</p>
      {note && <p className="mt-1 text-xs text-[#9e8b82]">{note}</p>}
    </div>
  );
}
function DemoPill({ children, emphasis = false }: { children: ReactNode; emphasis?: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-bold " +
        (emphasis
          ? "border-[#edbd7b]/40 bg-[#f4b261]/10 text-[#ffd3a1]"
          : "border-white/15 bg-white/5 text-[#c5b6a9]")
      }
    >
      {children}
    </span>
  );
}
function DemoRow({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-4 first:border-t-0">
      <div>
        <p className="font-bold text-[#fff0da]">{title}</p>
        {subtitle && <p className="mt-1 text-xs text-[#b7a497]">{subtitle}</p>}
      </div>
      {trailing}
    </div>
  );
}

export function DemoExperience({
  initialRole,
  initialView,
}: {
  initialRole: DemoRole;
  initialView: DemoView;
}) {
  const [role, setRole] = useState<DemoRole>(initialRole);
  const [view, setView] = useState<DemoView>(initialView);
  const [data, setData] = useState<DemoState>(() => structuredClone(initialDemo));
  const [notice, setNotice] = useState("");
  const [newMember, setNewMember] = useState("");
  const [newPlan, setNewPlan] = useState("");
  const [planAmount, setPlanAmount] = useState("1800");
  const [clubDraft, setClubDraft] = useState(initialDemo.clubName);
  const [verticalDraft, setVerticalDraft] = useState(initialDemo.vertical);
  const [cityDraft, setCityDraft] = useState(initialDemo.city);
  const [memberId, setMemberId] = useState(1);
  const [amount, setAmount] = useState("500");
  const [payMethod, setPayMethod] = useState<"CASH" | "UPI" | "CARD">("UPI");
  const [scoreValue, setScoreValue] = useState("145");
  const [scoreMember, setScoreMember] = useState(1);
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeGoal, setChallengeGoal] = useState("10");
  const [timeZoneDraft, setTimeZoneDraft] = useState(initialDemo.timezone);
  const [portalMessage, setPortalMessage] = useState("");
  const [invitesCreated, setInvitesCreated] = useState(0);
  const [inviteRevoked, setInviteRevoked] = useState(false);
  const [discoverTerm, setDiscoverTerm] = useState("");
  const [demoPasskey, setDemoPasskey] = useState(false);

  function navigate(nextRole: DemoRole, nextView: DemoView) {
    setRole(nextRole);
    setView(nextView);
    setNotice("");
    window.history.replaceState(null, "", demoRoute(nextRole, nextView));
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function action(message: string) {
    setNotice(message + " · Demo only. No production record changed.");
  }
  function reset() {
    setData(structuredClone(initialDemo));
    setNewMember("");
    setInvitesCreated(0);
    setInviteRevoked(false);
    setDiscoverTerm("");
    setDemoPasskey(false);
    setNewPlan("");
    setScoreValue("145");
    setNotice("");
    action("All fictional data has been restored");
  }
  const members = data.members;
  const member = members.find((m) => m.id === memberId) ?? members[0];
  const maya = members.find((m) => m.id === 1) ?? members[0];
  const clubDues = members.reduce((sum, m) => sum + (m.active ? m.due : 0), 0);
  const pending = data.scores.filter((s) => s.status === "PENDING");
  const approved = data.scores.filter((s) => s.status === "APPROVED");
  const standings = approved
    .reduce<{ memberId: number; value: number }[]>((acc, score) => {
      const found = acc.find((a) => a.memberId === score.memberId);
      if (!found) acc.push({ memberId: score.memberId, value: score.value });
      else if (score.value > found.value) found.value = score.value;
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value || a.memberId - b.memberId);

  function registerMember(e: FormEvent) {
    e.preventDefault();
    const name = newMember.trim();
    if (name.length < 3 || name.length > 100) return;
    setData((d) => ({
      ...d,
      members: [
        ...d.members,
        {
          id: Math.max(...d.members.map((m) => m.id), 0) + 1,
          name,
          plan: "Athlete Monthly",
          due: 1500,
          visits: 0,
          active: true,
        },
      ],
    }));
    setNewMember("");
    action("A fictional member was added to the demo roster");
  }
  function recordCheckin() {
    if (!member?.active) return;
    setData((d) => ({
      ...d,
      visitsToday: d.visitsToday + 1,
      members: d.members.map((m) => (m.id === memberId ? { ...m, visits: m.visits + 1 } : m)),
    }));
    action("Demo check-in recorded; real QR verification is not performed here");
  }
  function recordPayment(e: FormEvent) {
    e.preventDefault();
    const paid = Number(amount);
    if (!Number.isSafeInteger(paid) || paid <= 0 || paid > member.due) {
      action("Choose a positive amount no greater than the displayed due");
      return;
    }
    setData((d) => ({
      ...d,
      members: d.members.map((m) => (m.id === memberId ? { ...m, due: m.due - paid } : m)),
      payments: [
        {
          id: Math.max(...d.payments.map((p) => p.id), 1000) + 1,
          memberId,
          amount: paid,
          method: payMethod,
          voided: false,
        },
        ...d.payments,
      ],
    }));
    action("An external payment receipt was simulated (not charged or bank-verified)");
  }
  function voidPayment(id: number) {
    const payment = data.payments.find((p) => p.id === id);
    if (!payment || payment.voided) return;
    setData((d) => ({
      ...d,
      payments: d.payments.map((p) => (p.id === id ? { ...p, voided: true } : p)),
      members: d.members.map((m) =>
        m.id === payment.memberId ? { ...m, due: m.due + payment.amount } : m
      ),
    }));
    action("A receipt reversal was simulated; the original ledger item remains visible");
  }
  function submitScore(e: FormEvent) {
    e.preventDefault();
    const value = Number(scoreValue);
    if (!Number.isSafeInteger(value) || value < 1 || value > 500) return;
    if (data.scores.some((s) => s.memberId === scoreMember && s.status === "PENDING")) {
      action("A score for this member is already awaiting independent review");
      return;
    }
    setData((d) => ({
      ...d,
      scores: [
        ...d.scores,
        {
          id: Math.max(...d.scores.map((s) => s.id), 100) + 1,
          memberId: scoreMember,
          metric: "Strength lift",
          value,
          status: "PENDING",
        },
      ],
    }));
    action("A score was submitted for a separate club reviewer");
  }
  function decideScore(id: number, verdict: "APPROVED" | "REJECTED") {
    setData((d) => ({
      ...d,
      scores: d.scores.map((s) => (s.id === id ? { ...s, status: verdict } : s)),
    }));
    action(
      verdict === "APPROVED"
        ? "Independent score verification simulated"
        : "Score rejection simulated"
    );
  }
  function addChallenge(e: FormEvent) {
    e.preventDefault();
    const title = challengeTitle.trim(),
      goal = Number(challengeGoal);
    if (
      title.length < 5 ||
      title.length > 90 ||
      !Number.isSafeInteger(goal) ||
      goal < 1 ||
      goal > 100
    )
      return;
    setData((d) => ({
      ...d,
      challenges: [
        ...d.challenges,
        {
          id: Math.max(...d.challenges.map((c) => c.id), 200) + 1,
          title,
          goal,
          progress: 0,
          joined: false,
        },
      ],
    }));
    setChallengeTitle("");
    action("New fictional club challenge announced");
  }
  function renew() {
    setData((d) => ({
      ...d,
      renewalRequested: false,
      members: d.members.map((m) => (m.id === 1 ? { ...m, due: 3000, plan: "Strength Pro" } : m)),
    }));
    action("Renewal term assignment simulated; no membership charge was made");
  }
  const jump = (v: DemoView) => navigate(role, v);

  const contents: Record<string, DemoView[]> = {
    "Club operations": [
      "overview",
      "onboarding",
      "invites",
      "members",
      "plans",
      "attendance",
      "renewals",
      "finance",
    ],
    "Sports & engagement": ["competition", "leaderboard", "challenges"],
    "Member self-service": ["member-card", "my-sessions", "my-payments"],
    "Presence & administration": ["profile", "settings", "discover", "account-security", "admin-directory"],
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-[#fff1e1]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(#dbab6c0e 1px,transparent 1px),linear-gradient(90deg,#dbab6c0e 1px,transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <header className="relative z-20 border-b border-[#e9b678]/15 bg-[#111116]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-7">
          <Link href="/auth/sign-in" className="flex items-center gap-3 font-black">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#ffda94] to-[#f17524] text-lg font-black text-[#251208]">
              CK
            </span>
            <span className="text-xl tracking-tight">
              ClubKeep <span className="text-[#f4b86c]">Demo</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <DemoPill emphasis>
              <ShieldCheck className="mr-1 size-3.5" /> FICTIONAL / SAFE
            </DemoPill>
            <button className={secondaryButton} onClick={reset} type="button">
              <RotateCcw className="size-4" /> Reset tour
            </button>
            <Link className={secondaryButton} href="/auth/sign-in">
              <ArrowLeft className="size-4" /> Real sign-in
            </Link>
          </div>
        </div>
      </header>
      <div className="relative mx-auto grid min-h-[calc(100vh-75px)] max-w-[1560px] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-[#dcb375]/15 bg-[#111217]/80 lg:border-r lg:border-b-0">
          <div className="sticky top-0 max-h-[100dvh] overflow-y-auto p-4 sm:p-6">
            <div className="rounded-2xl border border-[#f5b870]/20 bg-gradient-to-br from-[#362117] to-[#18171b] p-4">
              <p className="text-[10px] font-black tracking-[.2em] text-[#f9bd7a] uppercase">
                Perspective switcher
              </p>
              <label htmlFor="demo-persona" className="mt-3 block text-xs text-[#c6b19f]">
                Explore as
              </label>
              <select
                id="demo-persona"
                className={fieldClass}
                value={role}
                onChange={(e) =>
                  navigate(
                    e.target.value as DemoRole,
                    e.target.value === "member" ? "member-card" : "overview"
                  )
                }
              >
                {DEMO_ROLES.map((r) => (
                  <option value={r} key={r}>
                    {r[0].toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
              <p className="mt-3 text-xs leading-6 text-[#b99e87]">{roleDescriptions[role]}</p>
              <p className="mt-2 text-[11px] text-[#e2b78a]">
                Simulation only · no permissions granted
              </p>
            </div>
            <label htmlFor="demo-feature-mobile" className="mt-4 block text-xs font-semibold text-[#e7cba9] lg:hidden">
              Explore a feature
              <select
                id="demo-feature-mobile"
                className={fieldClass}
                value={view}
                onChange={(e) => jump(e.target.value as DemoView)}
              >
                {DEMO_NAV.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <nav aria-label="Demo features" className="mt-5 hidden space-y-5 lg:block">
              {Object.entries(contents).map(([section, views]) => (
                <div key={section}>
                  <h2 className="mb-2 px-2 text-[10px] font-black tracking-[.18em] text-[#ac998b] uppercase">
                    {section}
                  </h2>
                  <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
                    {views.map((v) => {
                      const Icon = tabIcons[v];
                      const item = DEMO_NAV.find((t) => t.key === v);
                      return (
                        <button
                          key={v}
                          type="button"
                          aria-current={v === view ? "page" : undefined}
                          onClick={() => jump(v)}
                          className={
                            "flex min-h-11 min-w-0 items-center gap-2 rounded-xl px-3 text-left text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-[#ffd19b] " +
                            (v === view
                              ? "bg-gradient-to-r from-[#f2bd72] to-[#ef8531] text-[#281509]"
                              : "text-[#c5b6a6] hover:bg-white/10 hover:text-white")
                          }
                        >
                          <Icon className="size-4 shrink-0" aria-hidden="true" />
                          <span className="truncate">{item?.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </aside>
        <main className="min-w-0 px-4 pt-8 pb-24 sm:px-8 sm:pt-12 xl:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-black tracking-widest text-[#ffbf78] uppercase">
              <Zap className="size-4" /> Full product preview{" "}
              <span className="text-[#796e67]">/</span> {role}{" "}
              <span className="text-[#796e67]">/</span>{" "}
              {DEMO_NAV.find((x) => x.key === view)?.label}
            </div>
            <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="max-w-3xl text-4xl leading-[1.05] font-black tracking-[-.055em] sm:text-6xl">
                  {hero[view][0]}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[#bfb2a6] sm:text-base">
                  {hero[view][1]}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 self-start rounded-2xl border border-[#f4b977]/25 bg-[#241b16] px-4 py-3 text-xs text-[#f3c997]">
                <Eye className="size-4" /> Browser & AI-ready preview
              </span>
            </div>
            <div
              role="note"
              className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-[#ffc581]/25 bg-[#231a14] px-5 py-4 text-xs leading-6 text-[#e9c8a4]"
            >
              <ShieldCheck className="size-5 shrink-0 text-[#f5bd7d]" />
              <p className="min-w-0 flex-1">
                All names, clubs, currency amounts and achievements on this page are fictional.
                Controls are interactive simulations; no real user, payment, attendance, account or
                database is modified. Reload resets your tour.
              </p>
            </div>
            {notice && (
              <div
                role="status"
                aria-live="polite"
                className="mt-4 flex items-start gap-2 rounded-2xl border border-[#bce3c2]/20 bg-[#234031]/40 p-4 text-sm text-[#dbf4db]"
              >
                <Check className="mt-0.5 size-4 shrink-0" />
                {notice}
              </div>
            )}
            <div className="mt-7 space-y-6">
              {view === "overview" && (
                <>
                  <section className="relative isolate overflow-hidden rounded-[2rem] border border-[#ffbb6d]/30 bg-gradient-to-br from-[#5b2b10] via-[#282020] to-[#131419] p-7 sm:p-10">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-40 -right-20 size-[400px] rotate-12 rounded-full border-[66px] border-[#f4bd6e]/10"
                    />
                    <div className="relative">
                      <DemoPill emphasis>
                        <Flame className="mr-1 size-3" /> CLUBKEEP BUSINESS
                      </DemoPill>
                      <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
                        {data.clubName}
                      </h2>
                      <p className="mt-3 text-sm text-[#e5bc96]">
                        {data.city} · {data.vertical.toLowerCase()} · club owner&apos;s workspace
                      </p>
                      <div className="mt-7 flex flex-wrap gap-3">
                        <button
                          type="button"
                          className={mainButton}
                          onClick={() => jump("members")}
                        >
                          <UsersRound className="size-4" /> Open club roster{" "}
                          <ArrowRight className="size-4" />
                        </button>
                        <button
                          type="button"
                          className={secondaryButton}
                          onClick={() => jump("competition")}
                        >
                          <Trophy className="size-4" /> Performance Studio
                        </button>
                        <button
                          type="button"
                          className={secondaryButton}
                          onClick={() => navigate("member", "member-card")}
                        >
                          <IdCard className="size-4" /> Switch to member view
                        </button>
                      </div>
                    </div>
                  </section>
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <Metric
                      icon={UsersRound}
                      label="Active roster"
                      value={members.filter((m) => m.active).length}
                    />
                    <Metric icon={ScanLine} label="Today's check-ins" value={data.visitsToday} />
                    <Metric
                      icon={WalletCards}
                      label="Outstanding dues"
                      value={demoCurrency(clubDues)}
                    />
                    <Metric icon={Trophy} label="Verified achievements" value={approved.length} />
                  </div>
                  <div className="grid gap-5 lg:grid-cols-2">
                    <Panel title="Next actions" icon={Sparkles}>
                      <div className="space-y-2">
                        {(
                          [
                            ["onboarding", "Complete club setup"],
                            ["attendance", "Check in an athlete"],
                            ["finance", "Record an external payment"],
                            ["renewals", "Review renewals"],
                          ] as [DemoView, string][]
                        ).map(([v, label]) => (
                          <button
                            key={v}
                            onClick={() => jump(v)}
                            className="flex min-h-12 w-full items-center justify-between rounded-xl border border-white/10 px-4 text-left text-sm font-bold text-[#efd2b4] hover:border-[#f4bb79]/50"
                          >
                            {label}
                            <ChevronRight className="size-4" />
                          </button>
                        ))}
                      </div>
                    </Panel>
                    <Panel title="Member Arena preview" icon={IdCard}>
                      <p className="text-sm leading-7 text-[#c9b5a2]">
                        Explore the same club as a fictional athlete: digital ID, attendance
                        history, fees, membership renewals, opt-in competition, personal bests and
                        challenges.
                      </p>
                      <button
                        onClick={() => navigate("member", "member-card")}
                        className={mainButton + " mt-6"}
                      >
                        Enter as member <ArrowRight className="size-4" />
                      </button>
                    </Panel>
                  </div>
                </>
              )}
              {view === "onboarding" && (
                <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
                  <Panel title="Guided setup · 1–5" icon={Building2}>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (clubDraft.trim().length < 3) return;
                        setData((d) => ({
                          ...d,
                          clubName: clubDraft.trim(),
                          vertical: verticalDraft,
                          city: cityDraft.trim(),
                        }));
                        action(
                          "The demo club setup was completed with a fictional owner membership"
                        );
                      }}
                      className="space-y-4"
                    >
                      <label className="block text-sm font-bold">
                        1 · Club name
                        <input
                          required
                          minLength={3}
                          maxLength={100}
                          className={fieldClass}
                          value={clubDraft}
                          onChange={(e) => setClubDraft(e.target.value)}
                        />
                      </label>
                      <label className="block text-sm font-bold">
                        2 · Club type
                        <select
                          className={fieldClass}
                          value={verticalDraft}
                          onChange={(e) => setVerticalDraft(e.target.value)}
                        >
                          {["GYM", "YOGA", "DANCE", "SPORTS", "OTHER"].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm font-bold">
                        3 · City
                        <input
                          className={fieldClass}
                          value={cityDraft}
                          maxLength={80}
                          onChange={(e) => setCityDraft(e.target.value)}
                        />
                      </label>
                      <p className="text-sm leading-7 text-[#b8a798]">
                        4 · Branding can be configured later. 5 · The actual product requires a
                        membership plan and owner review before launching the club.
                      </p>
                      <button className={mainButton}>
                        Complete fictional setup <ArrowRight className="size-4" />
                      </button>
                    </form>
                  </Panel>
                  <Panel title="Owner access" icon={ShieldCheck}>
                    <p className="text-sm leading-7 text-[#c7b4a5]">
                      Creating a real club grants its creator the club OWNER role. Platform
                      administration alone does not authorize another club&apos;s private resources.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <DemoPill emphasis>Verified session</DemoPill>
                      <DemoPill emphasis>Club OWNER</DemoPill>
                      <DemoPill>Tenant isolated</DemoPill>
                    </div>
                    <Link href="/clubs/new" className={secondaryButton + " mt-6"}>
                      Create an actual club <ArrowRight className="size-4" />
                    </Link>
                  </Panel>
                </div>
              )}
              {view === "members" && (
                <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
                  <Panel
                    title="Club roster"
                    icon={UsersRound}
                    extra={
                      <DemoPill emphasis>{members.filter((m) => m.active).length} active</DemoPill>
                    }
                  >
                    {members.map((m) => (
                      <DemoRow
                        key={m.id}
                        title={m.name}
                        subtitle={
                          "#" +
                          String(m.id).padStart(4, "0") +
                          " · " +
                          m.plan +
                          " · " +
                          m.visits +
                          " visits"
                        }
                        trailing={
                          <span className="flex items-center gap-3">
                            <DemoPill>{m.active ? "Active" : "Archived"}</DemoPill>
                            <button
                              type="button"
                              className={secondaryButton}
                              onClick={() => {
                                setData((d) => ({
                                  ...d,
                                  members: d.members.map((x) =>
                                    x.id === m.id ? { ...x, active: !x.active } : x
                                  ),
                                }));
                                action(
                                  m.active
                                    ? "Member archived in demo"
                                    : "Member reactivated in demo"
                                );
                              }}
                            >
                              {m.active ? "Archive" : "Restore"}
                            </button>
                          </span>
                        }
                      />
                    ))}
                  </Panel>
                  <Panel title="Register an athlete" icon={Plus}>
                    <form className="space-y-4" onSubmit={registerMember}>
                      <label className="block text-sm font-bold">
                        Member name
                        <input
                          className={fieldClass}
                          minLength={3}
                          maxLength={100}
                          value={newMember}
                          onChange={(e) => setNewMember(e.target.value)}
                          placeholder="Fictional member name"
                          required
                        />
                      </label>
                      <p className="text-sm leading-7 text-[#b4a598]">
                        A separate real workflow links a verified account; a phone number never
                        proves identity.
                      </p>
                      <button className={mainButton}>
                        <Plus className="size-4" /> Add demo member
                      </button>
                    </form>
                  </Panel>
                </div>
              )}
              {view === "plans" && (
                <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
                  <Panel title="Membership plans" icon={Layers3}>
                    {data.plans.map((p) => (
                      <DemoRow
                        key={p.name}
                        title={p.name}
                        subtitle={p.months + " month(s) · charges recorded externally"}
                        trailing={
                          <span className="text-xl font-black text-[#ffcf90]">
                            {demoCurrency(p.amount)}
                          </span>
                        }
                      />
                    ))}
                  </Panel>
                  <Panel title="Design a plan" icon={Plus}>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const cost = Number(planAmount),
                          name = newPlan.trim();
                        if (
                          name.length < 3 ||
                          !Number.isSafeInteger(cost) ||
                          cost < 0 ||
                          cost > 100000
                        )
                          return;
                        setData((d) => ({
                          ...d,
                          plans: [...d.plans, { name, amount: cost, months: 1 }],
                        }));
                        setNewPlan("");
                        action("A fictional plan was added");
                      }}
                      className="space-y-4"
                    >
                      <label className="block text-sm font-bold">
                        Plan name
                        <input
                          className={fieldClass}
                          required
                          minLength={3}
                          maxLength={90}
                          value={newPlan}
                          onChange={(e) => setNewPlan(e.target.value)}
                          placeholder="Weekend Athlete"
                        />
                      </label>
                      <label className="block text-sm font-bold">
                        Monthly price (INR)
                        <input
                          className={fieldClass}
                          required
                          type="number"
                          min={0}
                          max={100000}
                          step={1}
                          value={planAmount}
                          onChange={(e) => setPlanAmount(e.target.value)}
                        />
                      </label>
                      <button className={mainButton}>
                        Save demo plan <ArrowRight className="size-4" />
                      </button>
                    </form>
                  </Panel>
                </div>
              )}
              {view === "attendance" && (
                <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
                  <Panel title="Reception desk" icon={ScanLine}>
                    <label className="block text-sm font-bold">
                      Select an athlete
                      <select
                        className={fieldClass}
                        value={memberId}
                        onChange={(e) => setMemberId(Number(e.target.value))}
                      >
                        {members.map((m) => (
                          <option value={m.id} key={m.id}>
                            {m.name}
                            {!m.active ? " (archived)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="mt-7 rounded-2xl border border-[#e7ad66]/25 bg-[#2c211a] p-6 text-center">
                      <ScanLine className="mx-auto size-14 text-[#ffcd8e]" />
                      <h3 className="mt-4 text-xl font-black">Front-desk entry</h3>
                      <p className="mt-2 text-sm text-[#d0b8a5]">
                        Simulate a reception check-in with no camera or signed admission token.
                      </p>
                      <button
                        className={mainButton + " mt-6"}
                        disabled={!member.active}
                        onClick={recordCheckin}
                      >
                        Check in {member.name}
                      </button>
                    </div>
                  </Panel>
                  <Panel title="Signed QR admissions" icon={ShieldCheck}>
                    <p className="text-sm leading-7 text-[#cab4a0]">
                      In the real application, members display a short-lived, club-bound rotating
                      QR. Staff validate it against active membership, club identity and the
                      club&apos;s local calendar day. A printed ID is never an entry token.
                    </p>
                    <Metric icon={Activity} label="Member's demo check-ins" value={member.visits} />
                    <button
                      type="button"
                      onClick={() => navigate("member", "member-card")}
                      className={secondaryButton + " mt-4"}
                    >
                      Preview digital member ID <ArrowRight className="size-4" />
                    </button>
                  </Panel>
                </div>
              )}
              {view === "renewals" && (
                <div className="grid gap-5 lg:grid-cols-2">
                  <Panel title="Member renewal queue" icon={CalendarClock}>
                    <DemoRow
                      title={maya.name}
                      subtitle={
                        data.renewalRequested
                          ? "New renewal requested by member"
                          : "No outstanding request"
                      }
                      trailing={
                        <DemoPill emphasis={data.renewalRequested}>
                          {data.renewalRequested ? "Pending" : "Clear"}
                        </DemoPill>
                      }
                    />
                    <p className="my-4 text-sm leading-7 text-[#bca999]">
                      Renewals remain manual; ClubKeep does not automatically collect or extend
                      payments.
                    </p>
                    {data.renewalRequested && (
                      <button className={mainButton} onClick={renew}>
                        Assign renewal term <Check className="size-4" />
                      </button>
                    )}
                  </Panel>
                  <Panel title="Member perspective" icon={UserRound}>
                    <p className="text-sm leading-7 text-[#c6b3a3]">
                      Open the member persona to submit a request. The owner then reviews it in this
                      inbox.
                    </p>
                    <button
                      className={secondaryButton + " mt-5"}
                      onClick={() => {
                        setData((d) => ({ ...d, renewalRequested: true }));
                        action("Fictional member requested renewal");
                      }}
                    >
                      Simulate member renewal request
                    </button>
                  </Panel>
                </div>
              )}
              {view === "finance" && (
                <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
                  <Panel title="Externally recorded payments" icon={WalletCards}>
                    {data.payments.map((p) => (
                      <DemoRow
                        key={p.id}
                        title={"Receipt #" + p.id + " · " + demoCurrency(p.amount)}
                        subtitle={
                          (members.find((m) => m.id === p.memberId)?.name ?? "Member") +
                          " · " +
                          p.method +
                          (p.voided ? " · VOID" : " · recorded externally")
                        }
                        trailing={
                          p.voided ? (
                            <DemoPill>Voided</DemoPill>
                          ) : (
                            <button className={secondaryButton} onClick={() => voidPayment(p.id)}>
                              Reverse receipt
                            </button>
                          )
                        }
                      />
                    ))}
                  </Panel>
                  <div className="space-y-5">
                    <Metric
                      icon={CircleDollarSign}
                      label="Outstanding club dues"
                      value={demoCurrency(clubDues)}
                    />
                    <Panel title="Record a collection" icon={CreditCard}>
                      <form className="space-y-4" onSubmit={recordPayment}>
                        <label className="block text-sm font-bold">
                          Member
                          <select
                            className={fieldClass}
                            value={memberId}
                            onChange={(e) => setMemberId(Number(e.target.value))}
                          >
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} · {demoCurrency(m.due)} due
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-sm font-bold">
                          Amount · INR
                          <input
                            className={fieldClass}
                            required
                            type="number"
                            min={1}
                            max={member.due}
                            step={1}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                          />
                        </label>
                        <label className="block text-sm font-bold">
                          Payment method
                          <select
                            className={fieldClass}
                            value={payMethod}
                            onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
                          >
                            <option value="UPI">UPI</option>
                            <option value="CASH">Cash</option>
                            <option value="CARD">Card</option>
                          </select>
                        </label>
                        <button className={mainButton} disabled={member.due === 0}>
                          Record demo payment <ArrowRight className="size-4" />
                        </button>
                        <p className="text-xs text-[#bba795]">
                          No payment is processed, verified or bank-settled in this preview.
                        </p>
                      </form>
                    </Panel>
                  </div>
                </div>
              )}
              {view === "competition" && (
                <div className="space-y-5">
                  <section className="relative overflow-hidden rounded-[2rem] border border-[#f5b967]/30 bg-gradient-to-r from-[#553016] via-[#291c17] to-[#13151b] p-7 sm:p-10">
                    <DemoPill emphasis>
                      <Trophy className="mr-1 size-3.5" /> SEASON LEAGUE
                    </DemoPill>
                    <h2 className="mt-5 text-3xl font-black sm:text-5xl">
                      Stand taller. Go further.
                    </h2>
                    <p className="mt-3 text-[#dfbea3]">
                      Strength · 3-month season · Scores become public to opted-in members only
                      after club approval.
                    </p>
                    <div className="mt-7 grid grid-cols-2 gap-3 sm:max-w-lg">
                      <Metric icon={BadgeCheck} label="Verified scores" value={approved.length} />
                      <Metric
                        icon={ClipboardCheck}
                        label="Awaiting review"
                        value={pending.length}
                      />
                    </div>
                  </section>
                  <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
                    <Panel title="Independent verification queue" icon={ClipboardCheck}>
                      {!pending.length ? (
                        <p className="text-sm text-[#bda99c]">Every score has been reviewed.</p>
                      ) : (
                        pending.map((s) => (
                          <DemoRow
                            key={s.id}
                            title={members.find((m) => m.id === s.memberId)?.name ?? "Member"}
                            subtitle={s.value + " kg · Strength lift · awaiting club review"}
                            trailing={
                              <span className="flex items-center gap-2">
                                <button
                                  className={mainButton}
                                  onClick={() => decideScore(s.id, "APPROVED")}
                                >
                                  <Check className="size-4" /> Approve
                                </button>
                                <button
                                  className={secondaryButton}
                                  onClick={() => decideScore(s.id, "REJECTED")}
                                  aria-label="Reject score"
                                >
                                  <XCircle className="size-4" />
                                </button>
                              </span>
                            }
                          />
                        ))
                      )}
                    </Panel>
                    <Panel title="Witnessed result submission" icon={Plus}>
                      <form onSubmit={submitScore} className="space-y-4">
                        <label className="block text-sm font-bold">
                          Athlete
                          <select
                            className={fieldClass}
                            value={scoreMember}
                            onChange={(e) => setScoreMember(Number(e.target.value))}
                          >
                            {members
                              .filter((m) => m.active)
                              .map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label className="block text-sm font-bold">
                          Strength lift · kg
                          <input
                            className={fieldClass}
                            required
                            type="number"
                            min={1}
                            max={500}
                            step={1}
                            value={scoreValue}
                            onChange={(e) => setScoreValue(e.target.value)}
                          />
                        </label>
                        <button className={mainButton}>
                          Submit demo result <ArrowRight className="size-4" />
                        </button>
                        <p className="text-xs leading-6 text-[#bba795]">
                          In production, the club checks witness evidence, and a submitter cannot
                          approve their own result. This fictional preview shows both actions for
                          testing.
                        </p>
                      </form>
                    </Panel>
                  </div>
                </div>
              )}
              {view === "leaderboard" && (
                <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
                  <Panel
                    title="Private league standings"
                    icon={Trophy}
                    extra={<DemoPill emphasis>Season 2026 · Strength</DemoPill>}
                  >
                    {data.rankingOptIn ? (
                      standings.map((s, i) => (
                        <DemoRow
                          key={s.memberId}
                          title={
                            "#" +
                            (i + 1) +
                            "  " +
                            (members.find((m) => m.id === s.memberId)?.name ?? "Member")
                          }
                          subtitle={
                            i === 0
                              ? "Top verified result · club-only visibility"
                              : "Approved, season-specific ranking"
                          }
                          trailing={
                            <span className="text-2xl font-black text-[#ffd294] tabular-nums">
                              {s.value}
                              <small className="ml-1 text-xs">kg</small>
                            </span>
                          }
                        />
                      ))
                    ) : (
                      <p className="text-sm leading-7 text-[#b8a598]">
                        Your fictional member has opted out. Their ranking participation is hidden.
                        Re-enable to inspect podiums.
                      </p>
                    )}
                  </Panel>
                  <Panel title="Consent & fairness" icon={ShieldCheck}>
                    <p className="text-sm leading-7 text-[#c6b5a4]">
                      Member visibility is strictly optional. Only active, explicitly linked members
                      can participate, and the league never combines unrelated sporting units.
                    </p>
                    <button
                      type="button"
                      className={secondaryButton + " mt-5"}
                      aria-pressed={data.rankingOptIn}
                      onClick={() => {
                        setData((d) => ({ ...d, rankingOptIn: !d.rankingOptIn }));
                        action(
                          data.rankingOptIn
                            ? "Ranking visibility revoked"
                            : "Ranking visibility enabled"
                        );
                      }}
                    >
                      {data.rankingOptIn
                        ? "Opt out of the demo league"
                        : "Opt into the demo league"}
                    </button>
                    <button className={mainButton + " mt-4"} onClick={() => jump("competition")}>
                      Submit another score <ArrowRight className="size-4" />
                    </button>
                  </Panel>
                </div>
              )}
              {view === "challenges" && (
                <div className="grid gap-5 lg:grid-cols-2">
                  {data.challenges.map((c) => (
                    <Panel
                      title={c.title}
                      icon={Award}
                      key={c.id}
                      extra={
                        <DemoPill emphasis={c.progress >= c.goal && c.joined}>
                          {c.progress >= c.goal && c.joined
                            ? "Badge earned"
                            : c.joined
                              ? "Participating"
                              : "Not joined"}
                        </DemoPill>
                      }
                    >
                      <div className="flex items-end justify-between">
                        <p className="text-4xl font-black text-[#ffcd87] tabular-nums">
                          {c.joined ? c.progress : 0}
                          <small className="ml-2 text-base text-[#a89a8f]">/ {c.goal}</small>
                        </p>
                        <p className="text-xs text-[#dab88d]">
                          {c.joined ? Math.min(100, Math.round((c.progress / c.goal) * 100)) : 0}%
                        </p>
                      </div>
                      <div
                        className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"
                        role="progressbar"
                        aria-label={c.title + " progress"}
                        aria-valuemin={0}
                        aria-valuemax={c.goal}
                        aria-valuenow={c.joined ? c.progress : 0}
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#ed7d2f] to-[#ffe0a5] motion-reduce:transition-none"
                          style={{
                            width:
                              (c.joined ? Math.min(100, (c.progress / c.goal) * 100) : 0) + "%",
                          }}
                        />
                      </div>
                      <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          type="button"
                          className={secondaryButton}
                          onClick={() => {
                            setData((d) => ({
                              ...d,
                              challenges: d.challenges.map((x) =>
                                x.id === c.id ? { ...x, joined: !x.joined } : x
                              ),
                            }));
                            action(
                              c.joined ? "Left fictional challenge" : "Joined fictional challenge"
                            );
                          }}
                        >
                          {c.joined ? "Leave challenge" : "Join challenge"}
                        </button>
                        {c.joined && c.progress < c.goal && (
                          <button
                            type="button"
                            className={mainButton}
                            onClick={() => {
                              setData((d) => ({
                                ...d,
                                challenges: d.challenges.map((x) =>
                                  x.id === c.id ? { ...x, progress: x.progress + 1 } : x
                                ),
                              }));
                              action("Verified training milestone simulated");
                            }}
                          >
                            <Flame className="size-4" /> Simulate session
                          </button>
                        )}
                      </div>
                    </Panel>
                  ))}
                  <Panel title="Launch a club challenge" icon={Flag}>
                    <form onSubmit={addChallenge} className="space-y-4">
                      <label className="block text-sm font-bold">
                        Challenge name
                        <input
                          required
                          minLength={5}
                          maxLength={90}
                          className={fieldClass}
                          value={challengeTitle}
                          onChange={(e) => setChallengeTitle(e.target.value)}
                          placeholder="October attendance sprint"
                        />
                      </label>
                      <label className="block text-sm font-bold">
                        Target
                        <input
                          className={fieldClass}
                          type="number"
                          required
                          min={1}
                          max={100}
                          value={challengeGoal}
                          onChange={(e) => setChallengeGoal(e.target.value)}
                        />
                      </label>
                      <button className={mainButton}>Create demo challenge</button>
                    </form>
                  </Panel>
                </div>
              )}
              {view === "profile" && (
                <div className="grid gap-5 lg:grid-cols-2">
                  <Panel title="Public club listing" icon={Building2}>
                    <h3 className="text-3xl font-black">{data.clubName}</h3>
                    <p className="mt-3 text-sm text-[#c4ab96]">
                      {data.city} · {data.vertical.toLowerCase()} club
                    </p>
                    <p className="mt-4 text-sm leading-7 text-[#cebba6]">
                      A welcoming athletic community focused on movement, personal progress and
                      showing up together.
                    </p>
                    <p className="mt-5">
                      <DemoPill emphasis>{data.profileStatus}</DemoPill>
                    </p>
                  </Panel>
                  <Panel title="Publication review" icon={Eye}>
                    <p className="text-sm leading-7 text-[#c6b3a4]">
                      Club owners submit a revision. A verified platform administrator approves or
                      rejects the listing separately. This tour provides both perspectives without
                      granting real platform authority.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        className={secondaryButton}
                        onClick={() => {
                          setData((d) => ({ ...d, profileStatus: "PENDING" }));
                          action("Fictional revision submitted");
                        }}
                      >
                        Submit revision
                      </button>
                      <button
                        className={mainButton}
                        onClick={() => navigate("admin", "admin-directory")}
                      >
                        Switch to moderation <ArrowRight className="size-4" />
                      </button>
                    </div>
                  </Panel>
                </div>
              )}
              {view === "settings" && (
                <div className="grid gap-5 lg:grid-cols-2">
                  <Panel title="Club identity & timezone" icon={Settings2}>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setData((d) => ({ ...d, timezone: timeZoneDraft }));
                        action("Club-local timezone changed in demo only");
                      }}
                    >
                      <label className="block text-sm font-bold">
                        Club time zone
                        <select
                          className={fieldClass}
                          value={timeZoneDraft}
                          onChange={(e) => setTimeZoneDraft(e.target.value)}
                        >
                          {[
                            "Asia/Kolkata",
                            "Asia/Muscat",
                            "Europe/London",
                            "America/New_York",
                            "UTC",
                          ].map((z) => (
                            <option value={z} key={z}>
                              {z}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className={mainButton + " mt-5"}>Save settings preview</button>
                    </form>
                  </Panel>
                  <Panel title="Role boundaries" icon={ShieldCheck}>
                    <p className="text-sm leading-7 text-[#c5b2a2]">
                      Club owners and managers manage operations; reception staff cannot approve
                      their own results; members control their private history and leaderboard
                      consent. A platform administrator is not automatically an owner of every
                      tenant.
                    </p>
                    <button
                      onClick={() => navigate("admin", "admin-directory")}
                      className={secondaryButton + " mt-5"}
                    >
                      Preview admin moderation
                    </button>
                  </Panel>
                </div>
              )}
              {view === "member-card" && (
                <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                  <section
                    aria-label="Demo identity card"
                    className="relative min-h-80 overflow-hidden rounded-[2rem] border border-[#f5bf77]/30 bg-gradient-to-br from-[#623014] via-[#272020] to-[#111821] p-8 sm:p-10"
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-24 -right-16 size-80 rotate-12 rounded-full border-[48px] border-[#ffca78]/10"
                    />
                    <p className="relative flex items-center gap-2 text-xs font-black tracking-[.18em] text-[#ffe0ae] uppercase">
                      <IdCard className="size-5" /> Member identity
                    </p>
                    <h2 className="relative mt-12 text-4xl font-black tracking-tight">
                      {maya.name}
                    </h2>
                    <p className="relative mt-3 text-sm text-[#edc297]">{data.clubName}</p>
                    <div className="relative mt-10 flex items-center justify-between gap-4 border-t border-[#ffd2a6]/20 pt-5">
                      <span className="text-xs font-bold tracking-widest text-[#eed0b1]">
                        CK-0001 · STRENGTH PRO
                      </span>
                      <BadgeCheck className="size-7 text-[#ffd28b]" />
                    </div>
                  </section>
                  <Panel title="Member-only access" icon={ShieldCheck}>
                    <p className="text-sm leading-7 text-[#c6b3a2]">
                      A digital membership card identifies you; it is not a permanent authentication
                      or admission QR. For entry, open the separately generated, short-lived
                      rotating pass in a real authenticated member session.
                    </p>
                    <button
                      className={secondaryButton + " mt-5"}
                      onClick={() => jump("my-sessions")}
                    >
                      View member sessions <ArrowRight className="size-4" />
                    </button>
                  </Panel>
                </div>
              )}
              {view === "my-payments" && (
                <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
                  <Panel title="Your recorded fee history" icon={WalletCards}>
                    {data.payments
                      .filter((p) => p.memberId === 1)
                      .map((p) => (
                        <DemoRow
                          key={p.id}
                          title={"Receipt #" + p.id}
                          subtitle={
                            p.voided
                              ? "VOID · reversal preserved"
                              : p.method + " · externally recorded"
                          }
                          trailing={
                            <span className="font-black text-[#ffce8e]">
                              {demoCurrency(p.amount)}
                            </span>
                          }
                        />
                      ))}
                  </Panel>
                  <Panel title="Current membership" icon={CircleDollarSign}>
                    <p className="text-4xl font-black text-[#ffd39b] tabular-nums">
                      {demoCurrency(maya.due)}
                    </p>
                    <p className="mt-3 text-sm text-[#baa897]">
                      Outstanding recorded amount for your latest sample term.
                    </p>
                    <p className="mt-4 text-xs leading-6 text-[#aea095]">
                      No bank information, card number, staff notes or private Personal profile is
                      exposed.
                    </p>
                  </Panel>
                </div>
              )}
              {view === "my-sessions" && (
                <div className="grid gap-5 lg:grid-cols-2">
                  <Panel title="Your attendance log" icon={Activity}>
                    <Metric icon={Flame} label="Club visits" value={maya.visits} />
                    <div className="mt-5 space-y-3">
                      {Array.from({ length: Math.min(maya.visits, 5) }, (_, i) => (
                        <DemoRow
                          key={i}
                          title={"Session " + (maya.visits - i)}
                          subtitle={"Fictional arrival · " + (14 - i) + " Nov 2026"}
                          trailing={<BadgeCheck className="size-5 text-[#f9bf7f]" />}
                        />
                      ))}
                    </div>
                  </Panel>
                  <Panel title="Private member renewal" icon={CalendarClock}>
                    <p className="text-sm leading-7 text-[#c8b4a3]">
                      Request a renewal. Your club owner can resolve it without taking money through
                      ClubKeep.
                    </p>
                    <textarea
                      className={fieldClass + " mt-5 py-3"}
                      maxLength={300}
                      rows={3}
                      placeholder="A message for the club (optional)"
                      value={portalMessage}
                      onChange={(e) => setPortalMessage(e.target.value)}
                    />
                    <button
                      type="button"
                      className={mainButton + " mt-4"}
                      onClick={() => {
                        setData((d) => ({ ...d, renewalRequested: true }));
                        action("Private member renewal request submitted (fictional)");
                      }}
                    >
                      Request renewal
                    </button>
                  </Panel>
                </div>
              )}
              {view === "invites" && (
                <div className="grid gap-5 lg:grid-cols-2">
                  <Panel title="Private member invitations" icon={Link2}>
                    <p className="text-sm leading-7 text-[#c7b5a4]">
                      Each real invitation grants MEMBER access only, expires after seven days,
                      and is valid once. Only owners or managers issue them.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <DemoPill emphasis>Single-use</DemoPill>
                      <DemoPill>Member only</DemoPill>
                      <DemoPill>Seven days</DemoPill>
                    </div>
                    <button
                      type="button"
                      className={mainButton + " mt-6"}
                      onClick={() => {
                        setInvitesCreated((count) => count + 1);
                        setInviteRevoked(false);
                        action("One fictional invitation created; no real invitation token exists");
                      }}
                    >
                      <Plus className="size-4" /> Generate sample invitation
                    </button>
                    {invitesCreated > 0 && (
                      <div className="mt-6 rounded-2xl border border-[#ffc47e]/25 bg-[#2b2018] p-5">
                        <p className="text-xs font-black tracking-widest text-[#ffcd91] uppercase">
                          Preview · Invitation #{invitesCreated}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-[#cfb5a0]">
                          The live product reveals its secure invitation only once. This demo
                          intentionally does not manufacture a valid bearer token or shareable link.
                        </p>
                        <p className="mt-3"><DemoPill emphasis={!inviteRevoked}>
                          {inviteRevoked ? "Revoked" : "Unclaimed · Member"}
                        </DemoPill></p>
                        <button type="button" className={secondaryButton + " mt-4"}
                          disabled={inviteRevoked}
                          onClick={() => { setInviteRevoked(true); action("Fictional invitation revoked"); }}>
                          Revoke sample invitation
                        </button>
                      </div>
                    )}
                  </Panel>
                  <Panel title="Access boundaries" icon={ShieldCheck}>
                    <p className="text-sm leading-7 text-[#c7b5a4]">
                      The invite does not verify a phone number, merge an existing identity,
                      grant club management rights or unlock private health information.
                      Redemption is handled by a verified authenticated session.
                    </p>
                    <button type="button" className={secondaryButton + " mt-5"}
                      onClick={() => jump("members")}>Open member roster <ArrowRight className="size-4" /></button>
                  </Panel>
                </div>
              )}
              {view === "discover" && (
                <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
                  <Panel title="Discover approved clubs" icon={Search}>
                    <label htmlFor="demo-search-clubs" className="text-sm font-bold text-[#f9d7b7]">Search fictional clubs</label>
                    <input id="demo-search-clubs" type="search" maxLength={80}
                      value={discoverTerm} onChange={(event) => setDiscoverTerm(event.target.value)}
                      placeholder="Try gym, yoga, dance or a city" className={fieldClass} />
                    <div className="mt-5 space-y-2">
                      {[
                        {name:"Ironworks Athletic Club",city:"Bengaluru",type:"GYM"},
                        {name:"Harbor Yoga Circle",city:"Mumbai",type:"YOGA"},
                        {name:"The Movement Studio",city:"Jaipur",type:"DANCE"},
                        {name:"Summit Sports Academy",city:"Pune",type:"SPORTS"},
                      ].filter((club) => [club.name,club.city,club.type].join(" ").toLowerCase().includes(discoverTerm.trim().toLowerCase()))
                        .map((club) => <DemoRow key={club.name}
                          title={club.name} subtitle={club.city + " · " + club.type}
                          trailing={<DemoPill emphasis>Approved listing</DemoPill>} />)}
                    </div>
                  </Panel>
                  <Panel title="Publication, not automatic exposure" icon={Eye}>
                    <p className="text-sm leading-7 text-[#c8b5a4]">
                      ClubKeep only lists clubs after owners submit public profiles and platform
                      moderation approves them. Member rosters, payment ledgers and private
                      performance rankings are never part of the public directory.
                    </p>
                    <button className={secondaryButton + " mt-5"}
                      onClick={() => jump("profile")}>Preview public profile review</button>
                  </Panel>
                </div>
              )}
              {view === "account-security" && (
                <div className="grid gap-5 lg:grid-cols-2">
                  <Panel title="Identity protections" icon={KeyRound}>
                    <div className="space-y-3">
                      <DemoRow title="Verified email" subtitle="Required before private club mutations"
                        trailing={<DemoPill emphasis>Verified</DemoPill>} />
                      <DemoRow title="Passkey" subtitle="Optional device-backed authentication when enabled"
                        trailing={<DemoPill emphasis={demoPasskey}>{demoPasskey ? "Simulated enabled" : "Not enabled"}</DemoPill>} />
                      <DemoRow title="Existing password" subtitle="Legacy password sign-in remains available"
                        trailing={<DemoPill>Protected</DemoPill>} />
                      <DemoRow title="Session protection" subtitle="Server-verified sessions, exact-origin POST and abuse limiting"
                        trailing={<ShieldCheck className="size-5 text-[#ffc387]" />} />
                    </div>
                    <button className={mainButton + " mt-5"} type="button"
                      onClick={() => { setDemoPasskey(!demoPasskey); action(demoPasskey ? "Demo passkey removed" : "Demo passkey enabled; no WebAuthn ceremony occurred"); }}>
                      {demoPasskey ? "Disable sample passkey" : "Simulate adding a passkey"}
                    </button>
                  </Panel>
                  <Panel title="Protected live account" icon={ShieldCheck}>
                    <p className="text-sm leading-7 text-[#c6b4a4]">
                      Real passkey enrollment requires authenticated browser/device WebAuthn and
                      configured providers. This demonstration does not collect a password,
                      create a credential, call an authentication endpoint or replace session safeguards.
                    </p>
                    <Link href="/account/security" className={secondaryButton + " mt-5"}>
                      Open real account security (sign-in required) <ArrowRight className="size-4" />
                    </Link>
                  </Panel>
                </div>
              )}
              {view === "admin-directory" && (
                <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
                  <Panel title="Pending club revision" icon={ClipboardCheck}>
                    <DemoRow
                      title={data.clubName}
                      subtitle={data.city + " · " + data.vertical + " · owner-submitted profile"}
                      trailing={
                        <DemoPill emphasis={data.profileStatus === "PENDING"}>
                          {data.profileStatus}
                        </DemoPill>
                      }
                    />
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        className={mainButton}
                        onClick={() => {
                          setData((d) => ({ ...d, profileStatus: "APPROVED" }));
                          action("Public listing approved by fictional platform admin");
                        }}
                      >
                        <Check className="size-4" /> Approve listing
                      </button>
                      <button
                        className={secondaryButton}
                        onClick={() => {
                          setData((d) => ({ ...d, profileStatus: "HIDDEN" }));
                          action("Fictional listing hidden");
                        }}
                      >
                        <XCircle className="size-4" /> Hide listing
                      </button>
                    </div>
                  </Panel>
                  <Panel title="Platform vs club roles" icon={Crown}>
                    <p className="text-sm leading-7 text-[#cbb5a3]">
                      Global platform admins moderate submitted public content. They do not gain
                      access to all clubs&apos; members, finances or private athlete data. Use the
                      demo role switcher to preview separate authorized journeys safely.
                    </p>
                    <button
                      className={secondaryButton + " mt-5"}
                      onClick={() => navigate("owner", "overview")}
                    >
                      See owner workspace
                    </button>
                  </Panel>
                </div>
              )}
            </div>
            <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-7 text-xs text-[#a6988a]">
              <p>
                ClubKeep · Safe, fictional, resettable preview for UI reviews and customer
                discovery.
              </p>
              <Link
                href="/home"
                className="inline-flex items-center gap-2 font-bold text-[#ffc384]"
              >
                Your actual workspace <ArrowRight className="size-4" />
              </Link>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
