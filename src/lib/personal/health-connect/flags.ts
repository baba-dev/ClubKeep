import { OnboardingError } from "@/lib/club-onboarding";
import { assertWellnessEnabled } from "@/lib/personal/wellness-policy";

// A production activation requires BOTH independent feature gates.
// An unfinished native companion must never create a public fitness ingestion endpoint.
export function assertHealthConnectEnabled(): void {
  assertWellnessEnabled();
  if (process.env.PERSONAL_HEALTH_CONNECT_ENABLED !== "true") {
    throw new OnboardingError(503, "Health Connect sync is not enabled yet.");
  }
}
