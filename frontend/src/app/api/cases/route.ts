import { NextRequest, NextResponse } from 'next/server';
const base = process.env.BACKEND_URL ?? 'http://127.0.0.1:42515';
export async function GET() {
  try { const r = await fetch(`${base}/api/cases`, {cache:'no-store', signal:AbortSignal.timeout(5000)}); return NextResponse.json(await r.json(), {status:r.status}); }
  catch { return NextResponse.json({error:'Backend unavailable'}, {status:503}); }
}
export async function POST(req: NextRequest) {
  try { const r = await fetch(`${base}/api/cases`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(await req.json()),signal:AbortSignal.timeout(5000)}); return NextResponse.json(await r.json(), {status:r.status}); }
  catch { return NextResponse.json({error:'Backend unavailable'}, {status:503}); }
}
