import { NextRequest, NextResponse } from "next/server";

const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:42515";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const response = await fetch(
      `${backend}/api/cases/${encodeURIComponent(id)}/investigate/async`,
      { method: "POST", cache: "no-store", signal: AbortSignal.timeout(10000) },
    );
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ detail: "Investigation backend unavailable" }, { status: 503 });
  }
}
