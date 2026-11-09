-- Synthetic fixture only; no actual user credential, phone or token.
INSERT INTO "user" (
  "id", "name", "email", "emailVerified", "phoneNumber", "role", "updatedAt"
) VALUES (
  'legacy-user-1', 'Legacy Member', 'legacy.member@example.invalid', true,
  '+919922334455', 'user', NOW()
);
INSERT INTO "account" (
  "id", "accountId", "providerId", "userId", "password", "updatedAt"
) VALUES (
  'legacy-account-1', 'legacy-user-1', 'credential', 'legacy-user-1',
  'fixture-password-not-a-real-hash', NOW()
);
INSERT INTO "session" (
  "id", "expiresAt", "token", "userId", "updatedAt"
) VALUES (
  'legacy-session-1', NOW() + INTERVAL '7 days',
  'fixture-session-not-a-real-token', 'legacy-user-1', NOW()
);
INSERT INTO "verification" (
  "id", "identifier", "value", "expiresAt", "updatedAt"
) VALUES (
  'legacy-verification-1', 'legacy@example.invalid', 'fixture-verification',
  NOW() + INTERVAL '1 day', NOW()
);
