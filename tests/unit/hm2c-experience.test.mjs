import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("HM2-C member shell keeps real navigation and theme access", () => {
  const shell = source("src/components/clubs/member-arena-shell.tsx");
  assert.match(shell, /ClubKeepBrand/);
  assert.match(shell, /ClubThemeToggle/);
  assert.match(shell, /hm-member-mobile-nav/);
  assert.match(shell, /aria-current/);
  assert.match(shell, /href="#member-content"/);
  for (const tab of ["arena", "play", "card", "visits", "fees", "renewal"])
    assert.ok(shell.includes('key: "' + tab + '"'));
});

test("achievement claims require joined, verified server progress, and target completion", () => {
  const badge = source("src/components/human-motion/verified-achievement.tsx");
  assert.match(badge, /joined && completed/);
  assert.match(badge, /joined && progress > 0 && !ended/);
  assert.match(badge, /"earned" \| "in-progress" \| "locked"/);
  assert.match(badge, /"APPROVED_SCORES"/);
  const route = source("src/app/clubs/[clubId]/my/challenges/page.tsx");
  assert.match(route, /myChallengeProgress\(prisma, clubId, member\.id/);
  assert.match(route, /ClubChallengeEntry|clubChallengeEntry/);
  assert.match(route, /awardState\(/);
  assert.match(route, /ChallengeJoinButton/);
  const member = source("src/app/clubs/[clubId]/my/page.tsx");
  assert.match(member, /snapshot\.visitCount >= 100/);
});

test("five-step onboarding retains versioning and existing API endpoints", () => {
  const wizard = source("src/components/clubs/setup-wizard.tsx");
  assert.match(wizard, /\["type", "details", "identity", "membership", "review"\]/);
  assert.match(wizard, /expectedVersion/);
  assert.match(wizard, /"PATCH"/);
  assert.match(wizard, /"\/setup\/plan"/);
  assert.match(wizard, /"\/setup\/complete"/);
  assert.match(wizard, /parseMinorMoney/);
  assert.match(wizard, /role="progressbar"/);
  assert.match(wizard, /heroForVertical\(c\.value\)/);
});

test("public routes use approved publication rules, not fictional member photography", () => {
  const search = source("src/app/discover/clubs/page.tsx");
  assert.match(search, /status: "LISTED"/);
  assert.match(search, /validatedPublic\(item\.published\)/);
  assert.match(search, /input\.q/);
  assert.match(search, /HM_MEDIA\.illustrations\.botanical/);
  assert.doesNotMatch(search, /HM_MEDIA\.photography/);
  const publicClub = source("src/app/c/[slug]/page.tsx");
  assert.match(publicClub, /\["LISTED", "UNLISTED"\]/);
  assert.match(publicClub, /validatedPublic\(club\.publicProfile\?\.published\)/);
  assert.match(publicClub, /robots:/);
  assert.doesNotMatch(publicClub, /HM_MEDIA\.photography/);
});

test("demo variants are isolated and all five roles remain available", () => {
  const fixtures = source("src/lib/demo-fixtures.ts");
  assert.match(fixtures, /DEMO_VERTICALS = \["GYM", "YOGA", "DANCE"\]/);
  assert.match(fixtures, /demoFixture\(vertical: DemoVertical\)/);
  assert.match(fixtures, /structuredClone\(/);
  assert.match(fixtures, /DEMO_ROLES = \["owner", "manager", "staff", "member", "admin"\]/);
  const app = source("src/components/demo/demo-experience.tsx");
  assert.match(app, /selectDemoVertical/);
  assert.match(app, /setData\(next\)/);
  assert.match(app, /demoRoute\(role, view, vertical\)/);
  assert.match(app, /Fictional \{presetVertical\.toLowerCase\(\)\}/);
  const page = source("src/app/demo/page.tsx");
  assert.match(page, /DEMO_VERTICALS\.find/);
});
