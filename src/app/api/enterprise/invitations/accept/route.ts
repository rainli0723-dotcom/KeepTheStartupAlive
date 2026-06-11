import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, hashPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { writeAuditLog } from "@/lib/tenant";

const acceptSchema = z.object({
  token: z.string().min(20),
  name: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const input = acceptSchema.parse(await request.json());
  const tokenHash = createHash("sha256").update(input.token).digest("hex");
  const invitation = await getDb().tenantInvitation.findUnique({ where: { tokenHash }, include: { tenant: true } });
  if (!invitation || invitation.status !== "pending" || invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invitation is invalid or expired" }, { status: 400 });
  }

  const user = await getDb().appUser.create({
    data: {
      tenantId: invitation.tenantId,
      name: input.name.trim(),
      email: invitation.email,
      passwordHash: hashPassword(input.password),
      role: invitation.role,
      status: "active",
    },
  });

  await getDb().tenantMember.updateMany({
    where: { tenantId: invitation.tenantId, email: invitation.email },
    data: { userId: user.id, name: user.name, role: invitation.role },
  });
  await getDb().tenantInvitation.update({
    where: { id: invitation.id },
    data: { status: "accepted", acceptedAt: new Date() },
  });
  await writeAuditLog({
    tenantId: invitation.tenantId,
    actor: user.email,
    action: "tenant.invitation.accepted",
    entityType: "TenantInvitation",
    entityId: invitation.id,
    metadata: { role: invitation.role },
  });
  await createSession(user.id);

  return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role }, tenant: invitation.tenant });
}
