import Link from "next/link";
import { ArrowUpRight, LockKeyhole, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 py-16 text-neutral-100">
      <div className="w-full max-w-xl space-y-7 rounded-3xl border border-neutral-800 bg-neutral-900/70 p-8 shadow-2xl sm:p-12">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-12 items-center justify-center rounded-xl bg-amber-500 font-extrabold text-black">
            CK
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ClubKeep</h1>
            <p className="text-xs font-medium tracking-wide text-amber-400 uppercase">
              Foundation in progress
            </p>
          </div>
        </div>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          One account. Your club and your personal progress.
        </h2>
        <p className="text-base leading-7 text-neutral-300">
          Secure Google, passkey, and email-link sign-in is being prepared.
          Registration is not available yet. Phone OTP has been intentionally disabled.
        </p>
        <div className="flex items-start gap-3 rounded-xl border border-neutral-700/70 bg-neutral-800/60 p-4">
          <LockKeyhole aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-400" />
          <p className="text-sm leading-6 text-neutral-300">
            This is a development holding page, not a sign-in form. No verification
            or account creation happens here.
          </p>
        </div>
        <Link
          href="/design/luxe"
          className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 px-5 py-3 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-500/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400"
        >
          <Sparkles aria-hidden="true" className="size-4" />
          Explore approved Luxe design
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </main>
  );
}
