import { NextResponse } from "next/server";
import { clearSession, getCurrentAuth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/tenant";

export async function POST() {
  const auth = await getCurrentAuth();
  if (auth) {
    await writeAuditLog({
      tenantId: auth.tenant.id,
      actor: auth.user.email,
      action: "auth.logout",
      entityType: "AppUser",
      entityId: auth.user.id,
    });
  }

  await clearSession();
  return NextResponse.json({ success: true });
}
