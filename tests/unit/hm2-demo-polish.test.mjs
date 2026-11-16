import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("demo has approved HM2 visual shell and theme-aware navigation", () => {
  const page = read("src/components/demo/demo-experience.tsx");
  assert.match(page, /Human Motion 2\.0 · Interactive Demo/);
  assert.match(page, /hm-demo-topbar/);
  assert.match(page, /hm-demo-stage/);
  assert.match(page, /hm-demo-sidebar/);
  assert.match(page, /hm-demo-nav-link/);
  assert.match(page, /aria-current=\{v === view \? "page" : undefined\}/);
  assert.doesNotMatch(page, /bg-gradient-to-r from-\[#f2bd72\] to-\[#ef8531\]/);
  assert.match(page, /ClubThemeToggle/);
});

test("demo uses approved artwork for owner and competition views", () => {
  const page = read("src/components/demo/demo-experience.tsx");
  for (const term of [
    "heroForVertical(presetVertical)",
    "HM_MEDIA.illustrations.heroFlow",
    "HM_MEDIA.illustrations.sidebarLandscape",
    "HM_MEDIA.illustrations.metrics.members",
    "HM_MEDIA.illustrations.metrics.attendance",
    "HM_MEDIA.illustrations.metrics.revenue",
    "HM_MEDIA.photography.challenge",
    "HM_MEDIA.illustrations.challengeLandscape",
  ]) {
    assert.ok(page.includes(term), "Missing artwork: " + term);
  }
  const css = read("src/app/human-motion-demo.css");
  assert.match(css, /hm-demo-competition-banner/);
  assert.match(css, /\.hm-demo-nav-link\[aria-current="page"\]/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(read("src/app/layout.tsx"), /human-motion-demo\.css/);
});

test("demo remains fictional and role + vertical selectors are intact", () => {
  const page = read("src/components/demo/demo-experience.tsx");
  assert.match(page, /DEMO_ROLES\.map/);
  assert.match(page, /DEMO_VERTICALS\.map/);
  assert.match(page, /selectDemoVertical/);
  assert.match(page, /No real user|no real user/);
});
