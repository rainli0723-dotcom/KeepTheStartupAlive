import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const approvals = await getDb().auditLog.findMany({
    where: { tenantId: auth.tenant.id, action: { in: ["approval.requested", "approval.approved", "approval.rejected"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ approvals: approvals.map(a => ({ id: a.id, action: a.action, actor: a.actor, metadata: JSON.parse(a.metadata || "{}"), createdAt: a.createdAt })) });
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { type, entityId, title, reason } = await req.json();
  if (!type || !entityId) return NextResponse.json({ error: "请提供审批类型和实体 ID" }, { status: 400 });

  await getDb().auditLog.create({
    data: {
      tenantId: auth.tenant.id, actor: auth.user.email, action: "approval.requested",
      entityType: type, entityId, metadata: JSON.stringify({ title, reason, status: "pending" }),
    },
  });
  return NextResponse.json({ ok: true, message: "审批请求已提交" });
}

export async function PATCH(req: NextRequest) {
  const auth = await getCurrentAuth();
  if (!auth || auth.user.role !== "admin") return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  const { approvalId, approved, comment } = await req.json();
  const action = approved ? "approval.approved" : "approval.rejected";

  const original = await getDb().auditLog.findUnique({ where: { id: approvalId } });
  if (!original || original.tenantId !== auth.tenant.id) {
    return NextResponse.json({ error: "未找到该审批请求" }, { status: 404 });
  }

  await getDb().auditLog.create({
    data: {
      tenantId: auth.tenant.id, actor: auth.user.email, action,
      entityType: original.entityType, entityId: original.entityId,
      metadata: JSON.stringify({ ...JSON.parse(original.metadata || "{}"), status: approved ? "approved" : "rejected", comment, reviewedBy: auth.user.email }),
    },
  });
  return NextResponse.json({ ok: true, message: approved ? "已批准" : "已拒绝" });
}
