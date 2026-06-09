import { NextResponse } from "next/server";
import { z } from "zod";
import {
  defaultOrganizationState,
  getRecommendedRoleTemplates,
  type OrganizationStage,
  type SandboxType,
} from "@/lib/domain";
import { getDb } from "@/lib/db";
import { toJson } from "@/lib/serializers";
import { ensureRoleTemplates } from "@/lib/seed";
import { assignWorkspaceToDefaultTenant, writeAuditLog } from "@/lib/tenant";

const setupSchema = z.object({
  name: z.string().min(1),
  industry: z.string().min(1),
  product: z.string().min(1),
  market: z.string().min(1),
  stage: z.enum(["opc", "small_team", "seed", "growth", "mature", "incubator"]),
  sandboxType: z.enum([
    "legal_compliance",
    "financing",
    "pricing",
    "market_competition",
    "organization",
    "crisis",
    "growth",
  ]),
  userRole: z.string().min(1).default("CEO"),
});

export async function POST(request: Request) {
  await ensureRoleTemplates();
  const input = setupSchema.parse(await request.json());
  const db = getDb();
  const recommended = getRecommendedRoleTemplates({
    organizationStage: input.stage as OrganizationStage,
    sandboxType: input.sandboxType as SandboxType,
  }).slice(0, input.stage === "opc" ? 8 : 12);

  const organization = await db.organizationProfile.create({
    data: {
      name: input.name,
      stage: input.stage,
      industry: input.industry,
      product: input.product,
      market: input.market,
      keyRisks: toJson(["现金流波动", "关键角色缺口", "市场响应不确定"]),
    },
  });

  const workspace = await db.simulationWorkspace.create({
    data: {
      name: `${input.name} - 商业模拟沙盘`,
      organizationStage: input.stage,
      sandboxType: input.sandboxType,
      userRole: input.userRole,
      organizationState: toJson(defaultOrganizationState()),
      selectedRoleNames: toJson(recommended.map((role) => role.name)),
      organizationProfileId: organization.id,
      teamMembers: {
        create: recommended.map((role) => ({
          name: role.name,
          roleName: role.name,
          isRealMember: false,
          capabilities: toJson(role.defaultCapabilities),
          customMetrics: toJson(role.defaultMetrics),
          personality: role.description,
          communicationStyle: "专业、直接、基于证据表达观点",
          decisionPreference: "在风险和机会之间寻找可执行的平衡方案",
        })),
      },
    },
    include: { teamMembers: true, organizationProfile: true },
  });
  const tenant = await assignWorkspaceToDefaultTenant(workspace.id);
  await writeAuditLog({
    tenantId: tenant.id,
    action: "workspace.created",
    entityType: "SimulationWorkspace",
    entityId: workspace.id,
    metadata: { source: "setup", name: workspace.name, organization: organization.name },
  });

  return NextResponse.json({ workspace });
}
