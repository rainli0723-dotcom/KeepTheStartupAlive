import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentAuth, hashSessionToken, sessionCookieName } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const sessions = await getDb().authSession.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, expiresAt: true, createdAt: true },
  });
  return NextResponse.json({ sessions });
}

export async function DELETE() {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const currentTokenHash = token ? hashSessionToken(token) : "";

  const result = await getDb().authSession.deleteMany({
    where: {
      userId: auth.user.id,
      tokenHash: { not: currentTokenHash },
    },
  });

  return NextResponse.json({ ok: true, deleted: result.count });
}
