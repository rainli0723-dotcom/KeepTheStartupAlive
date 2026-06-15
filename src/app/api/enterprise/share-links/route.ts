import { NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const links = await getDb().reportShareLink.findMany({
    where: { tenantId: auth.tenant.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      status: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      createdBy: true,
      finaleId: true,
    },
  });

  return NextResponse.json({ links });
}
