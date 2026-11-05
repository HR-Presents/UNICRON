import { NextResponse } from 'next/server';
const backend = process.env.BACKEND_URL || 'http://127.0.0.1:42515';
type Ctx = { params: Promise<{ id: string }> };
export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const res = await fetch(`${backend}/api/cases/${encodeURIComponent(id)}/evidence/analyze`, {method:'POST',signal:AbortSignal.timeout(130000)});
    return NextResponse.json(await res.json(), {status:res.status});
  } catch { return NextResponse.json({detail:'Evidence inference unavailable'}, {status:503}); }
}
