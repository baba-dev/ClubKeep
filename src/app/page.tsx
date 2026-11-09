"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { phoneOtpSendSchema, phoneOtpVerifySchema } from "@/lib/validations/auth";
import {
  CheckCircle2,
  Database,
  KeyRound,
  Layers,
  PhoneCall,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";

export default function Home() {
  const [phoneNumber, setPhoneNumber] = useState("+1234567890");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const result = phoneOtpSendSchema.safeParse({ phoneNumber });

    if (!result.success) {
      toast.error(result.error.issues[0]?.message || "Invalid phone number");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
      toast.success(`OTP sent to ${phoneNumber}! (Check server console in dev)`);
    }, 600);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const result = phoneOtpVerifySchema.safeParse({ phoneNumber, code: otpCode });

    if (!result.success) {
      toast.error(result.error.issues[0]?.message || "Invalid OTP code");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Phone verified successfully via Better Auth!");
      setStep("phone");
      setOtpCode("");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 antialiased selection:bg-neutral-800 selection:text-neutral-200">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-neutral-800/80 bg-neutral-950/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-white text-base font-black tracking-tight text-black shadow-md">
              CK
            </div>
            <div>
              <span className="font-semibold tracking-tight text-neutral-100">Clubkeep</span>
              <span className="ml-2 rounded-full border border-neutral-700/60 bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                Boilerplate
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-neutral-400 transition-colors hover:text-neutral-100"
            >
              Docs & Guides
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-6xl space-y-12 px-6 py-12 md:py-16">
        <section className="mx-auto max-w-3xl space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
            <Sparkles className="size-3.5 text-amber-400" />
            <span>Ready-to-build Next.js Application Stack</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-50 md:text-5xl">
            Production-Ready Next.js & React Boilerplate
          </h1>
          <p className="text-sm leading-relaxed text-neutral-400 md:text-base">
            Pre-configured with TypeScript, Tailwind CSS v4, shadcn/ui, Better Auth with phone OTP,
            Prisma ORM 7 with PostgreSQL, Redis cache, Docker Compose, Zod, Prettier, and Husky.
          </p>
        </section>

        {/* Feature Badges Grid */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {[
            { label: "Next.js 16", sub: "App Router" },
            { label: "Tailwind CSS v4", sub: "Modern Styling" },
            { label: "shadcn/ui", sub: "Radix/Base-UI" },
            { label: "Better Auth", sub: "Phone OTP Ready" },
            { label: "Prisma ORM 7", sub: "PostgreSQL" },
            { label: "Docker + Redis", sub: "Compose Ready" },
          ].map((item) => (
            <div
              key={item.label}
              className="space-y-1 rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-3.5 text-center transition-colors hover:border-neutral-700/80"
            >
              <p className="text-xs font-semibold text-neutral-200">{item.label}</p>
              <p className="text-[11px] text-neutral-500">{item.sub}</p>
            </div>
          ))}
        </section>

        {/* Interactive Demo + Architecture Details */}
        <div className="grid items-start gap-8 md:grid-cols-12">
          {/* Left Column: Interactive Phone OTP & Zod Demo */}
          <div className="space-y-4 md:col-span-6">
            <Card className="border-neutral-800 bg-neutral-900/70 text-neutral-100 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="size-4 text-emerald-400" />
                    <CardTitle className="text-base text-neutral-100">
                      Auth & Phone OTP Preview
                    </CardTitle>
                  </div>
                  <span className="rounded border border-emerald-800/60 bg-emerald-950/60 px-2 py-0.5 font-mono text-[11px] text-emerald-400">
                    Better Auth Plugin
                  </span>
                </div>
                <CardDescription className="text-xs text-neutral-400">
                  Test the built-in Zod validation schema and Better Auth OTP flow UI.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {step === "phone" ? (
                  <form onSubmit={handleSendOtp} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs text-neutral-300">
                        Mobile Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1234567890"
                        className="border-neutral-700 bg-neutral-950/60 font-mono text-sm text-neutral-100 placeholder:text-neutral-500"
                      />
                      <p className="text-[11px] text-neutral-500">
                        Include country code (e.g. +1, +44, +91). Validated via Zod.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-neutral-100 font-medium text-neutral-950 hover:bg-neutral-200"
                    >
                      {loading ? "Sending Code..." : "Send OTP Verification Code"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="otp" className="text-xs text-neutral-300">
                          6-Digit OTP Code
                        </Label>
                        <button
                          type="button"
                          onClick={() => setStep("phone")}
                          className="text-[11px] text-neutral-400 underline hover:text-neutral-200"
                        >
                          Change phone
                        </button>
                      </div>
                      <Input
                        id="otp"
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="123456"
                        className="border-neutral-700 bg-neutral-950/60 text-center font-mono text-base tracking-widest text-neutral-100"
                      />
                      <p className="text-center text-[11px] text-neutral-500">
                        In development mode, check your server terminal for logged OTP.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-600 font-medium text-neutral-50 hover:bg-emerald-500"
                    >
                      {loading ? "Verifying..." : "Confirm & Authenticate"}
                    </Button>
                  </form>
                )}
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t border-neutral-800 bg-neutral-950/40 text-[11px] text-neutral-400">
                <span>Configured in `src/lib/auth.ts`</span>
                <span>Zod schema in `src/lib/validations`</span>
              </CardFooter>
            </Card>

            {/* Quick Commands Card */}
            <Card className="border-neutral-800 bg-neutral-900/70 text-neutral-100">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="size-4 text-cyan-400" />
                  <CardTitle className="text-sm font-semibold text-neutral-200">
                    Essential Developer Scripts
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between rounded border border-neutral-800/80 bg-neutral-950 p-2">
                  <span className="text-neutral-300">docker compose up -d</span>
                  <span className="text-[11px] text-neutral-500">Start Postgres & Redis</span>
                </div>
                <div className="flex items-center justify-between rounded border border-neutral-800/80 bg-neutral-950 p-2">
                  <span className="text-neutral-300">npm run db:push</span>
                  <span className="text-[11px] text-neutral-500">Sync Prisma schema to DB</span>
                </div>
                <div className="flex items-center justify-between rounded border border-neutral-800/80 bg-neutral-950 p-2">
                  <span className="text-neutral-300">npm run db:studio</span>
                  <span className="text-[11px] text-neutral-500">Prisma database GUI</span>
                </div>
                <div className="flex items-center justify-between rounded border border-neutral-800/80 bg-neutral-950 p-2">
                  <span className="text-neutral-300">npm run format</span>
                  <span className="text-[11px] text-neutral-500">Prettier formatting</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Architecture & Stack Overview */}
          <div className="space-y-4 md:col-span-6">
            <Card className="border-neutral-800 bg-neutral-900/70 text-neutral-100">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-violet-400" />
                  <CardTitle className="text-sm font-semibold text-neutral-200">
                    Boilerplate Architecture & Modules
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-neutral-400">
                  Clean directory structure with modular configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-start gap-3 rounded-lg border border-neutral-800/60 bg-neutral-950/50 p-2.5">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                  <div>
                    <p className="font-medium text-neutral-200">Authentication (`better-auth`)</p>
                    <p className="text-[11px] text-neutral-400">
                      Configured in `src/lib/auth.ts` with PostgreSQL Prisma adapter,
                      email/password, and phone OTP plugin. API route at `/api/auth/[...all]`.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-neutral-800/60 bg-neutral-950/50 p-2.5">
                  <Database className="mt-0.5 size-4 shrink-0 text-cyan-400" />
                  <div>
                    <p className="font-medium text-neutral-200">Database & ORM (`prisma`)</p>
                    <p className="text-[11px] text-neutral-400">
                      PostgreSQL schema in `prisma/schema.prisma` with User, Session, Account, and
                      Verification models. Prisma Client singleton at `src/lib/prisma.ts`.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-neutral-800/60 bg-neutral-950/50 p-2.5">
                  <Server className="mt-0.5 size-4 shrink-0 text-rose-400" />
                  <div>
                    <p className="font-medium text-neutral-200">Cache & Messaging (`ioredis`)</p>
                    <p className="text-[11px] text-neutral-400">
                      Redis client singleton with connection pooling and error resilience in
                      `src/lib/redis.ts`.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-neutral-800/60 bg-neutral-950/50 p-2.5">
                  <KeyRound className="mt-0.5 size-4 shrink-0 text-amber-400" />
                  <div>
                    <p className="font-medium text-neutral-200">Validation (`zod`)</p>
                    <p className="text-[11px] text-neutral-400">
                      Strong schema definitions for login, registration, and phone OTP in
                      `src/lib/validations/auth.ts`.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-neutral-800/60 bg-neutral-950/50 p-2.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-400" />
                  <div>
                    <p className="font-medium text-neutral-200">Git Hooks & Quality</p>
                    <p className="text-[11px] text-neutral-400">
                      Husky + lint-staged runs ESLint fix and Prettier format automatically on every
                      git commit.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
