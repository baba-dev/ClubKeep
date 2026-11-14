/** Offline demo seed safety contract; source credentials are never logged. */
export function parseDemoSeedTarget(args,env) {
  if (env.CLUBKEEP_DEMO_SANDBOX!=="true") throw new Error("CLUBKEEP_DEMO_SANDBOX=true is mandatory");
  if(args.length!==2||args[0]!=="--expect-db"|| !/^clubkeep_demo(?:_ci)?$/.test(args[1]))
    throw new Error("Use --expect-db clubkeep_demo on a separate, EMPTY demo database");
  let url;
  try{url=new URL(env.DATABASE_URL);}catch{throw new Error("Demo DATABASE_URL is missing or invalid");}
  if(!["postgresql:","postgres:"].includes(url.protocol) ||decodeURIComponent(url.pathname.slice(1))!==args[1])
    throw new Error("Database URL must point to the explicitly selected demo database");
  const origin=env.BETTER_AUTH_URL;
  if(env.NODE_ENV==="production"){
    let hostname;
    try{hostname=new URL(origin).hostname;}catch{throw new Error("Demo origin required");}
    if(!hostname.startsWith("demo.") ||hostname==="clubkeep.bababuilds.com")
      throw new Error("Refusing to seed a non-demo production origin");
  }
  return args[1];
}
export function parseDemoSeedPasswords(raw,roles) {
  let object;
  try{object=JSON.parse(raw);}catch{throw new Error("Password input must be one JSON object piped via stdin");}
  if(!object ||typeof object!=="object"||Array.isArray(object)||Object.keys(object).sort().join(",")!==[...roles].sort().join(","))
    throw new Error("Separate owner, member, manager and staff passwords are required");
  const list=roles.map(k=>object[k]);
  if(list.some(p=>typeof p!=="string"||p.length<12||p.length>128||/[\r\n]/.test(p)))
    throw new Error("Each sandbox password must be a distinct single line of 12–128 characters");
  if(new Set(list).size!==roles.length)throw new Error("Use independent passwords per persona");
  return object;
}
