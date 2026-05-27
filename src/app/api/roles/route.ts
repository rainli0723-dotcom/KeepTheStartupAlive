import { NextResponse } from "next/server";
import { ensureRoleTemplates } from "@/lib/seed";
import { getDb } from "@/lib/db";
import { parseCapabilities, parseMetrics, parseStringList } from "@/lib/serializers";

export async function GET() {
  await ensureRoleTemplates();
  const roles = await getDb().roleTemplate.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  return NextResponse.json({
    roles: roles.map((role) => ({
      ...role,
      stages: parseStringList(role.stages),
      sandboxTypes: parseStringList(role.sandboxTypes),
      defaultCapabilities: parseCapabilities(role.defaultCapabilities),
      defaultMetrics: parseMetrics(role.defaultMetrics),
    })),
  });
}
