import { NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth";

export async function GET() {
  const auth = await getCurrentAuth();
  return NextResponse.json({ auth });
}
