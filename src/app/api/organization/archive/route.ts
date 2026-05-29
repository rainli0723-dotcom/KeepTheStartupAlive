import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { ensureDatabase } from "@/lib/bootstrap-db";

const archiveSchema = z.object({
  organizationProfileId: z.string(),
  name: z.string(),
  stage: z.string(),
  industry: z.string(),
  product: z.string(),
  market: z.string(),
  cashflow: z.number(),
  revenue: z.string(),
  teamSize: z.number(),
  governanceStructure: z.string(),
  keyRisks: z.string().optional(),
  finalOutcome: z.string().optional(),
  finalScore: z.number().optional(),
});

type ArchiveRow = {
  id: string;
  organizationProfileId: string;
  name: string;
  stage: string;
  industry: string;
  product: string;
  market: string;
  cashflow: number;
  revenue: string;
  teamSize: number;
  governanceStructure: string;
  keyRisks: string;
  simulationEndedAt: string;
  finalOutcome: string | null;
  finalScore: number | null;
};

export async function GET(request: Request) {
  await ensureDatabase();
  const db = getDb();
  const url = new URL(request.url);
  const profileId = url.searchParams.get("profileId");

  let archives;
  if (profileId) {
    archives = await db.$queryRaw<ArchiveRow[]>`SELECT * FROM OrganizationArchive WHERE organizationProfileId = ${profileId} ORDER BY simulationEndedAt DESC`;
  } else {
    archives = await db.$queryRaw<ArchiveRow[]>`SELECT * FROM OrganizationArchive ORDER BY simulationEndedAt DESC`;
  }

  return NextResponse.json({ archives: archives || [] });
}

export async function POST(request: Request) {
  await ensureDatabase();
  const db = getDb();

  const input = archiveSchema.parse(await request.json());
  const id = randomUUID();

  await db.$executeRaw`
    INSERT INTO OrganizationArchive (
      id, organizationProfileId, name, stage, industry, product, market,
      cashflow, revenue, teamSize, governanceStructure, keyRisks, finalOutcome, finalScore, simulationEndedAt
    )
    VALUES (
      ${id}, ${input.organizationProfileId}, ${input.name}, ${input.stage}, ${input.industry},
      ${input.product}, ${input.market}, ${input.cashflow}, ${input.revenue},
      ${input.teamSize}, ${input.governanceStructure}, ${input.keyRisks || "[]"},
      ${input.finalOutcome || null}, ${input.finalScore || null}, CURRENT_TIMESTAMP
    )
  `;

  return NextResponse.json({ id, success: true });
}