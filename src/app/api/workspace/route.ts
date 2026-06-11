import { NextResponse } from "next/server";
import { z } from "zod";
import { canEdit } from "@/lib/access-control";
import { getCurrentAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { defaultOrganizationState } from "@/lib/domain";
import { ensureWorkspaceRoleTemplates } from "@/lib/seed";
import { parseState, toJson } from "@/lib/serializers";
import { serializeLockedMemberIds } from "@/lib/simulation-run";
import { getActiveTenant, writeAuditLog } from "@/lib/tenant";
import { getActiveWorkspace } from "@/lib/workspace";

const workspacePatchSchema = z.object({
  userRole: z.string().min(1).optional(),
  status: z.enum(["active", "running", "ended"]).optional(),
  startNewRun: z.boolean().optional(),
  selectedMemberIds: z.array(z.string()).optional(),
  selectedScenarioId: z.string().optional().nullable(),
  situation: z.string().optional(),
});

async function createStarterWorkspace(tenantId: string) {
  const db = getDb();
  const organization = await db.organizationProfile.create({
    data: {
      name: "我的公司",
      stage: "seed",
      industry: "待补充",
      product: "待补充",
      market: "待补充",
      cashflow: 60,
      revenue: "待补充",
      teamSize: 1,
      governanceStructure: "创始团队负责制",
      keyRisks: toJson([]),
    },
  });

  const workspace = await db.simulationWorkspace.create({
    data: {
      tenantId,
      name: "默认沙盘工作区",
      organizationStage: "seed",
      sandboxType: "growth",
      currentCycle: 1,
      status: "active",
      userRole: "CEO",
      organizationState: toJson(defaultOrganizationState()),
      selectedRoleNames: toJson([]),
      organizationProfileId: organization.id,
    },
  });

  await ensureWorkspaceRoleTemplates(workspace.id);

  await writeAuditLog({
    tenantId,
    action: "workspace.starter_created",
    entityType: "SimulationWorkspace",
    entityId: workspace.id,
    metadata: { name: workspace.name },
  });
}

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
  const auth = await getCurrentAuth();
  if (auth && !canEdit(auth.user.role)) {
    return NextResponse.json({ error: "当前账号没有编辑权限" }, { status: 403 });
  }

  const tenant = auth?.tenant ?? await getActiveTenant();
  let workspace = await getActiveWorkspace();
  if (!workspace) {
    await createStarterWorkspace(tenant.id);
    workspace = await getActiveWorkspace();
  }

  if (!workspace || workspace.tenantId !== tenant.id) {
    return NextResponse.json({ error: "未找到当前企业空间下的沙盘工作区" }, { status: 404 });
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
    tenantId: tenant.id,
    actor: auth?.user.email ?? "演示用户",
    action: input.startNewRun ? "workspace.run_restarted" : "workspace.updated",
    entityType: "SimulationWorkspace",
    entityId: workspace.id,
    metadata: { selectedScenarioId: input.selectedScenarioId, status: input.status },
  });

  return NextResponse.json({ workspace: updated });
}
