import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveWorkspace } from "@/lib/workspace";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/access-control";

const organizationSchema = z.object({
  name: z.string().min(1),
  stage: z.enum(["opc", "small_team", "seed", "growth", "mature", "incubator"]).optional(),
  industry: z.string().min(1),
  product: z.string().min(1),
  market: z.string().min(1),
  cashflow: z.number().int().min(0).max(100).optional(),
  revenue: z.string().min(1),
  teamSize: z.number().int().min(1),
  governanceStructure: z.string().min(1),
  keyRisks: z.string().optional(),
});

export async function GET() {
  const workspace = await getActiveWorkspace();
  return NextResponse.json({ organization: workspace?.organizationProfile ?? null });
}

export async function PUT(request: Request) {
  const session = await requireAuth();
  if ("error" in session) return session.error;

  const workspace = await getActiveWorkspace();
  if (!workspace) return NextResponse.json({ error: "请先创建沙盘工作区" }, { status: 404 });

  const input = organizationSchema.parse(await request.json());
  const organization = await getDb().organizationProfile.update({
    where: { id: workspace.organizationProfileId },
    data: input,
  });
  return NextResponse.json({ organization });
}
