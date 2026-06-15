import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveTenant } from "@/lib/tenant";

export async function GET() {
  const tenant = await getActiveTenant();
  const meetings = await getDb().strategyMeeting.findMany({
    where: { workspace: { tenantId: tenant.id } },
    orderBy: { createdAt: "desc" },
    include: {
      workspace: { include: { organizationProfile: true } },
      businessEvent: true,
      decisionOptions: true,
    },
  });
  return NextResponse.json({ meetings });
}
