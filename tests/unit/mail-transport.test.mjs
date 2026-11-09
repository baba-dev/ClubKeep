import assert from "node:assert/strict";
import test from "node:test";
import {
  confirmationLink,
  mailInABoxTransportOptions,
  sendMagicLinkEmail,
} from "../../src/lib/mail-transport.ts";

const config = {
  origin: "https://clubkeep.example.test",
  features: { google: false, emailLink: true, passkey: false, legacyPassword: true },
  smtp: {
    host: "mx.bababuilds.com",
    port: 587,
    user: "sender@example.test",
    password: "test-fixture-not-real",
    from: "sender@example.test",
  },
};

test("transport mandates verified STARTTLS on the owner's Mail-in-a-Box", () => {
  const smtp = mailInABoxTransportOptions(config);
  assert.equal(smtp.host, "mx.bababuilds.com");
  assert.equal(smtp.port, 587);
  assert.equal(smtp.secure, false);
  assert.equal(smtp.requireTLS, true);
  assert.equal(smtp.tls.rejectUnauthorized, true);
  assert.equal(smtp.tls.servername, "mx.bababuilds.com");
  assert.equal(smtp.logger, false);
});

test("scanner GET never receives the magic token because it is in the fragment", () => {
  const token = "TEST_TOKEN_abcdefghijklmnopqrstuvwxyz12345";
  const url = new URL(confirmationLink(config.origin, token));
  assert.equal(url.search, "");
  assert.equal(url.pathname, "/auth/confirm");
  assert.equal(url.hash, "#token=" + token);
  assert.throws(() => confirmationLink(config.origin, "<script>"), /Invalid magic link token/);
});

test("email is created from verified internal origin, without third-party SMTP", async () => {
  const sent = [];
  const sender = {
    sendMail: async (mail) => {
      sent.push(mail);
    },
  };
  await sendMagicLinkEmail("recipient@example.test", "abcdef0123456789abcdefgh", config, sender);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].from, "sender@example.test");
  assert.ok(sent[0].text.includes("https://clubkeep.example.test/auth/confirm#token="));
  assert.ok(sent[0].html.includes("Continue to ClubKeep"));
});

test("SMTP delivery errors are redacted", async () => {
  await assert.rejects(
    () =>
      sendMagicLinkEmail("recipient@example.test", "abcdef0123456789abcdefgh", config, {
        async sendMail() {
          throw new Error("535 Bad auth: secret=do-not-expose");
        },
      }),
    (e) => e.message === "AUTH_EMAIL_DELIVERY_UNAVAILABLE"
  );
});

test("incomplete SMTP configuration never sends", async () => {
  await assert.rejects(
    () =>
      sendMagicLinkEmail("recipient@example.test", "abcdef0123456789abcdefgh", {
        origin: config.origin,
        features: { ...config.features, emailLink: false },
      }),
    /not configured/
  );
});
