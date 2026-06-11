import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageTenant, getCurrentAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { writeAuditLog } from "@/lib/tenant";

const memberSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(["admin", "editor", "viewer"]),
});

export async function POST(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "Please login first" }, { status: 401 });
  if (!canManageTenant(auth.user.role)) return NextResponse.json({ error: "Admin permission required" }, { status: 403 });

  const input = memberSchema.parse(await request.json());
  const email = input.email ? input.email.trim().toLowerCase() : null;
  const member = await getDb().tenantMember.create({
    data: {
      id: randomUUID(),
      tenantId: auth.tenant.id,
      name: input.name.trim(),
      email,
      role: input.role,
    },
  });

  let invitationUrl: string | null = null;
  if (email) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await getDb().tenantInvitation.create({
      data: {
        id: randomUUID(),
        tenantId: auth.tenant.id,
        email,
        role: input.role,
        tokenHash,
        invitedBy: auth.user.email,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    invitationUrl = `/register?invite=${token}`;
  }

  await writeAuditLog({
    tenantId: auth.tenant.id,
    actor: auth.user.email,
    action: "tenant.member.invited",
    entityType: "TenantMember",
    entityId: member.id,
    metadata: { email: member.email, role: member.role, invitationCreated: Boolean(invitationUrl) },
  });

  return NextResponse.json({ member, invitationUrl });
}
