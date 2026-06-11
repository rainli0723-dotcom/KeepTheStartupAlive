import { NextResponse } from "next/server";
import { z } from "zod";
import { requireEditor } from "@/lib/access-control";
import { getDb } from "@/lib/db";
import { parseState } from "@/lib/serializers";
import { serializeLockedMemberIds } from "@/lib/simulation-run";
import { writeAuditLog } from "@/lib/tenant";
import { getActiveWorkspace } from "@/lib/workspace";

const workspacePatchSchema = z.object({
  userRole: z.string().min(1).optional(),
  status: z.enum(["active", "running", "ended"]).optional(),
  startNewRun: z.boolean().optional(),
  selectedMemberIds: z.array(z.string()).optional(),
  selectedScenarioId: z.string().optional().nullable(),
  situation: z.string().optional(),
});

export async function GET() {
  const workspace = await getActiveWorkspace();
  if (!workspace) return NextResponse.json({ workspace: null });
  return NextResponse.json({
    workspace: {
      ...workspace,
      organizationState: parseState(workspace.organizationState),
    },
  });
}

export async function PATCH(request: Request) {
  const access = await requireEditor();
  if ("error" in access) return access.error;

  const workspace = await getActiveWorkspace();
  if (!workspace || workspace.tenantId !== access.auth.tenant.id) {
    return NextResponse.json({ error: "Workspace not found in this tenant" }, { status: 404 });
  }

  const input = workspacePatchSchema.parse(await request.json());
  const db = getDb();

  if (input.startNewRun) {
    await db.decisionOption.deleteMany({ where: { meeting: { workspaceId: workspace.id } } });
    await db.strategyMeeting.deleteMany({ where: { workspaceId: workspace.id } });
    await db.businessEvent.deleteMany({ where: { workspaceId: workspace.id } });
    await db.$executeRaw`DELETE FROM SimulationFinale WHERE workspaceId = ${workspace.id}`;
  }

  const updated = await db.simulationWorkspace.update({
    where: { id: workspace.id },
    data: {
      ...(input.userRole ? { userRole: input.userRole } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.selectedMemberIds ? { selectedRoleNames: serializeLockedMemberIds(input.selectedMemberIds) } : {}),
      ...(input.startNewRun ? { currentCycle: 1, status: "running" } : {}),
      ...(input.selectedScenarioId !== undefined ? { selectedScenarioId: input.selectedScenarioId } : {}),
    },
  });

  await writeAuditLog({
    tenantId: access.auth.tenant.id,
    actor: access.auth.user.email,
    action: input.startNewRun ? "workspace.run_restarted" : "workspace.updated",
    entityType: "SimulationWorkspace",
    entityId: workspace.id,
    metadata: { selectedScenarioId: input.selectedScenarioId, status: input.status },
  });

  return NextResponse.json({ workspace: updated });
}
