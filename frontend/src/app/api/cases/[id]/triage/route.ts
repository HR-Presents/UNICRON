import { NextRequest, NextResponse } from 'next/server';
const backend = process.env.BACKEND_URL || 'http://127.0.0.1:42515';
type Context = { params: Promise<{ id: string }> };
async function proxy(req: NextRequest, ctx: Context, method: 'GET' | 'POST') {
  const { id } = await ctx.params;
  try {
    const res = await fetch(`${backend}/api/cases/${encodeURIComponent(id)}/triage`, {
      method, cache: 'no-store', signal: AbortSignal.timeout(130000)
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ detail: 'CIVITAS backend or inference service unavailable' }, { status: 503 });
  }
}
export async function GET(req: NextRequest, ctx: Context) { return proxy(req, ctx, 'GET'); }
export async function POST(req: NextRequest, ctx: Context) { return proxy(req, ctx, 'POST'); }
