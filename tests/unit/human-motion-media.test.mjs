import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(process.cwd(), "public", "media", "human-motion");

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

function asset(relative) {
  const path = join(root, relative);
  assert.ok(existsSync(path), `Missing Human Motion media: ${relative}`);
  assert.ok(statSync(path).size > 100, `Suspiciously empty media: ${relative}`);
  return path;
}

test("Human Motion photo pairs are valid WebP with matching dimensions", () => {
  for (const name of pairs.filter((x) => x.startsWith("photography/"))) {
    let expected;
    for (const mode of ["light", "dark"]) {
      const buf = readFileSync(asset(`${name}-${mode}.webp`));
      assert.equal(buf.toString("ascii", 0, 4), "RIFF");
      assert.equal(buf.toString("ascii", 8, 12), "WEBP");
      assert.equal(buf.toString("ascii", 12, 16), "VP8X");
      const dimensions = [buf.readUIntLE(24, 3) + 1, buf.readUIntLE(27, 3) + 1].join("x");
      if (expected) assert.equal(dimensions, expected, `Light/dark size mismatch: ${name}`);
      expected = dimensions;
    }
  }
});

test("Human Motion decorative and achievement SVG pairs validate", () => {
  for (const name of pairs.filter((x) => !x.startsWith("photography/"))) {
    let expected;
    for (const mode of ["light", "dark"]) {
      const relative = `${name}-${mode}.svg`;
      const svg = readFileSync(asset(relative), "utf8");
      assert.match(svg, /<svg[\s>]/);
      const viewBox = svg.match(/\bviewBox="([^"]+)"/)?.[1];
      assert.ok(viewBox, `Missing SVG viewBox: ${relative}`);
      if (expected) assert.equal(viewBox, expected, `Light/dark SVG canvas mismatch: ${name}`);
      expected = viewBox;
      assert.doesNotMatch(svg, /<script\b|<foreignObject\b|onload\s*=|javascript:/i);
      const ids = new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
      for (const [, id] of svg.matchAll(/url\(#([^)]+)\)/g)) {
        assert.ok(ids.has(id), `Unresolved paint server ${id}: ${relative}`);
      }
    }
  }
});

test("ClubKeep brand files and gradient-safe achievement atlas are present", () => {
  for (const relative of [
    "brand/logos/clubkeep-logo-light.svg",
    "brand/logos/clubkeep-logo-dark.svg",
    "brand/logos/clubkeep-stacked-light.svg",
    "brand/logos/clubkeep-stacked-dark.svg",
    "brand/logos/clubkeep-mono-cocoa.svg",
    "brand/logos/clubkeep-mono-ivory.svg",
    "brand/icons/clubkeep-app-icon.svg",
  ]) assert.match(readFileSync(asset(relative), "utf8"), /<svg[\s>]/);
  const sprite = readFileSync(asset("achievements/achievement-sprite.svg"), "utf8");
  const ids = [...sprite.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, "Sprite gradient IDs must be unique");
  for (const [, id] of sprite.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(id), `Missing sprite gradient: ${id}`);
  assert.equal(existsSync(join(root, "achievements", "individual", "achievement-sprite.svg")), false);
  for (const folder of ["branding", "decorations", "medals", "metrics", "models", "concepts"]) {
    assert.equal(existsSync(join(process.cwd(), "src/components/human-motion", folder)), false,
      `Public media accidentally uploaded as React source: ${folder}`);
  }
});
