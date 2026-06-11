import { getDb } from "./db";
import { defaultScenarios, roleTemplates } from "./domain";
import { toJson } from "./serializers";
import { ensureDatabase } from "./bootstrap-db";

export async function ensureRoleTemplates() {
  await ensureDatabase();
  const db = getDb();

  for (const roleTemplate of roleTemplates) {
    await db.roleTemplate.upsert({
      where: { name: roleTemplate.name },
      create: {
        name: roleTemplate.name,
        category: roleTemplate.category,
        stages: toJson(roleTemplate.stages),
        sandboxTypes: toJson(roleTemplate.sandboxTypes),
        defaultCapabilities: toJson(roleTemplate.defaultCapabilities),
        defaultMetrics: toJson(roleTemplate.defaultMetrics),
        description: roleTemplate.description,
      },
      update: {
        category: roleTemplate.category,
        stages: toJson(roleTemplate.stages),
        sandboxTypes: toJson(roleTemplate.sandboxTypes),
        defaultCapabilities: toJson(roleTemplate.defaultCapabilities),
        defaultMetrics: toJson(roleTemplate.defaultMetrics),
        description: roleTemplate.description,
      },
    });
  }
}

export async function ensureWorkspaceRoleTemplates(workspaceId: string) {
  await ensureRoleTemplates();
  const db = getDb();
  const existingMembers = await db.teamMember.findMany({
    where: { workspaceId },
    select: { roleName: true },
  });
  const existingRoleNames = new Set(existingMembers.map((member) => member.roleName));
  const missingRoles = roleTemplates.filter((roleTemplate) => !existingRoleNames.has(roleTemplate.name));
  if (missingRoles.length === 0) return { added: 0 };

  await db.teamMember.createMany({
    data: missingRoles.map((roleTemplate) => ({
      workspaceId,
      name: roleTemplate.name,
      roleName: roleTemplate.name,
      isRealMember: false,
      capabilities: toJson(roleTemplate.defaultCapabilities),
      customMetrics: toJson(roleTemplate.defaultMetrics),
      personality: roleTemplate.description,
      communicationStyle: "简洁、直接、先给判断再说明依据",
      decisionPreference: "优先选择能在 30 天内验证、且不显著透支现金流的方案",
    })),
  });

  return { added: missingRoles.length };
}

export async function ensureScenarios() {
  await ensureDatabase();
  const db = getDb();
  const count = await db.scenario.count();
  if (count >= defaultScenarios.length) return;

  for (const scenario of defaultScenarios) {
    const existing = await db.scenario.findFirst({ where: { name: scenario.name } });
    if (existing) continue;

    await db.scenario.create({
      data: {
        name: scenario.name,
        sandboxType: scenario.sandboxType,
        stage: scenario.stage,
        description: scenario.description,
        nodes: {
          create: scenario.nodes.map((node, index) => ({
            nodeType: node.nodeType,
            title: node.title,
            content: node.content,
            effect: toJson(node.effect ?? {}),
            sortOrder: index,
          })),
        },
      },
    });
  }
}
