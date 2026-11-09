// Fictional demo content. No real people, numbers or contact details.

export const club = { name: "Ironworks Gym", city: "Bengaluru" };

export const member = {
  name: "Priya Nair",
  id: "CK-0042",
  plan: "Quarterly Strength",
  expiry: "31 Mar 2027",
  phone: "+91 98••• ••210",
};

/** Money is stored as integer minor units (paise) and formatted for display only. */
export const stats = {
  active: 184,
  checkinsToday: 62,
  duesMinor: 2_450_000,
  renewals: 17,
};

export const weekly = [38, 52, 44, 61, 58, 72, 66];

export const leaderboard = [
  { rank: 1, name: "Priya Nair", score: 142.5, delta: "+5.0", status: "approved" },
  { rank: 2, name: "Aarav Mehta", score: 137.5, delta: "+2.5", status: "approved" },
  { rank: 3, name: "Rohan Kulkarni", score: 130, delta: "+7.5", status: "approved" },
  { rank: 4, name: "Sara Khan", score: 122.5, delta: "+0.0", status: "approved" },
  { rank: 5, name: "Dev Patel", score: 117.5, delta: "+10.0", status: "approved" },
  { rank: 6, name: "Meera Iyer", score: 145, delta: "new", status: "pending" },
] as const;

export const plans = [
  {
    name: "Starter",
    price: "₹299",
    note: "or $5 / month",
    blurb: "For a single small gym getting started.",
    items: ["Up to 75 active members", "QR + manual check-in", "ID cards", "Club leaderboard"],
    featured: false,
  },
  {
    name: "Growth",
    price: "₹749",
    note: "or $15 / month",
    blurb: "For clubs that are growing fast.",
    items: [
      "Up to 300 active members",
      "GPS check-in",
      "City leaderboards",
      "WhatsApp AI, 50 a day",
    ],
    featured: true,
  },
  {
    name: "Pro",
    price: "₹1,799",
    note: "or $25 / month",
    blurb: "For multi-location operators.",
    items: ["Unlimited members", "Multi-location", "Data export API", "WhatsApp AI, 200 a day"],
    featured: false,
  },
];

export const ticker = [
  "QR check-in",
  "Dues ledger",
  "Season leaderboards",
  "Digital ID cards",
  "Renewal reminders",
  "One-tap approvals",
];

export function formatInr(minor: number) {
  return `₹${new Intl.NumberFormat("en-IN").format(minor / 100)}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}
