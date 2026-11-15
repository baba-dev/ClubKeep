"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { parseMinorMoney } from "@/lib/money-format";
import { ClubKeepBrand, ThemeArtwork } from "@/components/human-motion/media-components";
import { ClubThemeToggle } from "@/components/clubs/theme-toggle";
import { HM_MEDIA, heroForVertical } from "@/components/human-motion/media";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Building2,
  Dumbbell,
  Flower2,
  Music2,
  Trophy,
} from "lucide-react";

const steps = ["type", "details", "identity", "membership", "review"] as const;
type Step = (typeof steps)[number];
type Initial = {
  club: {
    id: string;
    name: string;
    vertical: string;
    timeZone: string;
    setupStatus: string;
    setupProgress: {
      countryCode: string | null;
      currencyCode: string | null;
      operatingMode: string | null;
      city: string | null;
      address: string | null;
      contactEmail: string | null;
      logoUrl: string | null;
      version: number;
    } | null;
  };
  plans: { id: string; name: string; currency: string }[];
};
const categories = [
  {
    value: "GYM",
    title: "Gym & Fitness",
    icon: Dumbbell,
    description: "Gyms, fitness studios and strength training",
  },
  {
    value: "YOGA",
    title: "Yoga & Wellness",
    icon: Flower2,
    description: "Yoga studios and wellness communities",
  },
  {
    value: "DANCE",
    title: "Dance Academy",
    icon: Music2,
    description: "Dance schools and movement academies",
  },
  {
    value: "SPORTS",
    title: "Sports Academy",
    icon: Trophy,
    description: "Sports clubs and athlete training",
  },
  {
    value: "OTHER",
    title: "General Club",
    icon: Building2,
    description: "Flexible clubs and community spaces",
  },
] as const;
export function SetupWizard({
  clubId,
  initial,
  initialStep,
}: {
  clubId: string;
  initial: Initial;
  initialStep: Step;
}) {
  const router = useRouter();
  const stepIndex = steps.indexOf(initialStep);
  const current = initial.club.setupProgress;
  const expectedVersion = current?.version ?? 0;
  const [vertical, setVertical] = useState(initial.club.vertical);
  const [country, setCountry] = useState(current?.countryCode || "");
  const [currency, setCurrency] = useState(current?.currencyCode || "");
  const [zone, setZone] = useState(initial.club.timeZone === "UTC" ? "" : initial.club.timeZone);
  const [mode, setMode] = useState(current?.operatingMode || "PHYSICAL");
  const [city, setCity] = useState(current?.city || "");
  const [address, setAddress] = useState(current?.address || "");
  const [email, setEmail] = useState(current?.contactEmail || "");
  const [logo, setLogo] = useState(current?.logoUrl || "");
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("MONTHS");
  const [count, setCount] = useState("1");
  const [price, setPrice] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState(initial.plans);
  const base = "/clubs/" + encodeURIComponent(clubId);
  function go(next: Step) {
    router.push(base + "/setup/" + next);
    router.refresh();
  }
  async function post(url: string, body: unknown, method = "POST") {
    const response = await fetch(url, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to save, please try again");
    return data;
  }
  async function onNext(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (initialStep === "type")
        await post(
          base.replace("/clubs/", "/api/clubs/") + "/setup",
          { step: "type", vertical, expectedVersion },
          "PATCH"
        );
      if (initialStep === "details")
        await post(
          "/api" + base + "/setup",
          {
            step: "details",
            expectedVersion,
            data: {
              countryCode: country.trim().toUpperCase(),
              currencyCode: currency.trim().toUpperCase(),
              operatingMode: mode,
              timeZone: zone.trim(),
              city,
              address,
              contactEmail: email,
            },
          },
          "PATCH"
        );
      if (initialStep === "identity")
        await post(
          "/api" + base + "/setup",
          { step: "identity", data: { logoUrl: logo }, expectedVersion },
          "PATCH"
        );
      if (initialStep === "membership" && plans.length === 0) {
        if (!name.trim()) throw new Error("Give your first plan a name");
        const minor = parseMinorMoney(price, currency || current?.currencyCode || "");
        if (minor === null) throw new Error("Enter a valid nonnegative price");
        const result = await post("/api" + base + "/setup/plan", {
          name: name.trim(),
          description: "",
          durationUnit: duration,
          durationCount: Number(count),
          priceMinor: minor,
          currency: currency || current?.currencyCode || "",
        });
        setPlans([...plans, { ...result.plan, currency: currency || current?.currencyCode || "" }]);
      }
      if (initialStep === "review") {
        await post("/api" + base + "/setup/complete", {});
        router.replace(base);
        router.refresh();
        return;
      }
      go(steps[stepIndex + 1]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to continue");
    } finally {
      setBusy(false);
    }
  }
  const btn = "hm-button hm-button-secondary disabled:opacity-50";
  const field = "hm-setup-field";
  const labels = [
    "Your club",
    "Club details",
    "Make it yours",
    "Membership plans",
    "Ready to launch",
  ];
  return (
    <div className="hm-app hm-onboarding">
      <div className="hm-setup-container">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ClubKeepBrand />
          <div className="flex items-center gap-3">
            <span className="hm-small">Step {stepIndex + 1} of 5</span>
            <ClubThemeToggle />
          </div>
        </div>
        <div className="hm-setup-progress mt-7" role="progressbar" aria-label="Club setup progress" aria-valuemin={1} aria-valuemax={5} aria-valuenow={stepIndex + 1}>
          {steps.map((s, i) => (
            <span
              key={s}
              data-completed={i < stepIndex}
              data-current={i === stepIndex}
            />
          ))}
        </div>
        <section className="hm-public-hero relative mt-9 overflow-hidden rounded-3xl border p-7 sm:p-10" style={{ borderColor: "var(--hm-line)", background: "var(--hm-raised)" }}>
          <ThemeArtwork pair={HM_MEDIA.illustrations.botanical} className="hm-gallery-art pointer-events-none absolute inset-0 opacity-30" />
          <div className="relative z-10 max-w-xl">
            <p className="hm-kicker hm-page-eyebrow">{initial.club.name} · Guided setup</p>
            <h1 className="hm-display mt-3 text-4xl sm:text-5xl">{labels[stepIndex]}</h1>
            <p className="hm-small mt-4 max-w-lg">Five clear steps to build your club. Each completed step is saved securely to your existing setup record.</p>
            <p className="hm-small mt-3">Next: {stepIndex < 4 ? labels[stepIndex + 1] : "Open your club workspace"}</p>
          </div>
        </section>
        <form
          onSubmit={onNext}
          className="hm-setup-form mt-7 space-y-5"
        >
          {initialStep === "type" && (
            <fieldset>
              <legend className="mb-4 font-semibold">What kind of club are you running?</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {categories.map((c) => (
                  <label key={c.value} className="hm-setup-category" data-selected={vertical === c.value}>
                    {heroForVertical(c.value) ? (
                      <ThemeArtwork pair={heroForVertical(c.value)!} className="hm-gallery-photo" />
                    ) : (
                      <ThemeArtwork pair={HM_MEDIA.illustrations.challengeLandscape} className="hm-gallery-art" />
                    )}
                    <div className="hm-setup-category-body">
                      <div className="flex items-start justify-between gap-3">
                        <span className="hm-category-icon"><c.icon className="size-5" aria-hidden="true" /></span>
                        <input type="radio" name="vertical" value={c.value} checked={vertical === c.value}
                          onChange={() => setVertical(c.value)} aria-label={c.title} />
                      </div>
                      <span className="mt-5 block font-semibold">{c.title}</span>
                      <p className="mt-2 text-xs leading-5">{c.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {initialStep === "details" && (
            <div className="space-y-4">
              <label className="block text-sm">
                Country code (ISO 2)
                <input
                  required
                  minLength={2}
                  maxLength={2}
                  placeholder="IN"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={field}
                />
              </label>
              <label className="block text-sm">
                Club currency (ISO 3)
                <input
                  required
                  minLength={3}
                  maxLength={3}
                  placeholder="INR"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={field}
                />
              </label>
              <label className="block text-sm">
                Timezone (IANA)
                <input
                  required
                  placeholder="Asia/Kolkata"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className={field}
                />
              </label>
              <label className="block text-sm">
                How do you operate?
                <select className={field} value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="PHYSICAL">In person</option>
                  <option value="HYBRID">In person and online</option>
                  <option value="ONLINE">Online</option>
                </select>
              </label>
              <label className="block text-sm">
                City (optional)
                <input
                  className={field}
                  maxLength={100}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Address (optional)
                <input
                  className={field}
                  maxLength={240}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Contact email (optional)
                <input
                  className={field}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            </div>
          )}
          {initialStep === "identity" && (
            <div className="space-y-4">
              <p className="text-sm leading-7 text-[var(--hm-muted)]">
                ClubKeep will use a tasteful initials logo until you add your own. Public listings
                are private until you request review.
              </p>
              <label className="block text-sm">
                Logo image HTTPS URL (optional)
                <input
                  className={field}
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  placeholder="https://…"
                  type="url"
                />
              </label>
            </div>
          )}
          {initialStep === "membership" && (
            <div className="space-y-4">
              {plans.length > 0 ? (
                <div className="hm-setup-note p-5">
                  <CheckCircle2 className="mb-2 size-6 text-[var(--hm-sage-deep)]" />
                  <p className="font-semibold">Membership plan ready</p>
                  <p className="hm-small mt-2">
                    {plans.map((p) => p.name).join(", ")}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-[var(--hm-muted)]">
                    Create one plan to launch. You can add more later, including free memberships.
                  </p>
                  <label className="block text-sm">
                    Plan name
                    <input
                      required
                      className={field}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Monthly membership"
                      maxLength={90}
                    />
                  </label>
                  <label className="block text-sm">
                    Duration
                    <select
                      className={field}
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    >
                      <option value="DAYS">Days</option>
                      <option value="WEEKS">Weeks</option>
                      <option value="MONTHS">Months</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    Duration count
                    <input
                      required
                      className={field}
                      type="number"
                      min={1}
                      max={1200}
                      value={count}
                      onChange={(e) => setCount(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    Plan price ({currency || current?.currencyCode || "your currency"})
                    <input
                      required
                      className={field}
                      type="number"
                      min={0}
                      max={1000000}
                      step="any"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </label>
                </>
              )}
            </div>
          )}
          {initialStep === "review" && (
            <div className="space-y-4">
              <CheckCircle2 className="size-10 text-[var(--hm-terracotta)]" />
              <h2 className="text-xl font-semibold">Almost there.</h2>
              <p className="text-sm leading-7 text-[var(--hm-muted)]">
                Your club is created, but operations remain locked until you launch. You can publish
                a public profile separately after launch.
              </p>
              <div className="hm-setup-note p-5 text-sm">
                <p>Club: {initial.club.name}</p>
                <p className="mt-2">Type: {initial.club.vertical}</p>
                <p className="mt-2">Membership plans: {plans.length}</p>
              </div>
            </div>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-200"
            >
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hm-line)] pt-5">
            <button
              type="button"
              disabled={stepIndex === 0 || busy}
              onClick={() => go(steps[stepIndex - 1])}
              className={btn}
            >
              <ArrowLeft className="mr-2 inline size-4" />
              Back
            </button>
            <button
              type="submit"
              disabled={busy}
              className="hm-button hm-button-primary"
            >
              {busy ? "Saving…" : initialStep === "review" ? "Launch my club" : "Save & continue"}
              <ArrowRight className="ml-2 inline size-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
