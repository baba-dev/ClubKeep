"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, CameraOff, CheckCircle2, Keyboard, ScanLine, ShieldCheck } from "lucide-react";

type CheckInResult = {
  error?: string;
  duplicate?: boolean;
  member?: { displayName: string; memberNumber: number };
  localDate?: string;
  checkedInAt?: string;
};
type ScanFeedback = { tone: "success" | "warning" | "error"; title: string; detail: string } | null;
type Detector = { detect: (image: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorConstructor = new (args: { formats: string[] }) => Detector;

export function AttendanceScanner({ clubId }: { clubId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const busyRef = useRef(false);
  const recentlyScanned = useRef<{ token: string; until: number } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [working, setWorking] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [feedback, setFeedback] = useState<ScanFeedback>(null);
  const [cameraError, setCameraError] = useState("");

  const submit = useCallback(async (token: string) => {
    const value = token.trim();
    if (!value || value.length > 320 || busyRef.current) return;
    if (recentlyScanned.current?.token === value && recentlyScanned.current.until > Date.now())
      return;
    busyRef.current = true;
    setWorking(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/clubs/${clubId}/attendance/check-in`, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "QR", token: value }),
      });
      const body = (await response.json()) as CheckInResult;
      if (response.ok && body.member) {
        setFeedback({
          tone: "success",
          title: `Welcome, ${body.member.displayName}!`,
          detail: `Member #${String(body.member.memberNumber).padStart(4, "0")} · Check-in recorded.`,
        });
      } else {
        setFeedback({
          tone: response.status === 409 ? "warning" : "error",
          title: response.status === 409 ? "Check-in needs attention" : "Scan not accepted",
          detail: body.error || "Please try again or use manual check-in.",
        });
      }
    } catch {
      setFeedback({
        tone: "error",
        title: "Connection interrupted",
        detail: "No check-in confirmation was received. Check attendance history before retrying.",
      });
    } finally {
      recentlyScanned.current = { token: value, until: Date.now() + 8_000 };
      busyRef.current = false;
      setWorking(false);
      setManualToken("");
    }
  }, [clubId]);

  useEffect(() => {
    if (!scanning) return;
    let disposed = false;
    let stream: MediaStream | null = null;
    let frame = 0;
    let lastChecked = 0;
    const video = videoRef.current;
    const factory = (window as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
    if (!video || !factory || !navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => {
        if (!disposed) {
          setCameraError("Camera QR scanning is not supported by this browser. Use a USB/Bluetooth QR scanner below, or the member search.");
          setScanning(false);
        }
      });
      return () => { disposed = true; };
    }
    const detector = new factory({ formats: ["qr_code"] });
    let detecting = false;
    const loop = async (time: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(loop);
      if (time - lastChecked < 220 || detecting || busyRef.current || video.readyState < 2)
        return;
      lastChecked = time;
      detecting = true;
      try {
        const values = await detector.detect(video);
        const token = values.find(result => result.rawValue.startsWith("ck1."))?.rawValue;
        if (token && !disposed) void submit(token);
      } catch {
        // A temporarily unreadable camera frame is not an attendance error.
      } finally {
        detecting = false;
      }
    };
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 15, max: 24 } },
        });
        if (disposed) { stream.getTracks().forEach(track => track.stop()); return; }
        video.srcObject = stream;
        await video.play();
        if (!disposed) frame = requestAnimationFrame(loop);
      } catch {
        if (!disposed) {
          setCameraError("Camera unavailable or permission denied. Allow camera access in your browser, or use manual check-in.");
          setScanning(false);
        }
      }
    })();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach(track => track.stop());
      if (video) { video.pause(); video.srcObject = null; }
    };
  }, [scanning, submit]);

  function submitHardware(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(manualToken);
  }

  return (
    <section aria-label="QR check-in scanner" className="overflow-hidden rounded-[1.8rem] border border-[#f6dc9b]/20 bg-gradient-to-br from-[#2b1b10] via-[#1c130e] to-[#110c09] shadow-[0_25px_70px_rgba(0,0,0,.22)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f6dc9b]/10 px-5 py-5 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-[#ed9a41]/15 text-[#ffc687]"><ScanLine className="size-6" aria-hidden="true" /></span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[#fbf1e6]">Quick scan</h2>
            <p className="text-xs text-[#b99c81]">A fresh QR is shown on each member&apos;s phone</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#f2c486]/20 bg-[#f2c486]/5 px-3 py-2 text-xs text-[#e8c18c]">
          <ShieldCheck className="size-3.5" /> Signed &amp; short-lived
        </span>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[1.15fr_.85fr] lg:items-start lg:p-7">
        <div>
          <div className="relative aspect-[4/3] max-h-[460px] overflow-hidden rounded-[1.4rem] border border-[#ffc58b]/20 bg-[#070707]">
            <video ref={videoRef} autoPlay playsInline muted aria-label="Live QR camera view"
              className={`h-full w-full object-cover ${scanning ? "" : "opacity-0"}`} />
            {!scanning && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_center,rgba(244,124,29,.17),transparent_64%)] px-6 text-center">
              <span className="flex size-20 items-center justify-center rounded-3xl border border-[#ffba73]/30 bg-[#f26b00]/10">
                <Camera className="size-9 text-[#f6c27e]" />
              </span>
              <p className="max-w-xs text-sm leading-6 text-[#bea58d]">Position a member&apos;s rotating ClubKeep QR inside the frame to register their arrival.</p>
            </div>}
            {scanning && <div aria-hidden="true" className="pointer-events-none absolute inset-[13%] rounded-2xl border border-[#f7c079]/30">
              <span className="absolute left-0 top-0 h-9 w-9 rounded-tl-xl border-l-[3px] border-t-[3px] border-[#ffd296]"/>
              <span className="absolute right-0 top-0 h-9 w-9 rounded-tr-xl border-r-[3px] border-t-[3px] border-[#ffd296]"/>
              <span className="absolute bottom-0 left-0 h-9 w-9 rounded-bl-xl border-b-[3px] border-l-[3px] border-[#ffd296]"/>
              <span className="absolute bottom-0 right-0 h-9 w-9 rounded-br-xl border-b-[3px] border-r-[3px] border-[#ffd296]"/>
              <span className="absolute left-3 right-3 top-1/2 h-[2px] bg-gradient-to-r from-transparent via-[#ffb662]/65 to-transparent motion-safe:animate-pulse"/>
            </div>}
            <span className={`absolute bottom-3 left-3 rounded-full px-3 py-2 text-xs font-semibold backdrop-blur-md ${scanning ? "bg-emerald-900/70 text-emerald-200" : "bg-black/50 text-[#c7ac92]"}`}>
              {scanning ? working ? "Checking membership…" : "Camera ready · keep scanning" : "Camera is off"}
            </span>
          </div>
          <button type="button" onClick={() => { setCameraError(""); setScanning(value => !value); }}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f3c17a] to-[#f16d16] px-5 font-bold text-[#2b1709] transition-all hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffc783]">
            {scanning ? <CameraOff className="size-4" /> : <Camera className="size-4" />}
            {scanning ? "Stop camera" : "Start camera scanner"}
          </button>
          {cameraError && <p role="alert" className="mt-3 text-sm leading-6 text-[#f4bca1]">{cameraError}</p>}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-[#f6dc9b]/12 bg-[#100b08]/60 p-5">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#efbc7c]">Reception workflow</p>
            <ol className="mt-4 space-y-4 text-sm text-[#c6ad95]">
              <li className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f1ae57]/15 text-xs font-bold text-[#ffd096]">01</span>Open camera or connect your QR scanner.</li>
              <li className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f1ae57]/15 text-xs font-bold text-[#ffd096]">02</span>Ask the member to show their live QR.</li>
              <li className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f1ae57]/15 text-xs font-bold text-[#ffd096]">03</span>See an instant confirmation—no repeated entries.</li>
            </ol>
          </div>
          <form onSubmit={submitHardware} className="rounded-2xl border border-[#f6dc9b]/15 bg-[#17100b] p-5">
            <label htmlFor="attendance-hid" className="flex items-center gap-2 text-sm font-semibold text-[#f5d19b]"><Keyboard className="size-4"/>USB/Bluetooth QR scanner</label>
            <p className="mt-2 text-xs leading-5 text-[#ae9581]">Use a physical scanner that types a QR code and presses Enter. Scanned tokens are not stored in the browser.</p>
            <input id="attendance-hid" type="password" autoComplete="off" maxLength={320} value={manualToken}
              onChange={event => setManualToken(event.target.value)} placeholder="Scan token here" aria-label="QR scanner input"
              className="mt-4 min-h-12 w-full rounded-xl border border-[#f6dc9b]/20 bg-[#0d0806] px-4 text-sm text-[#f7debc] outline-none placeholder:text-[#756354] focus:border-[#f5b65f]" />
            <button disabled={working || !manualToken.trim()} type="submit" className="mt-3 min-h-11 w-full rounded-xl border border-[#d8aa70]/30 px-4 font-semibold text-[#f5c38f] hover:bg-[#362519] disabled:opacity-50">Check QR</button>
          </form>
          <div aria-live="polite" aria-atomic="true">
            {feedback ? <div className={`rounded-2xl border p-5 ${feedback.tone === "success" ? "border-emerald-500/35 bg-emerald-500/10" : feedback.tone === "warning" ? "border-amber-400/30 bg-amber-500/10" : "border-orange-500/30 bg-orange-500/10"}`}>
              <div className="flex items-center gap-2"><CheckCircle2 className={`size-5 ${feedback.tone === "success" ? "text-emerald-300" : "text-amber-300"}`} aria-hidden="true"/><p className="font-semibold">{feedback.title}</p></div>
              <p className="mt-2 text-sm leading-6 text-[#dcc8b3]">{feedback.detail}</p>
            </div> : <div className="rounded-2xl border border-dashed border-[#f6dc9b]/15 p-5 text-sm leading-6 text-[#ab967f]">The latest scan result appears here. A duplicate or expired membership is never recorded silently.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
