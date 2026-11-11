"use client";
import { useRef,useState,type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet,ShieldCheck,ReceiptText } from "lucide-react";
import { parseMinorMoney,formatMinorMoney } from "@/lib/money-format";
type Term={id:string;planName:string;currency:string;dueMinor:number};
export function RecordClubPaymentForm({clubId,memberId,terms}:{clubId:string;memberId:string;terms:Term[]}){
  const router=useRouter(),idempotency=useRef<string|null>(null);
  const payable=terms.filter(t=>t.dueMinor>0);
  const [selected,setSelected]=useState(payable[0]?.id??"");
  const [amount,setAmount]=useState("");
  const [method,setMethod]=useState("CASH");
  const [reference,setReference]=useState(""),[note,setNote]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const [receipt,setReceipt]=useState("");
  const term=payable.find(t=>t.id===selected);
  const field="min-h-11 w-full rounded-xl border border-[#f6dc9b]/20 bg-[#110b08] px-4 text-[#fff0dd] outline-offset-2 focus-visible:outline-2 focus-visible:outline-orange-400";
  async function submit(e:FormEvent){
    e.preventDefault();if(busy||!term)return;setBusy(true);setError("");setReceipt("");
    try{
      let minor:number|null;
      try{minor=parseMinorMoney(amount.trim(),term.currency);}catch{minor=null;}
      if(minor===null||minor<=0||minor>term.dueMinor)throw new Error("Enter a valid amount no greater than outstanding dues");
      if(!idempotency.current)idempotency.current=crypto.randomUUID();
      const result=await fetch("/api/clubs/"+encodeURIComponent(clubId)+"/finance/payments",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({memberId,subscriptionId:term.id,operationKey:idempotency.current,
          amountMinor:minor,method,externalReference:reference.trim(),note:note.trim()})
      });
      const data=await result.json();if(!result.ok)throw new Error(data.error||"Unable to record payment");
      idempotency.current=null;setReceipt(data.receiptUrl);setAmount("");setReference("");setNote("");
      router.refresh();
    }catch(err){setError(err instanceof Error?err.message:"Recording failed");}finally{setBusy(false);}
  }
  return <section className="mt-7 rounded-3xl border border-[#f6dc9b]/20 bg-gradient-to-br from-[#2b1b10] to-[#17100b] p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold tracking-[.2em] text-[#edbd7e] uppercase">Club fee ledger</p><h2 className="mt-2 text-2xl font-semibold">Record a received payment</h2></div><span className="rounded-xl bg-[#402514] p-3"><Wallet className="size-6 text-[#f1bf7d]"/></span></div>
    <p className="mt-3 max-w-2xl text-sm leading-7 text-[#bea58f]">Only use this after cash, UPI, card or another payment has actually been received outside ClubKeep. This action does not charge a member.</p>
    {payable.length===0?<p className="mt-5 rounded-2xl border border-[#f6dc9b]/15 p-5 text-sm text-[#d2b49c]">No outstanding balance on the available active membership terms. Canceled and fully paid terms cannot receive new collections.</p>:
      <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">Membership term<select required className={"mt-2 "+field} value={selected} onChange={e=>{setSelected(e.target.value);setAmount("");idempotency.current=null;}}>
          {payable.map(t=><option key={t.id} value={t.id}>{t.planName} · {formatMinorMoney(t.dueMinor,t.currency)} due</option>)}
        </select></label>
        <label className="block text-sm">Amount received ({term?.currency})<input required className={"mt-2 "+field} type="number" min="0" step="any" value={amount} onChange={e=>{setAmount(e.target.value);idempotency.current=null;}} placeholder="0.00"/></label>
        <label className="block text-sm">Received via<select className={"mt-2 "+field} value={method} onChange={e=>{setMethod(e.target.value);idempotency.current=null;}}><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD">Card (external terminal)</option><option value="OTHER">Other (external)</option></select></label>
        <label className="block text-sm">External reference (optional)<input className={"mt-2 "+field} maxLength={120} value={reference} onChange={e=>{setReference(e.target.value);idempotency.current=null;}} placeholder="Bank/terminal reference"/></label>
        <label className="block text-sm sm:col-span-2">Internal note (optional)<input className={"mt-2 "+field} maxLength={240} value={note} onChange={e=>{setNote(e.target.value);idempotency.current=null;}} placeholder="Only non-sensitive notes"/></label>
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <button disabled={busy} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#edbf73] to-[#f26b00] px-6 font-semibold text-[#2a190b] disabled:opacity-50"><ReceiptText className="size-4"/>{busy?"Recording…":"Confirm received payment"}</button>
          <span className="inline-flex items-center gap-2 text-xs text-[#baa28f]"><ShieldCheck className="size-4 text-[#e7b473]"/>Permanent, auditable entry</span>
        </div>
      </form>}
    {error&&<p role="alert" className="mt-5 rounded-xl bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</p>}
    {receipt&&<p role="status" className="mt-5 rounded-xl border border-emerald-600/20 bg-emerald-950/30 p-4 text-sm text-emerald-100">Collection recorded. <Link className="font-semibold underline underline-offset-4" href={receipt}>View and print receipt</Link></p>}
  </section>;
}
