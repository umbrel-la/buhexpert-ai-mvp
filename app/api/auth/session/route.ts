import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(request);
  return NextResponse.json({ authenticated: session.authenticated, mode: session.mode });
}
