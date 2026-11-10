"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";

export function CancelTermButton({clubId,memberId,subscriptionId}:{clubId:string;memberId:string;subscriptionId:string}){
  const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function cancel(){
    if(busy||!window.confirm("Cancel this membership term? This action will be audited. No payment refund is processed."))return;
    setBusy(true);setError("");
    try{
      const response=await fetch(`/api/clubs/${clubId}/members/${memberId}/subscriptions/${subscriptionId}/cancel`,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:"{}",cache:"no-store"});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Cancellation failed");
      router.refresh();
    }catch(error){setError(error instanceof Error?error.message:"Cancellation failed");}finally{setBusy(false);}
  }
  return <span className="inline-flex flex-col gap-1"><button type="button" disabled={busy} onClick={cancel} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs text-[#e7b3a1] hover:bg-[#442416] disabled:opacity-50"><Ban className="size-3.5"/>{busy?"Cancelling…":"Cancel term"}</button>{error&&<span role="alert" className="text-xs text-orange-200">{error}</span>}</span>;
}
