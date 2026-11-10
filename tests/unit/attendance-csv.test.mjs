import assert from "node:assert/strict";
import test from "node:test";
import { csvCell, attendanceToCsv } from "../../src/lib/attendance-csv.ts";

test("member-supplied names are CSV escaped and spreadsheet formulas are neutralized", () => {
  assert.equal(csvCell('Mary "Jane"'), '"Mary ""Jane"""');
  assert.equal(csvCell("=HYPERLINK(1)"), '"\'=HYPERLINK(1)"');
  assert.equal(csvCell(" +SUM(A1)"), '"\' +SUM(A1)"');
  assert.equal(csvCell("A\r\nB"), '"A B"');
  assert.equal(csvCell("Normal"), '"Normal"');
});

test("attendance export contains no phone or Personal health data", () => {
  const result = attendanceToCsv([
    {
      date: "2026-11-11",
      checkedInAt: "2026-11-11T10:00:00.000Z",
      memberNumber: 12,
      memberName: "=Bad",
      method: "QR",
      managerException: false,
    },
  ]);
  assert.ok(result.startsWith('"Club day","Checked in (UTC)"'));
  assert.ok(result.includes('"\'=Bad"'));
  assert.ok(!/phone|health|medical|contact/i.test(result));
  assert.ok(result.endsWith("\r\n"));
});
