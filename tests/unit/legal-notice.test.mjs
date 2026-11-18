import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  LEGAL_LAST_UPDATED,
  LEGAL_SETTINGS,
  MINIMUM_ACCOUNT_AGE,
  OPERATOR_NAME,
  PRIVACY_PATH,
  TERMS_PATH,
  formatLegalDate,
  validContact,
} from "../../src/lib/legal.ts";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");
const form = source("src/components/auth/sign-in-form.tsx");
const terms = source("src/app/legal/terms/page.tsx");
const privacy = source("src/app/legal/privacy/page.tsx");
const shell = source("src/components/legal/legal-page.tsx");
const checklist = source("docs/LEGAL_DRAFTS.md");

test("owner decisions are encoded in one place", () => {
  assert.equal(MINIMUM_ACCOUNT_AGE, 13);
  assert.equal(OPERATOR_NAME, "BabaBuilds");
  assert.equal(TERMS_PATH, "/legal/terms");
  assert.equal(PRIVACY_PATH, "/legal/privacy");
  assert.match(LEGAL_LAST_UPDATED, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(formatLegalDate("2026-11-18"), "18 November 2026");
});

test("the contact address is never invented and is validated before it is shown", () => {
  assert.equal(LEGAL_SETTINGS.contactEmail, null, "no address supplied yet; do not make one up");
  assert.equal(validContact(null), null);
  assert.equal(validContact("  privacy@example.org "), "privacy@example.org");
  for (const bad of [
    "",
    "nope",
    "a@b",
    "a b@c.org",
    '"><script>@x.io',
    "x@y.z",
    "a@b.c".repeat(60),
  ]) {
    assert.equal(validContact(bad), null, bad);
  }
});

test("the sign-in notice asks for agreement, states the age from the constant, and links both pages", () => {
  assert.match(form, /from "@\/lib\/legal"/);
  assert.match(form, /By continuing you agree to the/);
  assert.match(form, /href=\{TERMS_PATH\}/);
  assert.match(form, /href=\{PRIVACY_PATH\}/);
  assert.match(form, /\{MINIMUM_ACCOUNT_AGE\} or older/);
  assert.doesNotMatch(form, /\b13\b/, "the age must come from MINIMUM_ACCOUNT_AGE, not a literal");
});

test("the notice is read before any sign-in method", () => {
  const notice = form.indexOf("By continuing you agree to the");
  assert.ok(notice > 0);
  for (const marker of ["onClick={google}", "onClick={emailLink}", "<form"]) {
    const at = form.indexOf(marker);
    assert.ok(at === -1 || at > notice, marker + " must come after the notice");
  }
});

test("both pages exist, state the same age and operator, and are not indexed", () => {
  for (const page of [terms, privacy]) {
    assert.match(page, /MINIMUM_ACCOUNT_AGE/);
    assert.match(page, /robots: \{ index: false/);
    assert.match(page, /LegalPage/);
  }
  assert.match(terms, /OPERATOR_NAME/);
  assert.match(privacy, /OPERATOR_NAME/);
  assert.match(terms, /governed by the laws of India/);
  assert.doesNotMatch(
    terms,
    /court|arbitrat|jurisdiction/i,
    "no courts or arbitration are invented"
  );
});

test("the pages carry no draft banner or placeholder text, as the owner asked", () => {
  for (const text of [terms, privacy, shell]) {
    assert.doesNotMatch(text, /TODO|TBD|lorem|\[To be completed|placeholder|draft/i);
  }
});

test("the pages claim no legal compliance and promise no unbuilt feature", () => {
  for (const text of [terms, privacy]) {
    assert.doesNotMatch(text, /DPDP|GDPR|COPPA|CCPA|HIPAA|compl(y|ies|iant|iance)\b/i);
    assert.doesNotMatch(text, /export your (data|information)|download your (data|information)/i);
    assert.doesNotMatch(text, /delete your account (automatically|instantly|yourself)/i);
    assert.doesNotMatch(
      text,
      /liab|warrant|indemn/i,
      "liability terms are for a lawyer, see LEGAL_DRAFTS.md"
    );
  }
});

test("contact lines appear only when a valid address is set", () => {
  for (const page of [terms, privacy]) {
    assert.match(page, /validContact\(LEGAL_SETTINGS\.contactEmail\)/);
    assert.match(page, /\{contact && \(/);
    assert.doesNotMatch(
      page,
      /@[a-z0-9-]+\.[a-z]{2,}/i,
      "no email address may be hard-coded in a page"
    );
  }
});

test("the privacy notice's 'no analytics or advertising' claim stays true", () => {
  assert.match(privacy, /do not show advertising/);
  assert.match(privacy, /do not use third-party analytics/);
  const pkg = JSON.parse(source("package.json"));
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  const forbidden =
    /analytics|gtag|gtm|google-tag|posthog|sentry|mixpanel|segment|hotjar|plausible|fullstory|amplitude|adsense|third-parties|speed-insights/i;
  assert.deepEqual(
    deps.filter((name) => forbidden.test(name)),
    [],
    "an analytics or ads package was added"
  );
});

test("no analytics or advertising code exists in the application source", async () => {
  const { execFileSync } = await import("node:child_process");
  const files = execFileSync("git", ["ls-files", "src", "--", ":!src/generated"], {
    encoding: "utf8",
  })
    .split("\n")
    .filter(
      (f) =>
        /\.(ts|tsx|js|jsx|html)$/.test(f) &&
        !f.startsWith("src/generated/") &&
        !f.startsWith("src/app/legal/")
    );
  const offenders = files.filter((f) =>
    /googletagmanager|google-analytics|adsbygoogle|gtag\(|fbq\(|posthog\.|plausible\.io|hotjar|fullstory/i.test(
      source(f)
    )
  );
  assert.deepEqual(offenders, []);
});

test("every deliberately omitted clause is listed for review", () => {
  for (const heading of [
    "Liability and warranties",
    "Disputes",
    "Termination",
    "Data retention",
    "Access, correction, deletion and export",
    "Children and under-18s",
    "International transfers",
    "Processors",
    "Owner action: contact address",
  ]) {
    assert.ok(checklist.includes(heading), heading);
  }
  assert.match(checklist, /LEGAL_LAST_UPDATED/);
});
