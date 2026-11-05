import { NextRequest, NextResponse } from "next/server";

const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:42515";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> },
) {
  const { id, runId } = await params;
  try {
    const response = await fetch(
      `${backend}/api/cases/${encodeURIComponent(id)}/executions/${encodeURIComponent(runId)}/events`,
      { cache: "no-store", signal: AbortSignal.timeout(10000) },
    );
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ detail: "Investigation backend unavailable" }, { status: 503 });
  }
}
