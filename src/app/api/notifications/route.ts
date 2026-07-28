import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const notifications = await getDb().auditLog.findMany({
    where: { tenantId: auth.tenant.id, action: { startsWith: "notification." } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    unread: notifications.filter(n => !JSON.parse(n.metadata || "{}").readAt).length,
    items: notifications.map(n => ({
      id: n.id, type: n.action.replace("notification.", ""),
      message: JSON.parse(n.metadata || "{}").message || "", read: !!JSON.parse(n.metadata || "{}").readAt,
      createdAt: n.createdAt,
    })),
  });
}

export async function PATCH() {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  // Mark all as read
  const unread = await getDb().auditLog.findMany({
    where: { tenantId: auth.tenant.id, action: { startsWith: "notification." } },
    select: { id: true, metadata: true },
  });
  for (const n of unread) {
    const meta = JSON.parse(n.metadata || "{}");
    if (!meta.readAt) {
      await getDb().auditLog.update({
        where: { id: n.id },
        data: { metadata: JSON.stringify({ ...meta, readAt: new Date().toISOString() }) },
      });
    }
  }
  return NextResponse.json({ ok: true });
}
