import {NextRequest,NextResponse} from "next/server";
const backend=process.env.BACKEND_URL??"http://127.0.0.1:42515";
type Ctx={params:Promise<{id:string}>};
async function proxy(req:NextRequest,id:string){try{const response=await fetch(`${backend}/api/cases/${encodeURIComponent(id)}/scenario-sessions`,{method:req.method,headers:req.method==="POST"?{"Content-Type":"application/json"}:undefined,body:req.method==="POST"?await req.text():undefined,cache:"no-store",signal:AbortSignal.timeout(10000)});return NextResponse.json(await response.json(),{status:response.status});}catch{return NextResponse.json({detail:"Scenario backend unavailable"},{status:503});}}
export async function GET(req:NextRequest,ctx:Ctx){return proxy(req,(await ctx.params).id);}
export async function POST(req:NextRequest,ctx:Ctx){return proxy(req,(await ctx.params).id);}
