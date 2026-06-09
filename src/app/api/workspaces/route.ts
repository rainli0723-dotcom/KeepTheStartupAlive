import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";

const workspaceActionSchema = z.object({
  workspaceId: z.string().min(1),
});

export async function GET() {
  const workspaces = await getDb().simulationWorkspace.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
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
      counts: workspace._count,
    })),
  });
}

export async function PATCH(request: Request) {
  const input = workspaceActionSchema.parse(await request.json());
  const workspace = await getDb().simulationWorkspace.update({
    where: { id: input.workspaceId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ workspace });
}
