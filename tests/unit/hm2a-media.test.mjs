import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const root = process.cwd();
const media = join(root, "public/media/human-motion");
const get = (file) => readFileSync(join(root, file), "utf8");

test("HM2-A keeps each owner hero and illustration mode pair in the media library", () => {
  const pairs = [
    "photography/heroes/yoga/owner-yoga",
    "photography/heroes/gym/owner-gym",
    "photography/heroes/dance/owner-dance",
    "photography/community/community-spotlight",
    "photography/challenges/challenge-banner",
    "photography/lifestyle/studio-conversation",
    "illustrations/hero-flow/hero-flow",
    "illustrations/landscape-layers/landscape-layers",
    "illustrations/challenge-landscape/challenge-landscape",
    "illustrations/botanical-detail/botanical-detail",
    "illustrations/botanical-detail/botanical-detail-corner",
    "illustrations/metric-waves/metric-members",
    "illustrations/metric-waves/metric-attendance",
    "illustrations/metric-waves/metric-memberships",
    "illustrations/metric-waves/metric-revenue",
    "achievements/individual/achievement-medal",
    "achievements/individual/milestone-badge",
    "achievements/individual/challenge-trophy",
    "achievements/individual/streak-badge",
  ];
  for (const entry of pairs) {
    const extension = entry.startsWith("photography/") ? "webp" : "svg";
    for (const mode of ["light", "dark"]) {
      assert.ok(
        existsSync(join(media, entry + "-" + mode + "." + extension)),
        "Missing approved asset: " + entry + " " + mode
      );
    }
  }
});
test("HM2-A lists all media families and has no non-tenant aggregate queries", () => {
  const manifest = get("src/components/human-motion/media.ts");
  for (const key of ["branding", "heroes", "photography", "illustrations", "achievements"])
    assert.ok(manifest.includes(key));
  const projection = get("src/lib/owner-dashboard.ts");
  assert.match(projection, /clubId/);
  assert.match(projection, /clubLocalDate/);
  assert.match(projection, /COUNT\(DISTINCT/);
  assert.match(projection, /ClubPaymentReversal/);
  assert.match(projection, /canSeeFinance/);
  assert.match(projection, /timeZone/);
});
test("HM2-A retains member operations, accessible navigation and motion controls", () => {
  const page = get("src/app/clubs/[clubId]/page.tsx");
  assert.match(page, /ClubManager/);
  assert.match(page, /requireActiveClubMembership/);
  assert.match(page, /OwnerHero/);
  assert.match(page, /OwnerMetrics/);
  assert.match(page, /OwnerEditorial/);
  const shell = get("src/components/clubs/business-shell.tsx");
  assert.match(shell, /aria-label="Mobile club navigation"/);
  assert.match(shell, /aria-current/);
  const css = get("src/app/human-motion-motion.css");
  assert.match(css, /prefers-reduced-motion: reduce/);
  const theme = get("src/components/human-motion/theme-provider.tsx");
  assert.match(theme, /storageKey="ck-theme"/);
});
