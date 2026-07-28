import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth || auth.user.role !== "admin") {
    return NextResponse.json({ error: "需要超级管理员权限" }, { status: 403 });
  }
  const db = getDb();
  const tenants = await db.enterpriseTenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true, workspaces: true, auditLogs: true } } },
  });
  return NextResponse.json({ tenants });
}

export async function PATCH(req: NextRequest) {
  const auth = await getCurrentAuth();
  if (!auth || auth.user.role !== "admin") {
    return NextResponse.json({ error: "需要超级管理员权限" }, { status: 403 });
  }
  const { id, status, plan } = await req.json();
  const db = getDb();
  await db.enterpriseTenant.update({ where: { id }, data: { ...(status ? { status } : {}), ...(plan ? { plan } : {}) } });
  return NextResponse.json({ ok: true });
}
