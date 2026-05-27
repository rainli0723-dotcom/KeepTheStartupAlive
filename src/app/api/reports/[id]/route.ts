import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const meeting = await getDb().strategyMeeting.findUnique({
    where: { id },
    include: {
      workspace: { include: { organizationProfile: true, teamMembers: true } },
      businessEvent: true,
      decisionOptions: true,
    },
  });
  if (!meeting) return NextResponse.json({ error: "未找到报告" }, { status: 404 });
  return NextResponse.json({ meeting });
}
