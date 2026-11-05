import { NextRequest, NextResponse } from 'next/server';
const base = process.env.BACKEND_URL ?? 'http://127.0.0.1:42515';
export async function PATCH(req: NextRequest, {params}:{params:Promise<{id:string}>}) {
  try { const {id}=await params; const r=await fetch(`${base}/api/cases/${encodeURIComponent(id)}`, {method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(await req.json()),signal:AbortSignal.timeout(5000)}); return NextResponse.json(await r.json(), {status:r.status}); }
  catch { return NextResponse.json({error:'Backend unavailable'}, {status:503}); }
}
