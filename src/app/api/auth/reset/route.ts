import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const requestSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string(), newPassword: z.string().min(8) });

// In-memory token store (use DB in production)
const resetTokens = new Map<string, { email: string; expiresAt: number }>();

/** POST — request password reset link (sends token via email in production) */
export async function POST(req: NextRequest) {
  const { email } = requestSchema.parse(await req.json());
  const db = getDb();
  const user = await db.appUser.findUnique({ where: { email } });

  // Always return success to prevent email enumeration
  if (!user) {
    return NextResponse.json({ ok: true, message: "如果该邮箱已注册，重置链接将发送到你的邮箱。" });
  }

  const token = randomUUID();
  resetTokens.set(token, { email, expiresAt: Date.now() + 3600000 }); // 1 hour

  // In production: send email with reset link
  // await sendResetEmail(email, `${process.env.KTSA_APP_URL}/reset?token=${token}`);

  // For now, return the token directly (dev mode)
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({
      ok: true,
      token, // dev only
      resetUrl: `${process.env.KTSA_APP_URL || "http://localhost:3000"}/login?reset=${token}`,
    });
  }

  return NextResponse.json({ ok: true, message: "重置链接已发送到你的邮箱。" });
}

/** PUT — complete password reset with token */
export async function PUT(req: NextRequest) {
  const { token, newPassword } = resetSchema.parse(await req.json());

  const entry = resetTokens.get(token);
  if (!entry || entry.expiresAt < Date.now()) {
    return NextResponse.json({ error: "重置链接已过期或无效。请重新请求密码重置。" }, { status: 400 });
  }

  const db = getDb();
  const user = await db.appUser.findUnique({ where: { email: entry.email } });
  if (!user) {
    resetTokens.delete(token);
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  await db.appUser.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(newPassword) },
  });

  // Invalidate all existing sessions
  await db.authSession.deleteMany({ where: { userId: user.id } });
  resetTokens.delete(token);

  return NextResponse.json({ ok: true, message: "密码已重置，请使用新密码登录。" });
}
