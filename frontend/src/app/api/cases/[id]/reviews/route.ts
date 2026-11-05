import { NextRequest, NextResponse } from "next/server";
const backend=process.env.BACKEND_URL??"http://127.0.0.1:42515";
export async function GET(_request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  try{const r=await fetch(`${backend}/api/cases/${encodeURIComponent(id)}/reviews`,{cache:"no-store",signal:AbortSignal.timeout(10000)});return NextResponse.json(await r.json(),{status:r.status});}
  catch{return NextResponse.json({detail:"Review backend unavailable"},{status:503});}
}
