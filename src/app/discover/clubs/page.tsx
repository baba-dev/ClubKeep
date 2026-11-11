import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { validatedPublic } from "@/lib/public-directory";
import { Dumbbell, Flower2, Music2, Trophy, Building2, Search, MapPin, ArrowRight } from "lucide-react";
export const metadata:Metadata={title:"Discover clubs · ClubKeep",description:"Discover gyms, yoga and dance studios, sports academies and local clubs."};
type Query={q?:string;type?:string;cursor?:string;city?:string};
const icons={GYM:Dumbbell,YOGA:Flower2,DANCE:Music2,SPORTS:Trophy,OTHER:Building2} as const;
const categories=["GYM","YOGA","DANCE","SPORTS","OTHER"] as const;
export default async function Discover({searchParams}:{searchParams:Promise<Query>}){
  const input=await searchParams;
  const q=(input.q||"").trim().slice(0,80);
  const city=(input.city||"").trim().slice(0,100);
  const type=categories.find(x=>x===input.type);
  const cursor=input.cursor&&/^[a-zA-Z0-9_-]{10,128}$/.test(input.cursor)?input.cursor:undefined;
  const base: Prisma.ClubPublicProfileWhereInput={status:"LISTED",...(city?{city:{contains:city,mode:"insensitive"}}:{}),club:{status:"ACTIVE",setupStatus:{in:["READY","LEGACY_ACTIVE"]},...(q?{name:{contains:q,mode:"insensitive"}}:{}),...(type?{vertical:type}:{})}};
  const items=await prisma.clubPublicProfile.findMany({where:base,orderBy:[{publishedAt:"desc"},{clubId:"desc"}],take:13,...(cursor?{cursor:{clubId:cursor},skip:1}:{}),select:{clubId:true,published:true,publishedAt:true,club:{select:{name:true,slug:true,vertical:true}}}});
  const more=items.length>12;const list=items.slice(0,12);const next=list[list.length-1]?.clubId;
  return <main className="min-h-screen bg-[#0b0705] px-5 py-8 text-[#fff0e0] sm:px-8"><div className="mx-auto max-w-6xl">
    <header className="flex items-center justify-between border-b border-[#f6dc9b]/15 pb-6"><Link href="/auth/sign-in" className="text-xl font-bold">ClubKeep<span className="ml-2 text-sm font-normal text-[#d2a874]">Discover</span></Link><Link href="/auth/sign-in" className="rounded-xl border border-[#f6dc9b]/20 px-4 py-2 text-sm">Sign in</Link></header>
    <section className="py-12 sm:py-16"><p className="text-xs font-semibold tracking-[.2em] text-[#e8b36c] uppercase">Find your people</p><h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">Every community starts somewhere.</h1><p className="mt-4 max-w-2xl leading-7 text-[#c2a992]">Explore gyms, yoga studios, dance academies, sports clubs and more. Only owner-submitted and approved profiles appear here.</p></section>
    <form method="get" className="flex flex-col gap-3 rounded-3xl border border-[#f6dc9b]/20 bg-[#20150e] p-4 sm:flex-row sm:p-5">
      <label className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-[#f6dc9b]/20 bg-[#0b0807] px-4"><Search className="size-4 text-[#c2a180]"/><span className="sr-only">Search club name</span><input name="q" defaultValue={q} maxLength={80} placeholder="Search a club by name" className="min-w-0 flex-1 bg-transparent outline-none"/></label>
      <label className="sr-only" htmlFor="category">Club category</label><select id="category" name="type" defaultValue={type||""} className="min-h-12 rounded-xl border border-[#f6dc9b]/20 bg-[#0b0807] px-4 text-sm"><option value="">All categories</option>{categories.map(x=><option key={x} value={x}>{x==="GYM"?"Gym & Fitness":x==="YOGA"?"Yoga & Wellness":x==="DANCE"?"Dance Academy":x==="SPORTS"?"Sports Academy":"General Club"}</option>)}</select>
      <label className="sr-only" htmlFor="city">City</label><input id="city" name="city" maxLength={100} defaultValue={city} placeholder="City (optional)" className="min-h-12 rounded-xl border border-[#f6dc9b]/20 bg-[#0b0807] px-4 text-sm"/>
      <button className="min-h-12 rounded-xl bg-gradient-to-r from-[#e3b962] to-[#f26b00] px-6 font-bold text-[#281607]">Discover</button>
    </form>
    {list.length?<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map(item=>{const data=validatedPublic(item.published);const Icon=icons[item.club.vertical];return <Link key={item.clubId} href={"/c/"+encodeURIComponent(item.club.slug)} className="group overflow-hidden rounded-3xl border border-[#f6dc9b]/20 bg-[#1d140e] transition hover:border-[#f6bd73]/55">
      <div className="grid h-40 place-items-center bg-gradient-to-br from-[#492a18] via-[#322014] to-[#15100d]"><Icon className="size-14 text-[#efb873]" aria-hidden="true"/></div>
      <div className="p-6"><p className="text-xs font-semibold tracking-wider text-[#f5b979] uppercase">{item.club.vertical.toLowerCase()}</p><h2 className="mt-2 text-xl font-semibold">{item.club.name}</h2><p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[#c4aa93]">{data?.tagline||"A place to belong."}</p><p className="mt-5 flex items-center gap-2 text-xs text-[#bfa58b]"><MapPin className="size-4"/>{data?.city||"Location not published"}<ArrowRight className="ml-auto size-4"/></p></div>
    </Link>})}</div>:<section className="mt-8 rounded-3xl border border-dashed border-[#f6dc9b]/25 p-12 text-center"><Search className="mx-auto size-9 text-[#dfaf76]"/><h2 className="mt-4 text-xl font-semibold">No clubs found</h2><p className="mt-2 text-sm text-[#bca28a]">Try another name or category. New clubs appear only after approval.</p></section>}
    {more&&next&&<Link className="mt-8 inline-flex rounded-xl border border-[#f6dc9b]/25 px-5 py-3 text-sm" href={"/discover/clubs?"+new URLSearchParams({...(q?{q}:{}),...(type?{type}:{}),...(city?{city}:{}),cursor:next}).toString()}>Explore more clubs <ArrowRight className="ml-2 size-4"/></Link>}
    <footer className="mt-16 border-t border-[#f6dc9b]/10 py-8 text-xs text-[#bba18a]">ClubKeep by BabaBuilds · Discover a community, keep your membership private.</footer>
  </div></main>;
}
