import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { parseBootstrapArgs, readPasswordFromStdin } from "../../prisma/bootstrap-admin-helpers.mjs";

test("bootstrap canonicalizes email but does not accept secrets as arguments", () => {
  assert.deepEqual(
    parseBootstrapArgs(["--email", "  ADMIN@Example.COM ", "--name", "bababhayanak"]),
    { email: "admin@example.com", name: "bababhayanak", expectedDb: "clubkeep" },
  );
  assert.throws(() => parseBootstrapArgs(["--password", "in-argv"]), /Usage/);
  assert.throws(() => parseBootstrapArgs(["--email", "a@example.com", "--email", "b@example.com", "--name", "X"]), /Usage/);
  assert.throws(() => parseBootstrapArgs(["--email", "not-an-email", "--name", "X"]), /valid/);
  assert.throws(() => parseBootstrapArgs(["--email", "a@example.com", "--name", "X", "--expect-db", "menuminute"]), /ClubKeep/);
});

test("bootstrap accepts one piped line and rejects unsafe terminals and passwords", async () => {
  assert.equal(
    await readPasswordFromStdin(Readable.from([Buffer.from("synthetic-test-password\n")]), false),
    "synthetic-test-password",
  );
  await assert.rejects(() => readPasswordFromStdin(Readable.from([]), true), /echoed terminal/);
  await assert.rejects(() => readPasswordFromStdin(Readable.from(["short\n"]), false), /8–128/);
  await assert.rejects(() => readPasswordFromStdin(Readable.from(["firstline\nsecondline\n"]), false), /single line/);
});
