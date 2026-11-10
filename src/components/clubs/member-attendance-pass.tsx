"use client";

import { useEffect, useState } from "react";
import { Clock3, RefreshCw, ShieldCheck, WifiOff } from "lucide-react";
import { inviteQrMatrix } from "@/lib/invite-qr";

type Card = { token: string; refreshAt: number; memberName: string; memberNumber: number };
export function MemberAttendancePass({clubId}:{clubId:string}) {
  const [card,setCard]=useState<Card|null>(null);
  const [error,setError]=useState("");
  const [seconds,setSeconds]=useState(0);
  const [refreshing,setRefreshing]=useState(true);
  useEffect(()=>{
    let stopped=false;
    const load=async()=>{
      try{
        const result=await fetch(`/api/clubs/${clubId}/attendance/my-qr`,{cache:"no-store",credentials:"same-origin"});
        const data=(await result.json()) as Card & {error?:string};
        if(!result.ok)throw new Error(data.error||"Your attendance QR is unavailable");
        if(!stopped){setCard(data);setError("");}
      }catch(e){
        if(!stopped){setCard(null);setError(e instanceof Error?e.message:"QR is unavailable");}
      }finally{if(!stopped)setRefreshing(false);}
    };
    void load();
    // Frequent refresh avoids client clock skew and resumes a valid QR after a
    // delayed/background tab; the server is always the signature authority.
    const interval=window.setInterval(()=>{if(!document.hidden)void load();},15_000);
    const clock=window.setInterval(()=>{
      if(!stopped)setSeconds(s=>{
        // Set a new countdown using server QR expiry; the token is also
        // independently verified against server time at the reception desk.
        void s;
        return Math.ceil(((cardExpiry.current??0)-Date.now())/1000);
      });
    },1000);
    return ()=>{stopped=true;window.clearInterval(interval);window.clearInterval(clock);};
  },[clubId]);
  const cardExpiry = { current: card?.refreshAt };
  let qrPath="";
  if(card){
    try{
      const matrix=inviteQrMatrix(card.token);
      qrPath=matrix.map((row,y)=>row.map((dark,x)=>dark?`M${x+4} ${y+4}h1v1h-1z`:"").join("")).join("");
    }catch{qrPath="";}
  }
  return <section className="mx-auto mt-8 max-w-md overflow-hidden rounded-[2rem] border border-[#edb66b]/40 bg-gradient-to-b from-[#46301a] via-[#24170f] to-[#110c09] p-1 shadow-[0_24px_90px_rgba(0,0,0,.38)]">
    <div className="rounded-[1.8rem] border border-[#edb66b]/15 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,67,.16),transparent_55%)] px-6 pb-8 pt-8 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-[#f1c583]/25 bg-[#f1b966]/10 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-[#fbd49e]"><ShieldCheck className="size-4"/>ClubKeep · Live access</span>
      <h2 className="mt-6 text-2xl font-semibold tracking-tight">{card?.memberName??"Your member pass"}</h2>
      <p className="mt-2 text-sm text-[#cfb39a]">{card? `Member #${String(card.memberNumber).padStart(4,"0")}` : "Private rotating QR · every 30 seconds"}</p>
      <div className="mx-auto mt-7 flex min-h-64 w-full max-w-[280px] items-center justify-center rounded-[1.5rem] bg-white p-4 shadow-[0_15px_45px_rgba(0,0,0,.35)]">
        {card&&qrPath ? <svg role="img" aria-label="Your live attendance QR code" viewBox="0 0 53 53" className="aspect-square w-full max-w-[245px]" shapeRendering="crispEdges">
          <rect width="53" height="53" fill="#ffffff"/><path d={qrPath} fill="#121212"/>
        </svg> : <div className="flex flex-col items-center gap-3 px-5 text-center text-sm text-[#5a4a3a]">
          {error?<WifiOff className="size-10 text-[#b35f4f]"/>:<RefreshCw className="size-10 animate-spin text-[#bd8f55]"/>}
          <p>{error||"Preparing your private QR…"}</p>
        </div>}
      </div>
      <div aria-live="polite" className="mt-6 flex items-center justify-center gap-2 text-sm text-[#f7d39d]">
        <Clock3 className="size-4" />
        {card ? `QR refreshes automatically · ${Math.max(0,seconds)}s` : refreshing ? "Preparing your pass" : "Ask reception for assistance"}
      </div>
      <p className="mx-auto mt-4 max-w-xs text-xs leading-6 text-[#c6ac93]">Show this QR to authorized club staff at the front desk. Please don&apos;t share screenshots—codes expire quickly.</p>
    </div>
  </section>;
}
