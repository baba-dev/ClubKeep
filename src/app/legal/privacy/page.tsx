import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import {
  LEGAL_SETTINGS,
  MINIMUM_ACCOUNT_AGE,
  OPERATOR_NAME,
  TERMS_PATH,
  validContact,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Notice · ClubKeep",
  robots: { index: false, follow: false },
};

export default function PrivacyNotice() {
  const contact = validContact(LEGAL_SETTINGS.contactEmail);
  return (
    <LegalPage
      title="Privacy Notice"
      intro={`ClubKeep is operated by ${OPERATOR_NAME} (“we”). ClubKeep helps gyms, studios, sports academies and clubs run their business. This notice explains what personal information ClubKeep handles and who can see it.`}
    >
      <LegalSection title="What we collect">
        <p>
          <strong>Your account.</strong> Your name and email address. If you sign in with Google, we
          ask Google only for your basic profile and email address. If you use a passkey, we store
          the passkey&apos;s public credential; your fingerprint or face data never leaves your
          device. We also keep your sign-in sessions, including the IP address and browser type they
          came from, so we can keep your account secure.
        </p>
        <p>
          <strong>Records a club keeps about you.</strong> When you join a club, its staff hold
          records about you in ClubKeep: your name, member number, join date, membership plans and
          dates, check-ins, fees the club has recorded as received, renewal requests and, only if
          you opt in, competition scores and rankings. A club may also enter a phone number for you.
          ClubKeep does not verify phone numbers and never uses one to sign you in.
        </p>
        <p>
          <strong>If you run a club.</strong> Your club&apos;s details, the staff and members you
          invite, and your ClubKeep subscription.
        </p>
        <p>
          <strong>Security records.</strong> Short-lived counters tied to IP addresses to stop
          abuse, and audit records of sensitive actions such as creating a club or changing a plan.
        </p>
      </LegalSection>

      <LegalSection title="What we do not do">
        <p>
          We do not send text messages or phone verification codes. We do not show advertising. We
          do not use third-party analytics or tracking tools in ClubKeep. We do not sell personal
          information.
        </p>
      </LegalSection>

      <LegalSection title="Cookies and browser storage">
        <p>
          A session cookie keeps you signed in. Your browser also remembers your light or dark theme
          choice and, while you accept a club invitation, the invitation link until you finish
          joining. We do not use advertising or tracking cookies.
        </p>
      </LegalSection>

      <LegalSection title="Who handles information for us">
        <p>
          Google, if you choose Google sign-in. Our own mail server, which sends email sign-in
          links. Razorpay (India) or Stripe (other countries), for club owners&apos; ClubKeep
          subscriptions: you pay on their secure pages and we never see your card details. The
          servers that host ClubKeep.
        </p>
      </LegalSection>

      <LegalSection title="Who can see your information">
        <p>
          A club can see only the records it holds about its own members. Other clubs cannot see
          them. A club&apos;s plan or subscription never gives it access to anything outside that
          club&apos;s own records. Information about members can be sensitive, so clubs should
          collect and share only what they need.
        </p>
      </LegalSection>

      <LegalSection title="Age">
        <p>ClubKeep is for people aged {MINIMUM_ACCOUNT_AGE} or older.</p>
      </LegalSection>

      {contact && (
        <LegalSection title="Questions and requests">
          <p>
            To ask about, correct or delete your information, or to ask anything about this notice,
            email <a href={`mailto:${contact}`}>{contact}</a>.
          </p>
        </LegalSection>
      )}

      <LegalSection title="Changes">
        <p>
          We may update this notice. The date above shows the latest version. Our{" "}
          <Link href={TERMS_PATH} className="underline underline-offset-4">
            Terms of Use
          </Link>{" "}
          also apply.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
