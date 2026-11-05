import { NextResponse } from "next/server";


export async function GET() {
  const backend = process.env.BACKEND_URL;

  if (!backend) {
    return NextResponse.json(
      { status: "error", message: "Backend URL missing" },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(`${backend}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json(
      { status: "error", message: "Backend unavailable" },
      { status: 503 }
    );
  }
}
