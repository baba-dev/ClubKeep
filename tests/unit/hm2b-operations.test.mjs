import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const route = (segment) => read(`src/app/clubs/[clubId]/${segment}/page.tsx`);

test("HM2-B keeps all seven operational routes inside the existing BusinessShell", () => {
  for (const name of [
    "members",
    "plans",
    "attendance",
    "renewals",
    "finance",
    "competition",
    "settings",
  ]) {
    assert.match(route(name), /<BusinessShell/);
    assert.match(route(name), /requireSession|requireClubRole|requireClubActive/);
  }
});

test("attendance keeps the scanner ahead of secondary metrics, with manual and live feed intact", () => {
  const file = route("attendance");
  const scanner = file.indexOf("<AttendanceScanner");
  assert.ok(scanner > 0 && scanner < file.indexOf("hm-ops-stats"));
  assert.match(file, /<ManualCheckIn/);
  assert.match(file, /<AttendanceTodayFeed/);
  assert.match(file, /<AttendanceLive/);
});

test("member search, editable plans and archive are not replaced by decorative cards", () => {
  const members = route("members");
  assert.match(members, /searchParams/);
  assert.match(members, /name="q"/);
  assert.match(members, /aria-current/);
  assert.match(members, /member\.statusLabel/);
  const studio = read("src/components/clubs/plan-studio.tsx");
  assert.match(studio, /activePlans\.map/);
  assert.match(studio, /archivedPlans\.map/);
  assert.match(studio, /function save/);
  assert.match(studio, /function archive/);
});

test("financial charts use true per-currency series and existing authorized queries", () => {
  const finance = route("finance");
  assert.match(
    finance,
    /requireClubActive\(prisma, session\.user\.id, clubId, \["OWNER", "MANAGER"\]\)/
  );
  assert.match(finance, /financeMonthlyTrend/);
  assert.match(finance, /<CollectionsTrend entries=\{trend\}/);
  const chart = read("src/components/human-motion/collections-trend.tsx");
  assert.match(chart, /Map<string/);
  assert.match(chart, /byCurrency\.entries\(\)/);
  assert.match(chart, /formatMinorMoney/);
});

test("competition moderation and owner-only settings remain enforced", () => {
  assert.match(route("competition"), /<SeasonCreateForm/);
  assert.match(route("competition"), /<ChallengeCreateForm/);
  assert.match(route("competition"), /competition\/review/);
  const settings = route("settings");
  assert.match(settings, /requireClubRole\(prisma, session\.user\.id, clubId, \["OWNER"\]\)/);
  assert.match(settings, /publicProfile: \{ select: \{ status: true \} \}/);
});
