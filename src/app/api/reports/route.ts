import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const meetings = await getDb().strategyMeeting.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      workspace: { include: { organizationProfile: true } },
      businessEvent: true,
      decisionOptions: true,
    },
  });
  return NextResponse.json({ meetings });
}
