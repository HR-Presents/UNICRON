import { NextRequest, NextResponse } from "next/server";
const backend=process.env.BACKEND_URL??"http://127.0.0.1:42515";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string;investigationId:string}>}){
  const {id,investigationId}=await params;
  try{
    const body=await request.text();
    const key=request.headers.get("x-reviewer-key")??"";
    const r=await fetch(`${backend}/api/cases/${encodeURIComponent(id)}/investigations/${encodeURIComponent(investigationId)}/reviews`,{
      method:"POST",headers:{"Content-Type":"application/json","x-reviewer-key":key},body,cache:"no-store",signal:AbortSignal.timeout(15000)
    });
    return NextResponse.json(await r.json(),{status:r.status,headers:{"Cache-Control":"no-store"}});
  }catch{return NextResponse.json({detail:"Review backend unavailable"},{status:503});}
}
