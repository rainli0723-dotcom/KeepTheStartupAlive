import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canEditTenant, getCurrentAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { buildTenantFinaleWhere } from "@/lib/enterprise-safety";
import { writeAuditLog } from "@/lib/tenant";

const commentSchema = z.object({
  body: z.string().min(1).max(1000),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { id } = await context.params;
  const finale = await getDb().simulationFinale.findFirst({
    where: buildTenantFinaleWhere(id, auth.tenant.id),
    select: { id: true },
  });
  if (!finale) return NextResponse.json({ error: "报告不存在或不属于当前企业" }, { status: 404 });

  const comments = await getDb().collaborationComment.findMany({
    where: { tenantId: auth.tenant.id, finaleId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ comments });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!canEditTenant(auth.user.role)) return NextResponse.json({ error: "需要编辑权限" }, { status: 403 });

  const { id } = await context.params;
  const input = commentSchema.parse(await request.json());
  const finale = await getDb().simulationFinale.findFirst({
    where: buildTenantFinaleWhere(id, auth.tenant.id),
    select: { id: true },
  });
  if (!finale) return NextResponse.json({ error: "报告不存在或不属于当前企业" }, { status: 404 });

  const comment = await getDb().collaborationComment.create({
    data: {
      id: randomUUID(),
      tenantId: auth.tenant.id,
      finaleId: id,
      authorId: auth.user.id,
      author: auth.user.name,
      body: input.body.trim(),
    },
  });

  await writeAuditLog({
    tenantId: auth.tenant.id,
    actor: auth.user.email,
    action: "report.comment.created",
    entityType: "CollaborationComment",
    entityId: comment.id,
    metadata: { finaleId: id },
  });

  return NextResponse.json({ comment });
}
