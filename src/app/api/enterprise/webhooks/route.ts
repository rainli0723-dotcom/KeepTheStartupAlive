import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const logs = await getDb().auditLog.findMany({
    where: { tenantId: auth.tenant.id, action: "webhook.configured" },
    orderBy: { createdAt: "desc" },
    select: { entityId: true, metadata: true, createdAt: true },
  });
  return NextResponse.json({ webhooks: logs.map(l => ({ id: l.entityId, ...JSON.parse(l.metadata || "{}"), createdAt: l.createdAt })) });
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentAuth();
  if (!auth || auth.user.role !== "admin") return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  const { url, events } = await req.json();
  if (!url) return NextResponse.json({ error: "请提供 webhook URL" }, { status: 400 });
  await getDb().auditLog.create({
    data: {
      tenantId: auth.tenant.id, actor: auth.user.email, action: "webhook.configured",
      entityType: "Webhook", entityId: url, metadata: JSON.stringify({ url, events: events || ["simulation.completed", "report.generated", "member.joined"] }),
    },
  });
  return NextResponse.json({ ok: true, url });
}

export async function DELETE(req: NextRequest) {
  const auth = await getCurrentAuth();
  if (!auth || auth.user.role !== "admin") return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  const { url } = await req.json();
  await getDb().auditLog.create({
    data: { tenantId: auth.tenant.id, actor: auth.user.email, action: "webhook.deleted", entityType: "Webhook", entityId: url, metadata: JSON.stringify({ url }) },
  });
  return NextResponse.json({ ok: true });
}
