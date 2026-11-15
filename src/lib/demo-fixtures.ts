/** Fictional, in-memory showcase data. Never use production records or backend endpoints. */
export const DEMO_ROLES = ["owner", "manager", "staff", "member", "admin"] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];
export const DEMO_VIEWS = [
  "overview",
  "onboarding",
  "invites",
  "members",
  "plans",
  "attendance",
  "renewals",
  "finance",
  "competition",
  "leaderboard",
  "challenges",
  "profile",
  "settings",
  "discover",
  "account-security",
  "member-card",
  "my-payments",
  "my-sessions",
  "admin-directory",
] as const;
export type DemoView = (typeof DEMO_VIEWS)[number];
export const DEMO_NAV: { key: DemoView; label: string; section: string }[] = [
  { key: "overview", label: "Dashboard", section: "Club operations" },
  { key: "onboarding", label: "Club setup", section: "Club operations" },
  { key: "invites", label: "Member invitations", section: "Club operations" },
  { key: "members", label: "Members", section: "Club operations" },
  { key: "plans", label: "Membership plans", section: "Club operations" },
  { key: "attendance", label: "Check-in & QR", section: "Club operations" },
  { key: "renewals", label: "Renewals", section: "Club operations" },
  { key: "finance", label: "Finance & receipts", section: "Club operations" },
  { key: "competition", label: "Performance Studio", section: "Sports & engagement" },
  { key: "leaderboard", label: "Leaderboards", section: "Sports & engagement" },
  { key: "challenges", label: "Challenges", section: "Sports & engagement" },
  { key: "profile", label: "Public club profile", section: "Presence & administration" },
  { key: "settings", label: "Club settings", section: "Presence & administration" },
  { key: "discover", label: "Club discovery", section: "Presence & administration" },
  { key: "account-security", label: "Account security", section: "Presence & administration" },
  { key: "member-card", label: "My digital ID", section: "Member self-service" },
  { key: "my-payments", label: "My payments", section: "Member self-service" },
  { key: "my-sessions", label: "My sessions", section: "Member self-service" },
  { key: "admin-directory", label: "Directory moderation", section: "Platform administration" },
];

export type DemoMember = {
  id: number;
  name: string;
  plan: string;
  visits: number;
  due: number;
  active: boolean;
};
export type DemoPayment = {
  id: number;
  memberId: number;
  amount: number;
  method: "CASH" | "UPI" | "CARD";
  voided: boolean;
};
export type DemoScore = {
  id: number;
  memberId: number;
  metric: string;
  value: number;
  status: "APPROVED" | "PENDING" | "REJECTED";
};
export type DemoChallenge = {
  id: number;
  title: string;
  goal: number;
  progress: number;
  joined: boolean;
};
export type DemoState = {
  clubName: string;
  vertical: string;
  city: string;
  timezone: string;
  members: DemoMember[];
  payments: DemoPayment[];
  scores: DemoScore[];
  challenges: DemoChallenge[];
  plans: { name: string; amount: number; months: number }[];
  rankingOptIn: boolean;
  profileStatus: "PENDING" | "APPROVED" | "HIDDEN";
  renewalRequested: boolean;
  visitsToday: number;
};
export const initialDemo: DemoState = {
  clubName: "Ironworks Athletic Club",
  vertical: "GYM",
  city: "Bengaluru",
  timezone: "Asia/Kolkata",
  members: [
    { id: 1, name: "Maya Rao", plan: "Strength Pro", visits: 24, due: 600, active: true },
    { id: 2, name: "Arjun Mehta", plan: "Athlete Monthly", visits: 18, due: 0, active: true },
    { id: 3, name: "Leena Das", plan: "Strength Pro", visits: 11, due: 500, active: true },
    { id: 4, name: "Dev Shah", plan: "Athlete Monthly", visits: 8, due: 0, active: true },
  ],
  payments: [
    { id: 1001, memberId: 1, amount: 900, method: "UPI", voided: false },
    { id: 1002, memberId: 2, amount: 1500, method: "CARD", voided: false },
    { id: 1003, memberId: 3, amount: 1000, method: "CASH", voided: false },
  ],
  scores: [
    { id: 100, memberId: 1, metric: "Strength lift", value: 132, status: "APPROVED" },
    { id: 101, memberId: 2, metric: "Strength lift", value: 120, status: "APPROVED" },
    { id: 102, memberId: 3, metric: "Strength lift", value: 115, status: "APPROVED" },
    { id: 103, memberId: 4, metric: "Strength lift", value: 140, status: "PENDING" },
  ],
  challenges: [
    { id: 201, title: "12-session streak", goal: 12, progress: 8, joined: true },
    { id: 202, title: "Raise the bar", goal: 3, progress: 1, joined: false },
    { id: 203, title: "Show up strong", goal: 20, progress: 14, joined: true },
  ],
  plans: [
    { name: "Athlete Monthly", amount: 1500, months: 1 },
    { name: "Strength Pro", amount: 3000, months: 3 },
  ],
  rankingOptIn: true,
  profileStatus: "PENDING",
  renewalRequested: false,
  visitsToday: 16,
};

/** Three entirely fictional showroom presets; none reads live club or member records. */
export const DEMO_VERTICALS = ["GYM", "YOGA", "DANCE"] as const;
export type DemoVertical = (typeof DEMO_VERTICALS)[number];

const demoVerticalOverrides: Record<
  DemoVertical,
  Pick<
    DemoState,
    "clubName" | "vertical" | "city" | "members" | "scores" | "challenges" | "plans" | "visitsToday"
  >
> = {
  GYM: {
    clubName: initialDemo.clubName,
    vertical: "GYM",
    city: initialDemo.city,
    members: initialDemo.members,
    scores: initialDemo.scores,
    challenges: initialDemo.challenges,
    plans: initialDemo.plans,
    visitsToday: initialDemo.visitsToday,
  },
  YOGA: {
    clubName: "Mira Yoga Collective",
    vertical: "YOGA",
    city: "Mumbai",
    members: [
      { id: 1, name: "Ishita Verma", plan: "Studio Flow", visits: 28, due: 0, active: true },
      { id: 2, name: "Kavya Nair", plan: "Mindful Monthly", visits: 16, due: 850, active: true },
      { id: 3, name: "Ananya Shah", plan: "Studio Flow", visits: 12, due: 0, active: true },
      { id: 4, name: "Ritu Menon", plan: "Mindful Monthly", visits: 9, due: 600, active: true },
    ],
    scores: [
      { id: 100, memberId: 1, metric: "Flow practice", value: 27, status: "APPROVED" },
      { id: 101, memberId: 2, metric: "Flow practice", value: 23, status: "APPROVED" },
      { id: 102, memberId: 3, metric: "Flow practice", value: 18, status: "APPROVED" },
      { id: 103, memberId: 4, metric: "Flow practice", value: 20, status: "PENDING" },
    ],
    challenges: [
      { id: 201, title: "Show up for 12 sessions", goal: 12, progress: 8, joined: true },
      { id: 202, title: "Mindful month", goal: 15, progress: 0, joined: false },
      { id: 203, title: "Keep the flow", goal: 20, progress: 14, joined: true },
    ],
    plans: [
      { name: "Mindful Monthly", amount: 1600, months: 1 },
      { name: "Studio Flow", amount: 4200, months: 3 },
    ],
    visitsToday: 12,
  },
  DANCE: {
    clubName: "The Movement Studio",
    vertical: "DANCE",
    city: "Jaipur",
    members: [
      { id: 1, name: "Diya Kapoor", plan: "Dance Unlimited", visits: 31, due: 0, active: true },
      { id: 2, name: "Tara Singh", plan: "Rhythm Starter", visits: 17, due: 500, active: true },
      { id: 3, name: "Sara Mehta", plan: "Dance Unlimited", visits: 19, due: 0, active: true },
      { id: 4, name: "Neha Jain", plan: "Rhythm Starter", visits: 10, due: 900, active: true },
    ],
    scores: [
      { id: 100, memberId: 1, metric: "Routine", value: 94, status: "APPROVED" },
      { id: 101, memberId: 2, metric: "Routine", value: 81, status: "APPROVED" },
      { id: 102, memberId: 3, metric: "Routine", value: 89, status: "APPROVED" },
      { id: 103, memberId: 4, metric: "Routine", value: 92, status: "PENDING" },
    ],
    challenges: [
      { id: 201, title: "12 rehearsals", goal: 12, progress: 9, joined: true },
      { id: 202, title: "Choreography challenge", goal: 3, progress: 0, joined: false },
      { id: 203, title: "Step into the spotlight", goal: 20, progress: 15, joined: true },
    ],
    plans: [
      { name: "Rhythm Starter", amount: 1800, months: 1 },
      { name: "Dance Unlimited", amount: 4800, months: 3 },
    ],
    visitsToday: 18,
  },
};

export function demoFixture(vertical: DemoVertical): DemoState {
  // Structured cloning prevents simulated mutations from leaking between presets.
  return structuredClone({ ...initialDemo, ...demoVerticalOverrides[vertical] });
}

export function demoCurrency(amount: number): string {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
}
export function demoRoute(role: DemoRole, view: DemoView, vertical?: DemoVertical): string {
  const args = new URLSearchParams({ role, view });
  if (vertical) args.set("vertical", vertical);
  return "/demo?" + args.toString();
}
