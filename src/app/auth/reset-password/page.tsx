import type { Metadata } from "next";
import { publicAuthFeatures } from "@/lib/auth-config";
import { PasswordRecovery } from "@/components/auth/password-recovery";

export const metadata: Metadata = {
  title: "Password recovery · ClubKeep",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function PasswordRecoveryPage() {
  return <PasswordRecovery enabled={publicAuthFeatures().passwordReset} />;
}
