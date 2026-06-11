import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { writeAuditLog } from "@/lib/tenant";

const shareSchema = z.object({
  title: z.string().min(1).max(120).default("KTSA read-only report"),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "Please login first" }, { status: 401 });
  const { id } = await context.params;
  const input = shareSchema.parse(await request.json().catch(() => ({})));

  const finale = await getDb().simulationFinale.findUnique({
    where: { id },
    include: { workspace: true },
  });
  if (!finale || finale.workspace.tenantId !== auth.tenant.id) {
    return NextResponse.json({ error: "Report not found in this tenant" }, { status: 404 });
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const share = await getDb().reportShareLink.create({
    data: {
      id: randomUUID(),
      tenantId: auth.tenant.id,
      finaleId: id,
      tokenHash,
      title: input.title,
      createdBy: auth.user.email,
      expiresAt: input.expiresInDays ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000) : null,
    },
  });

  await writeAuditLog({
    tenantId: auth.tenant.id,
    actor: auth.user.email,
    action: "report.share_link.created",
    entityType: "ReportShareLink",
    entityId: share.id,
    metadata: { finaleId: id, expiresAt: share.expiresAt },
  });

  return NextResponse.json({ share, url: `/share/report/${token}` });
}
