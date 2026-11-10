"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe2, Settings2 } from "lucide-react";

const suggestions=["UTC","Asia/Kolkata","Asia/Dubai","Asia/Muscat","Asia/Singapore","Asia/Tokyo","Europe/London","Europe/Berlin","America/New_York","America/Los_Angeles","Australia/Sydney"];
export function AttendanceTimeZoneSetting({clubId,timeZone}:{clubId:string;timeZone:string}){
  const router=useRouter();
  const [value,setValue]=useState(timeZone),[saving,setSaving]=useState(false),[notice,setNotice]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(saving)return;setSaving(true);setNotice("");
    try{
      const res=await fetch(`/api/clubs/${clubId}/attendance/timezone`,{
        method:"POST",cache:"no-store",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},body:JSON.stringify({timeZone:value.trim()}),
      });
      const data=(await res.json()) as {error?:string};
      if(!res.ok)throw new Error(data.error||"Could not save time zone");
      setNotice("Club day boundary updated. Existing attendance dates are preserved.");
      router.refresh();
    }catch(error){setNotice(error instanceof Error?error.message:"Could not save time zone");}
    finally{setSaving(false);}
  }
  return <details className="mt-7 rounded-2xl border border-[#f6dc9b]/15 bg-[#21160f] p-5">
    <summary className="flex cursor-pointer list-none items-center gap-3 font-semibold text-[#f5cd99] [&::-webkit-details-marker]:hidden"><Settings2 className="size-5"/>Attendance time zone <span className="ml-auto text-xs font-normal text-[#ac937b]">{timeZone}</span></summary>
    <form onSubmit={submit} className="mt-5 grid gap-3 border-t border-[#f6dc9b]/10 pt-5 sm:grid-cols-[1fr_auto] sm:items-end">
      <label className="text-xs font-semibold text-[#e5c49e]">IANA time zone
        <span className="mt-2 flex items-center gap-3 rounded-xl border border-[#f6dc9b]/20 bg-[#100b08] px-4"><Globe2 className="size-4 text-[#ecba81]"/><input list="b2-club-zones" required value={value} onChange={e=>setValue(e.target.value)} placeholder="Asia/Kolkata" className="min-h-11 w-full bg-transparent text-sm text-white outline-none"/></span>
        <datalist id="b2-club-zones">{suggestions.map(zone=><option key={zone} value={zone}/>)}</datalist>
      </label>
      <button disabled={saving||!value.trim()} type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#f0bb73] px-5 text-sm font-bold text-[#251407] disabled:opacity-50"><Check className="size-4"/>{saving?"Saving…":"Save zone"}</button>
    </form>
    <p className="mt-4 text-xs leading-6 text-[#aa927c]">Changes affect new arrivals only. Historical club-day snapshots remain unchanged. The underlying B1 membership term validity still uses its existing UTC date contract.</p>
    {notice&&<p role="status" className="mt-3 text-sm text-[#f1c59d]">{notice}</p>}
  </details>;
}
