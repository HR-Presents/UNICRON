import { NextResponse } from 'next/server';
export async function GET() {
  try { const r=await fetch(`${process.env.BACKEND_URL ?? 'http://127.0.0.1:42515'}/api/summary`, {cache:'no-store',signal:AbortSignal.timeout(5000)}); return NextResponse.json(await r.json(),{status:r.status}); }
  catch { return NextResponse.json({error:'Backend unavailable'},{status:503}); }
}
