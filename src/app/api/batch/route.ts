import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { getActiveTenant } from "@/lib/tenant";
import { getActiveWorkspace } from "@/lib/workspace";
import { getCurrentAuth } from "@/lib/auth";
import { canEdit } from "@/lib/access-control";
import { defaultOrganizationState, type OrganizationState } from "@/lib/domain";
import { toJson } from "@/lib/serializers";

export const dynamic = "force-dynamic";

/**
 * POST /api/batch
 *
 * Creates multiple simulation workspaces with different parameter combinations
 * for side-by-side comparison. Max 5 variants per batch.
 *
 * Body: {
 *   variants: Array<{
 *     label: string;
 *     cashflowOverride?: number;
 *     teamSizeOverride?: number;
 *     scenarioId?: string;
 *   }>
 * }
 */
export async function POST(req: NextRequest) {
  const auth = await getCurrentAuth();
  if (!auth || !canEdit(auth.user.role)) {
    return NextResponse.json({ error: "需要管理员或编辑者权限" }, { status: 403 });
  }
  const tenant = await getActiveTenant();
  const baseWorkspace = await getActiveWorkspace();

  if (!baseWorkspace) {
    return NextResponse.json({ error: "请先创建一个基准工作区" }, { status: 400 });
  }

  let body: { variants: { label: string; cashflowOverride?: number; teamSizeOverride?: number; scenarioId?: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的请求格式" }, { status: 400 });
  }

  const { variants } = body;
  if (!Array.isArray(variants) || variants.length === 0) {
    return NextResponse.json({ error: "请至少提供一个变体配置" }, { status: 400 });
  }
  if (variants.length > 5) {
    return NextResponse.json({ error: "批量模拟最多支持 5 个变体" }, { status: 400 });
  }

  const db = getDb();
  const batchId = randomUUID();
  const results = [];

  for (const variant of variants) {
    const orgState: OrganizationState = {
      ...defaultOrganizationState(),
      ...(variant.cashflowOverride !== undefined ? { cashflow: variant.cashflowOverride } : {}),
      ...(variant.teamSizeOverride !== undefined ? { teamSize: variant.teamSizeOverride } : {}),
    };

    const workspace = await db.simulationWorkspace.create({
      data: {
        name: `${variant.label} — 批量模拟`,
        organizationStage: baseWorkspace.organizationStage,
        sandboxType: baseWorkspace.sandboxType,
        currentCycle: 1,
        status: "active",
        organizationState: toJson(orgState),
        selectedRoleNames: baseWorkspace.selectedRoleNames,
        userRole: baseWorkspace.userRole,
        tenantId: tenant.id,
        organizationProfileId: baseWorkspace.organizationProfileId,
        selectedScenarioId: variant.scenarioId || baseWorkspace.selectedScenarioId,
      },
    });

    // Copy team members from base workspace
    const baseMembers = await db.teamMember.findMany({
      where: { workspaceId: baseWorkspace.id },
      select: {
        name: true, roleName: true, isRealMember: true,
        capabilities: true, customMetrics: true, personality: true,
        communicationStyle: true, decisionPreference: true,
        distillationProfile: { select: {
          languageStyle: true, decisionPreference: true, values: true,
          pressureResponse: true, capabilityTendency: true, typicalPhrases: true,
          professionalBoundary: true, rawProfile: true,
        }},
      },
    });

    for (const member of baseMembers) {
      const newMember = await db.teamMember.create({
        data: {
          workspaceId: workspace.id,
          name: member.name,
          roleName: member.roleName,
          isRealMember: member.isRealMember,
          capabilities: member.capabilities,
          customMetrics: member.customMetrics,
          personality: member.personality,
          communicationStyle: member.communicationStyle,
          decisionPreference: member.decisionPreference,
        },
      });

      if (member.distillationProfile) {
        await db.distillationProfile.create({
          data: {
            teamMemberId: newMember.id,
            ...member.distillationProfile,
          },
        });
      }
    }

    results.push({
      id: workspace.id,
      label: variant.label,
      status: "created",
    });
  }

  // Log the batch
  await db.auditLog.create({
    data: {
      tenantId: tenant.id,
      actor: "batch_simulation",
      action: "batch.created",
      entityType: "Batch",
      entityId: batchId,
      metadata: toJson({ batchId, count: results.length, variants: variants.map(v => v.label) }),
    },
  });

  return NextResponse.json({ batchId, workspaces: results });
}

/**
 * GET /api/batch?batchId=xxx
 *
 * Returns comparison data for all workspaces in a batch.
 */
export async function GET(req: NextRequest) {
  const tenant = await getActiveTenant();
  const batchId = req.nextUrl.searchParams.get("batchId");
  if (!batchId) {
    return NextResponse.json({ error: "缺少 batchId" }, { status: 400 });
  }

  const db = getDb();
  const batchLog = await db.auditLog.findFirst({
    where: { tenantId: tenant.id, action: "batch.created", entityId: batchId },
  });
  if (!batchLog) {
    return NextResponse.json({ error: "未找到该批量任务" }, { status: 404 });
  }

  const meta = JSON.parse(batchLog.metadata) as { batchId: string; count: number; variants: string[] };

  const finales = await db.simulationFinale.findMany({
    where: {
      workspace: { tenantId: tenant.id },
    },
    include: {
      workspace: { select: { id: true, name: true, status: true, currentCycle: true } },
    },
    orderBy: { createdAt: "desc" },
    take: meta.count,
  });

  return NextResponse.json({
    batchId,
    variants: meta.variants,
    results: finales.map(f => ({
      workspaceId: f.workspaceId,
      workspaceName: f.workspace.name,
      status: f.workspace.status,
      currentCycle: f.workspace.currentCycle,
      outcomeType: f.outcomeType,
      title: f.title,
      score: f.score,
      summary: f.summary,
    })),
  });
}
