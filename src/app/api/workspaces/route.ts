import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { ensureDefaultTenant, writeAuditLog } from "@/lib/tenant";

const workspaceActionSchema = z.object({
  workspaceId: z.string().min(1),
});

export async function GET() {
  const workspaces = await getDb().simulationWorkspace.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      tenant: true,
      organizationProfile: true,
      _count: {
        select: {
          teamMembers: true,
          meetings: true,
          events: true,
        },
      },
    },
  });

  return NextResponse.json({
    workspaces: workspaces.map((workspace, index) => ({
      id: workspace.id,
      name: workspace.name,
      status: workspace.status,
      currentCycle: workspace.currentCycle,
      organizationName: workspace.organizationProfile.name,
      industry: workspace.organizationProfile.industry,
      product: workspace.organizationProfile.product,
      updatedAt: workspace.updatedAt.toISOString(),
      createdAt: workspace.createdAt.toISOString(),
      isActive: index === 0,
      tenant: workspace.tenant ? { id: workspace.tenant.id, name: workspace.tenant.name } : null,
      counts: workspace._count,
    })),
  });
}

export async function PATCH(request: Request) {
  const input = workspaceActionSchema.parse(await request.json());
  const tenant = await ensureDefaultTenant();
  const workspace = await getDb().simulationWorkspace.update({
    where: { id: input.workspaceId },
    data: { updatedAt: new Date(), tenantId: tenant.id },
  });
  await writeAuditLog({
    tenantId: tenant.id,
    action: "workspace.activated",
    entityType: "SimulationWorkspace",
    entityId: workspace.id,
    metadata: { name: workspace.name },
  });

  return NextResponse.json({ workspace });
}
