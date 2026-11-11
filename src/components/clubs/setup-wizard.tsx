"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Building2, Dumbbell, Flower2, Music2, Trophy, Layers3 } from "lucide-react";

const steps=["type","details","identity","membership","review"] as const;
type Step=typeof steps[number];
type Initial={club:{id:string;name:string;vertical:string;timeZone:string;setupStatus:string;setupProgress:{
  countryCode:string|null;currencyCode:string|null;operatingMode:string|null;city:string|null;address:string|null;contactEmail:string|null;logoUrl:string|null;
}|null};plans:{id:string;name:string;currency:string}[]};
const categories=[
  {value:"GYM",title:"Gym & Fitness",icon:Dumbbell,description:"Gyms, fitness studios and strength training"},
  {value:"YOGA",title:"Yoga & Wellness",icon:Flower2,description:"Yoga studios and wellness communities"},
  {value:"DANCE",title:"Dance Academy",icon:Music2,description:"Dance schools and movement academies"},
  {value:"SPORTS",title:"Sports Academy",icon:Trophy,description:"Sports clubs and athlete training"},
  {value:"OTHER",title:"General Club",icon:Building2,description:"Flexible clubs and community spaces"},
] as const;
export function SetupWizard({clubId,initial,initialStep}:{clubId:string;initial:Initial;initialStep:Step}){
  const router=useRouter();
  const stepIndex=steps.indexOf(initialStep);
  const current=initial.club.setupProgress;
  const [vertical,setVertical]=useState(initial.club.vertical);
  const [country,setCountry]=useState(current?.countryCode||"");
  const [currency,setCurrency]=useState(current?.currencyCode||"");
  const [zone,setZone]=useState(initial.club.timeZone==="UTC"?"":initial.club.timeZone);
  const [mode,setMode]=useState(current?.operatingMode||"PHYSICAL");
  const [city,setCity]=useState(current?.city||"");
  const [address,setAddress]=useState(current?.address||"");
  const [email,setEmail]=useState(current?.contactEmail||"");
  const [logo,setLogo]=useState(current?.logoUrl||"");
  const [name,setName]=useState("");
  const [duration,setDuration]=useState("MONTHS");
  const [count,setCount]=useState("1");
  const [price,setPrice]=useState("0");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [plans,setPlans]=useState(initial.plans);
  const base="/clubs/"+encodeURIComponent(clubId);
  function go(next:Step){router.push(base+"/setup/"+next);router.refresh();}
  async function post(url:string,body:unknown,method="POST"){
    const response=await fetch(url,{method,credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Unable to save, please try again");
    return data;
  }
  async function onNext(event:FormEvent){
    event.preventDefault();if(busy)return;setBusy(true);setError("");
    try{
      if(initialStep==="type") await post(base.replace("/clubs/","/api/clubs/")+"/setup",{step:"type",vertical},"PATCH");
      if(initialStep==="details") await post("/api"+base+"/setup",{step:"details",data:{countryCode:country.trim().toUpperCase(),currencyCode:currency.trim().toUpperCase(),operatingMode:mode,timeZone:zone.trim(),city,address,contactEmail:email}},"PATCH");
      if(initialStep==="identity")await post("/api"+base+"/setup",{step:"identity",data:{logoUrl:logo}},"PATCH");
      if(initialStep==="membership"&&plans.length===0){
        if(!name.trim())throw new Error("Give your first plan a name");
        const minor=Math.round(Number(price)*100);
        if(!Number.isSafeInteger(minor)||minor<0)throw new Error("Enter a valid nonnegative price");
        const result=await post("/api"+base+"/setup/plan",{name:name.trim(),description:"",durationUnit:duration,durationCount:Number(count),priceMinor:minor,currency:currency||current?.currencyCode||""});
        setPlans([...plans,{...result.plan,currency:currency||current?.currencyCode||""}]);
      }
      if(initialStep==="review"){await post("/api"+base+"/setup/complete",{});router.replace(base);router.refresh();return;}
      go(steps[stepIndex+1]);
    }catch(e){setError(e instanceof Error?e.message:"Unable to continue");}finally{setBusy(false);}
  }
  const btn="min-h-12 rounded-xl border border-[#f6dc9b]/25 bg-[#1b130d] px-4 text-sm text-[#ffe4c0] outline-offset-4 focus-visible:outline-2 focus-visible:outline-orange-400";
  const field="min-h-12 w-full rounded-xl border border-[#f6dc9b]/25 bg-[#0d0907] px-4 text-[#fff0dd] outline-offset-2 focus-visible:outline-2 focus-visible:outline-orange-400";
  const labels=["Your club","Club details","Make it yours","Membership plans","Ready to launch"];
  return <div className="min-h-screen bg-[#0b0705] px-4 py-9 text-[#fff0df] sm:px-8">
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-4"><a href="/home" className="text-sm text-[#d6a879]">ClubKeep / Business</a><span className="text-xs text-[#bca18c]">Step {stepIndex+1} of 5</span></div>
      <div className="mt-7 flex gap-2" aria-label="Setup progress">{steps.map((s,i)=><span key={s} className={"h-1.5 flex-1 rounded-full "+(i<=stepIndex?"bg-[#f26b00]":"bg-[#37261a]")}/>)}</div>
      <p className="mt-10 text-xs font-semibold tracking-[.2em] text-[#ebbc76] uppercase">{initial.club.name} · Required setup</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">{labels[stepIndex]}</h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-[#bfa48d]">Finish these essentials to open your club workspace. Your progress is saved after each step.</p>
      <form onSubmit={onNext} className="mt-8 space-y-5 rounded-3xl border border-[#f6dc9b]/20 bg-[#17100b] p-5 shadow-2xl sm:p-9">
        {initialStep==="type"&&<fieldset><legend className="mb-4 font-semibold">What kind of club are you running?</legend><div className="grid gap-3 sm:grid-cols-2">{categories.map(c=><label key={c.value} className={"flex cursor-pointer items-start gap-3 rounded-2xl border p-4 "+(vertical===c.value?"border-[#f5ac54] bg-[#3c2415]":"border-[#f6dc9b]/15 bg-[#251910]")}><input type="radio" name="vertical" className="mt-1 accent-orange-500" value={c.value} checked={vertical===c.value} onChange={()=>setVertical(c.value)}/><c.icon className="mt-0.5 size-5 shrink-0 text-[#ffbd78]"/><span><span className="block font-semibold">{c.title}</span><span className="mt-1 block text-xs leading-5 text-[#c3a790]">{c.description}</span></span></label>)}</div></fieldset>}
        {initialStep==="details"&&<div className="space-y-4">
          <label className="block text-sm">Country code (ISO 2)<input required minLength={2} maxLength={2} placeholder="IN" value={country} onChange={e=>setCountry(e.target.value)} className={field}/></label>
          <label className="block text-sm">Club currency (ISO 3)<input required minLength={3} maxLength={3} placeholder="INR" value={currency} onChange={e=>setCurrency(e.target.value)} className={field}/></label>
          <label className="block text-sm">Timezone (IANA)<input required placeholder="Asia/Kolkata" value={zone} onChange={e=>setZone(e.target.value)} className={field}/></label>
          <label className="block text-sm">How do you operate?<select className={field} value={mode} onChange={e=>setMode(e.target.value)}><option value="PHYSICAL">In person</option><option value="HYBRID">In person and online</option><option value="ONLINE">Online</option></select></label>
          <label className="block text-sm">City (optional)<input className={field} maxLength={100} value={city} onChange={e=>setCity(e.target.value)}/></label>
          <label className="block text-sm">Address (optional)<input className={field} maxLength={240} value={address} onChange={e=>setAddress(e.target.value)}/></label>
          <label className="block text-sm">Contact email (optional)<input className={field} type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
        </div>}
        {initialStep==="identity"&&<div className="space-y-4"><p className="text-sm leading-7 text-[#c2a58b]">ClubKeep will use a tasteful initials logo until you add your own. Public listings are private until you request review.</p><label className="block text-sm">Logo image HTTPS URL (optional)<input className={field} value={logo} onChange={e=>setLogo(e.target.value)} placeholder="https://…" type="url" /></label></div>}
        {initialStep==="membership"&&<div className="space-y-4">
          {plans.length>0?<div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/25 p-5"><CheckCircle2 className="mb-2 size-6 text-[#86d69e]"/><p className="font-semibold">Membership plan ready</p><p className="mt-2 text-sm text-[#bfa990]">{plans.map(p=>p.name).join(", ")}</p></div>:<>
          <p className="text-sm text-[#c6ac91]">Create one plan to launch. You can add more later, including free memberships.</p>
          <label className="block text-sm">Plan name<input required className={field} value={name} onChange={e=>setName(e.target.value)} placeholder="Monthly membership" maxLength={90}/></label>
          <label className="block text-sm">Duration<select className={field} value={duration} onChange={e=>setDuration(e.target.value)}><option value="DAYS">Days</option><option value="WEEKS">Weeks</option><option value="MONTHS">Months</option></select></label>
          <label className="block text-sm">Duration count<input required className={field} type="number" min={1} max={1200} value={count} onChange={e=>setCount(e.target.value)}/></label>
          <label className="block text-sm">Plan price ({currency||current?.currencyCode||"your currency"})<input required className={field} type="number" min={0} max={1000000} step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></label>
          </>}
        </div>}
        {initialStep==="review"&&<div className="space-y-4"><CheckCircle2 className="size-10 text-[#f8b35d]"/><h2 className="text-xl font-semibold">Almost there.</h2><p className="text-sm leading-7 text-[#c3a790]">Your club is created, but operations remain locked until you launch. You can publish a public profile separately after launch.</p><div className="rounded-xl bg-[#25180e] p-5 text-sm"><p>Club: {initial.club.name}</p><p className="mt-2">Type: {initial.club.vertical}</p><p className="mt-2">Membership plans: {plans.length}</p></div></div>}
        {error&&<p role="alert" className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-sm text-[#ffb8a9]">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f6dc9b]/10 pt-5">
          <button type="button" disabled={stepIndex===0||busy} onClick={()=>go(steps[stepIndex-1])} className={btn}><ArrowLeft className="mr-2 inline size-4"/>Back</button>
          <button type="submit" disabled={busy} className="min-h-12 rounded-xl bg-gradient-to-r from-[#d5a74b] to-[#f26b00] px-6 font-bold text-[#291607] disabled:opacity-50">{busy?"Saving…":initialStep==="review"?"Launch my club":"Save & continue"}<ArrowRight className="ml-2 inline size-4"/></button>
        </div>
      </form>
    </div>
  </div>;
}
