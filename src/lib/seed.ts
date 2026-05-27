import { getDb } from "./db";
import { defaultScenarios, roleTemplates } from "./domain";
import { toJson } from "./serializers";
import { ensureDatabase } from "./bootstrap-db";

export async function ensureRoleTemplates() {
  await ensureDatabase();
  const db = getDb();
  const count = await db.roleTemplate.count();
  if (count >= roleTemplates.length) return;

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
