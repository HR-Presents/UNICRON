import { NextRequest, NextResponse } from 'next/server';
const backend = process.env.BACKEND_URL || 'http://127.0.0.1:42515';
type Ctx = { params: Promise<{ id: string }> };
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const res = await fetch(`${backend}/api/cases/${encodeURIComponent(id)}/evidence`, {cache:'no-store'});
    return NextResponse.json(await res.json(), {status:res.status});
  } catch { return NextResponse.json({detail:'Backend unavailable'}, {status:503}); }
}
export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const form = await req.formData();
    const res = await fetch(`${backend}/api/cases/${encodeURIComponent(id)}/evidence`, {method:'POST',body:form,signal:AbortSignal.timeout(30000)});
    return NextResponse.json(await res.json(), {status:res.status});
  } catch { return NextResponse.json({detail:'Upload failed or backend unavailable'}, {status:503}); }
}
