import type { Metadata } from "next";
import { JoinClubClient } from "@/components/clubs/join-club-client";

export const metadata: Metadata = {
  title: "Club invitation · ClubKeep",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function JoinPage() {
  return <JoinClubClient />;
}
