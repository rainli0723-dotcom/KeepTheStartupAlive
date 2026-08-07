import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { toJson } from "@/lib/serializers";
import { requireAuth } from "@/lib/access-control";

const scenarioSchema = z.object({
  name: z.string().min(1),
  sandboxType: z.string().min(1),
  stage: z.string().min(1),
  description: z.string().min(1),
  nodes: z.array(
    z.object({
      nodeType: z.enum(["event", "decision", "condition", "result"]),
      title: z.string().min(1),
      content: z.string().min(1),
      effect: z.record(z.string(), z.number()).default({}),
    }),
  ),
});

export async function GET() {
  const scenarios = await getDb().scenario.findMany({
    orderBy: { updatedAt: "desc" },
    include: { nodes: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json({ scenarios });
}

export async function POST(request: Request) {
  const session = await requireAuth();
  if ("error" in session) return session.error;

  const input = scenarioSchema.parse(await request.json());
  if (!input.nodes.some((node) => node.nodeType === "event")) {
    return NextResponse.json({ error: "场景至少需要一个事件节点" }, { status: 400 });
  }
  if (!input.nodes.some((node) => node.nodeType === "result")) {
    return NextResponse.json({ error: "场景至少需要一个结果节点" }, { status: 400 });
  }
  const scenario = await getDb().scenario.create({
    data: {
      name: input.name,
      sandboxType: input.sandboxType,
      stage: input.stage,
      description: input.description,
      nodes: {
        create: input.nodes.map((node, index) => ({
          nodeType: node.nodeType,
          title: node.title,
          content: node.content,
          effect: toJson(node.effect),
          sortOrder: index,
        })),
      },
    },
    include: { nodes: true },
  });
  return NextResponse.json({ scenario });
}

export async function DELETE(request: Request) {
  const session = await requireAuth();
  if ("error" in session) return session.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  await getDb().scenario.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  const session = await requireAuth();
  if ("error" in session) return session.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  const input = scenarioSchema.parse(await request.json());
  const scenario = await getDb().scenario.update({
    where: { id },
    data: {
      name: input.name,
      sandboxType: input.sandboxType,
      stage: input.stage,
      description: input.description,
      nodes: {
        deleteMany: {},
        create: input.nodes.map((node, index) => ({
          nodeType: node.nodeType,
          title: node.title,
          content: node.content,
          effect: toJson(node.effect),
          sortOrder: index,
        })),
      },
    },
    include: { nodes: true },
  });
  return NextResponse.json({ scenario });
}
