import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import {
  LEGAL_SETTINGS,
  MINIMUM_ACCOUNT_AGE,
  OPERATOR_NAME,
  PRIVACY_PATH,
  validContact,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Use · ClubKeep",
  robots: { index: false, follow: false },
};

export default function TermsOfUse() {
  const contact = validContact(LEGAL_SETTINGS.contactEmail);
  return (
    <LegalPage
      title="Terms of Use"
      intro={`ClubKeep is operated by ${OPERATOR_NAME} (“we”). By using ClubKeep you agree to these Terms and to our Privacy Notice.`}
    >
      <LegalSection title="Who can use ClubKeep">
        <p>
          You must be {MINIMUM_ACCOUNT_AGE} or older. Each account belongs to one person. Keep your
          sign-in methods (your Google account, email, passkeys and any password) secure, and do not
          share your passkey or email sign-in links with anyone.
        </p>
      </LegalSection>

      <LegalSection title="Clubs and members">
        <p>
          ClubKeep is a tool that clubs use to run their business. Each club is responsible for the
          information it enters, for how it treats its members, and for the services it provides. We
          do not run clubs, and a club&apos;s membership terms are between you and that club.
        </p>
      </LegalSection>

      <LegalSection title="Fees paid to clubs">
        <p>
          ClubKeep lets a club record membership fees it has received, such as cash, UPI or card
          payments taken by the club. We do not collect, hold or refund those fees.
        </p>
      </LegalSection>

      <LegalSection title="Paid plans for club owners">
        <p>
          When paid plans are available, club owners can subscribe to a ClubKeep plan, billed
          monthly by Razorpay (India) or Stripe (other countries) at the price shown when you
          subscribe, plus tax where it applies. You can cancel at any time; a cancelled plan stays
          active until the end of the period you have paid for. If a renewal payment fails, the plan
          stays active for 7 days. After that the club returns to the Free plan and cannot add
          members beyond the Free limit. We do not delete a club&apos;s records because a plan has
          lapsed.
        </p>
      </LegalSection>

      <LegalSection title="Using ClubKeep properly">
        <p>
          Use ClubKeep lawfully and only for its purpose. Do not try to see another club&apos;s
          information, break or overload the service, or use it to harm others. We may suspend
          access to accounts that misuse ClubKeep.
        </p>
      </LegalSection>

      <LegalSection title="Availability and changes">
        <p>
          We work to keep ClubKeep available but cannot promise it will always run without
          interruption. Features and plans may change over time. See our{" "}
          <Link href={PRIVACY_PATH} className="underline underline-offset-4">
            Privacy Notice
          </Link>{" "}
          for how information is handled.
        </p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>These Terms are governed by the laws of India.</p>
      </LegalSection>

      {contact && (
        <LegalSection title="Contact">
          <p>
            Questions about these Terms: <a href={`mailto:${contact}`}>{contact}</a>.
          </p>
        </LegalSection>
      )}
    </LegalPage>
  );
}
