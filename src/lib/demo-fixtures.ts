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
export function demoCurrency(amount: number): string {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
}
export function demoRoute(role: DemoRole, view: DemoView): string {
  return "/demo?role=" + encodeURIComponent(role) + "&view=" + encodeURIComponent(view);
}
