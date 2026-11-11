import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft,ShieldCheck,ReceiptText,AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { formatMinorMoney } from "@/lib/money-format";
import { receiptNumber } from "@/lib/finance-service";
import { PrintClubReceiptButton } from "@/components/clubs/print-club-receipt-button";
export const metadata:Metadata={title:"Recorded fee receipt · ClubKeep",robots:{index:false}};
type Props={params:Promise<{clubId:string;paymentId:string}>};
export default function RecordedReceipt(props:Props){
  return <Suspense fallback={<main className="min-h-screen bg-[#120b07] p-10 text-[#f9e8d5]">Preparing your receipt…</main>}><ReceiptContent {...props}/></Suspense>;
}
async function ReceiptContent({params}:Props){
  const {clubId,paymentId}=await params,session=await requireSession();
  await requireClubActive(prisma,session.user.id,clubId,["OWNER","MANAGER","STAFF"]);
  const payment=await prisma.clubPayment.findFirst({where:{id:paymentId,clubId},select:{
    id:true,receiptNo:true,clubName:true,memberName:true,memberNumber:true,planName:true,
    termPriceMinor:true,termStartsAt:true,termEndsAt:true,currency:true,amountMinor:true,
    method:true,externalReference:true,note:true,receivedAt:true,createdAt:true,
    recorder:{select:{name:true}},reversal:{select:{reason:true,createdAt:true,actor:{select:{name:true}}}}
  }});
  if(!payment)notFound();
  const voided=Boolean(payment.reversal);
  return <main className="min-h-screen bg-[#0b0705] px-4 py-8 text-[#fff0dd] print:m-0 print:min-h-0 print:bg-white print:p-0 print:text-black">
    <div className="mx-auto max-w-[760px]">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={"/clubs/"+clubId+"/finance/payments"} className="inline-flex items-center gap-2 text-sm text-[#f2c48a]"><ArrowLeft className="size-4"/>Payment ledger</Link>
        <PrintClubReceiptButton/>
      </header>
      <article className="overflow-hidden rounded-3xl border border-[#efc181]/30 bg-[#fcf7ef] text-[#2e1a10] shadow-2xl print:rounded-none print:border-0 print:shadow-none">
        <div className="flex items-start justify-between gap-3 bg-[#2e1b0e] px-6 py-9 text-[#f8e5ca] sm:px-10 print:bg-white print:text-black">
          <div><p className="text-xs font-semibold tracking-[.22em] text-[#ecc28b] uppercase print:text-black">ClubKeep · Club receipt</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{payment.clubName}</h1>
            <p className="mt-2 max-w-sm text-xs leading-6 text-[#d3b99d] print:text-black">Recorded external membership-fee collection</p>
          </div>
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#f7d69e] to-[#e87928] text-2xl font-bold text-[#351b08]">CK</div>
        </div>
        <div className="p-6 sm:p-10">
          <div className="flex flex-wrap justify-between gap-4 border-b border-[#d9c3a6] pb-8">
            <div><p className="text-xs font-semibold tracking-widest text-[#8b6341] uppercase">Receipt number</p><p className="mt-2 text-2xl font-semibold tabular-nums">{receiptNumber(payment.receiptNo)}</p>
              <p className="mt-2 text-xs text-[#7f614b]">Recorded {payment.createdAt.toISOString().slice(0,16).replace("T"," ")} UTC</p></div>
            <div className="text-left sm:text-right"><p className="text-xs font-semibold tracking-widest text-[#8b6341] uppercase">Status</p><p className={"mt-2 text-xl font-semibold "+(voided?"text-[#a83f36]":"text-[#2d744c]")}>{voided?"VOID / Reversed":"RECORDED"}</p>
              <p className="mt-2 text-xs text-[#7f614b]">{voided?"This entry no longer counts toward dues":"Reported by club staff, not bank verified"}</p></div>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div><p className="text-xs font-semibold tracking-widest text-[#8b6341] uppercase">Received from</p><p className="mt-2 text-xl font-semibold">{payment.memberName}</p><p className="mt-2 text-sm text-[#83624d]">Club member #{String(payment.memberNumber).padStart(4,"0")}</p></div>
            <div><p className="text-xs font-semibold tracking-widest text-[#8b6341] uppercase">Membership</p><p className="mt-2 text-lg font-semibold">{payment.planName}</p><p className="mt-2 text-xs text-[#83624d]">{payment.termStartsAt.toISOString().slice(0,10)} — {payment.termEndsAt.toISOString().slice(0,10)} (end exclusive)</p></div>
          </div>
          <div className="mt-8 rounded-2xl border border-[#ddc7a8] bg-[#fffdf9] p-6">
            <div className="flex items-center justify-between gap-3 text-sm"><span className="text-[#7d5c46]">Membership term fee</span><span className="font-semibold tabular-nums">{formatMinorMoney(payment.termPriceMinor,payment.currency)}</span></div>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm"><span className="text-[#7d5c46]">Externally received via</span><span className="font-semibold">{payment.method}</span></div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e5ceb4] pt-5">
              <span className="font-semibold">This recorded payment</span><strong className={"text-3xl font-semibold tabular-nums "+(voided?"text-[#9b4b40] line-through":"text-[#a24c10]")}>{formatMinorMoney(payment.amountMinor,payment.currency)}</strong>
            </div>
          </div>
          {payment.externalReference&&<p className="mt-5 text-xs text-[#7c624e]">External reference (staff-entered): {payment.externalReference}</p>}
          {payment.note&&<p className="mt-2 text-xs text-[#7c624e]">Internal note: {payment.note}</p>}
          <p className="mt-5 text-xs text-[#7c624e]">Recorded by: {payment.recorder.name} · Received {payment.receivedAt.toISOString().slice(0,16).replace("T"," ")} UTC</p>
          {payment.reversal&&<div className="mt-6 rounded-xl border border-[#e0a298] bg-[#fff0ed] p-5 text-[#8e352d]">
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-5"/>This recorded payment was voided</p>
            <p className="mt-2 text-sm leading-6">Reason: {payment.reversal.reason}</p>
            <p className="mt-2 text-xs">Reversed by {payment.reversal.actor.name} · {payment.reversal.createdAt.toISOString().slice(0,16).replace("T"," ")} UTC</p>
          </div>}
          <div className="mt-9 flex items-start gap-3 border-t border-[#e2cdb3] pt-6 text-xs leading-6 text-[#795d49]"><ShieldCheck className="mt-1 size-5 shrink-0 text-[#a16e3c]"/>
            <span>This document confirms only that ClubKeep staff recorded a collection said to have been received outside the app. ClubKeep is not the payment processor. It is not a statutory tax invoice, bank confirmation or evidence of gateway settlement.</span>
          </div>
        </div>
      </article>
      <p className="mt-6 text-center text-xs text-[#ac9580] print:hidden"><ReceiptText className="mr-2 inline size-4"/>Financial receipts are accessible only to authorized club personnel.</p>
    </div>
  </main>;
}
