import assert from "node:assert/strict";
import test from "node:test";
import { MUSCLE_GROUPS } from "../../src/lib/personal/muscle-map.ts";
import {
  BACK_LINES,
  BACK_REGIONS,
  FRONT_LINES,
  FRONT_REGIONS,
} from "../../src/components/personal/body-map/body-paths.ts";

test("every muscle has a drawn region on exactly its own side", () => {
  for (const m of MUSCLE_GROUPS) {
    const own = m.side === "front" ? FRONT_REGIONS : BACK_REGIONS;
    const other = m.side === "front" ? BACK_REGIONS : FRONT_REGIONS;
    assert.ok(own[m.id]?.length > 0, `${m.id} has no ${m.side} region`);
    assert.equal(other[m.id], undefined, `${m.id} is drawn on the wrong side`);
  }
});

test("no region or line refers to an unknown muscle", () => {
  const ids = new Set(MUSCLE_GROUPS.map((m) => m.id));
  for (const group of [FRONT_REGIONS, BACK_REGIONS, FRONT_LINES, BACK_LINES]) {
    for (const id of Object.keys(group)) assert.ok(ids.has(id), `unknown muscle ${id}`);
  }
});

// Collects x coordinates of an absolute-command path: pairs are x,y; H is x only; V is y only.
function xCoordinates(d) {
  const xs = [];
  for (const [, cmd, args] of d.matchAll(/([MLCHVQZ])([^MLCHVQZ]*)/g)) {
    const nums = args.trim()
      ? args
          .trim()
          .split(/[\s,]+/)
          .map(Number)
      : [];
    if (cmd === "H") xs.push(...nums);
    else if (cmd !== "V") nums.forEach((n, i) => i % 2 === 0 && xs.push(n));
  }
  return xs;
}

test("path data is well formed and stays inside the left half of the viewBox", () => {
  for (const group of [FRONT_REGIONS, BACK_REGIONS]) {
    for (const paths of Object.values(group)) {
      for (const d of paths) {
        assert.match(d, /^M[\d\s.,CLVHQZ-]+$/i);
        const xs = xCoordinates(d);
        assert.ok(xs.length > 0 && xs.every(Number.isFinite), `unparseable path: ${d}`);
        assert.ok(
          xs.every((x) => x <= 100),
          `region crosses the centre line: ${d}`
        );
      }
    }
  }
});
