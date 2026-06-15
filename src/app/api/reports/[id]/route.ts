import { NextResponse } from "next/server";
import { getScopedMeetingReport } from "@/lib/access-control";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { meeting } = await getScopedMeetingReport(id);
  if (!meeting) return NextResponse.json({ error: "未找到报告" }, { status: 404 });
  return NextResponse.json({ meeting });
}
