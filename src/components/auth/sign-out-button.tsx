"use client";
import { authClient } from "@/lib/auth-client";
export function SignOutButton() {
  async function signOut() {
    await authClient.signOut();
    window.location.replace("/auth/sign-in");
  }
  return (
    <button
      onClick={signOut}
      className="rounded-full border border-[#f6dc9b]/25 px-4 py-2 hover:bg-[#211710]"
    >
      Sign out
    </button>
  );
}
