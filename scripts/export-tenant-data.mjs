import fs from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const tenantId = process.argv.find((arg) => arg.startsWith("--tenant="))?.split("=", 2)[1];
const output = process.argv.find((arg) => arg.startsWith("--out="))?.split("=", 2)[1] || `tenant-export-${Date.now()}.json`;

if (!tenantId) {
  console.error("Usage: node scripts/export-tenant-data.mjs --tenant=<tenantId> --out=tenant-export.json");
  process.exit(1);
}

const db = new PrismaClient();

try {
  const tenant = await db.enterpriseTenant.findUnique({
    where: { id: tenantId },
    include: {
      members: true,
      users: { select: { id: true, tenantId: true, name: true, email: true, role: true, status: true, createdAt: true, updatedAt: true } },
      workspaces: {
        include: {
          organizationProfile: { include: { documents: true, archives: true } },
          teamMembers: { include: { sourceDocuments: true, distillationProfile: true } },
          events: true,
          meetings: { include: { businessEvent: true, decisionOptions: true } },
          finales: { include: { shareLinks: true, comments: true } },
        },
      },
      auditLogs: true,
      llmCallLogs: true,
      llmJobs: true,
      promptVersions: true,
      reportShareLinks: true,
      comments: true,
    },
  });

  if (!tenant) {
    console.error(`Tenant not found: ${tenantId}`);
    process.exit(2);
  }

  await fs.writeFile(output, JSON.stringify({ exportedAt: new Date().toISOString(), tenant }, null, 2), "utf8");
  console.log(`Exported tenant ${tenantId} to ${output}`);
} finally {
  await db.$disconnect();
}
