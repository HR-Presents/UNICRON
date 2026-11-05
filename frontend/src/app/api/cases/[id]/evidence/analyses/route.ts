import { NextResponse } from 'next/server';
const backend = process.env.BACKEND_URL || 'http://127.0.0.1:42515';
type Ctx = { params: Promise<{ id: string }> };
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const res = await fetch(`${backend}/api/cases/${encodeURIComponent(id)}/evidence/analyses`, {cache:'no-store'});
    return NextResponse.json(await res.json(), {status:res.status});
  } catch { return NextResponse.json({detail:'Backend unavailable'}, {status:503}); }
}
