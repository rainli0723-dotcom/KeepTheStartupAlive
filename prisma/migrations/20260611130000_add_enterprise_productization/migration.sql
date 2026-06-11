-- CreateTable
CREATE TABLE "TenantInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invitedBy" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TenantInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "EnterpriseTenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "task" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "outputSchema" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdBy" TEXT NOT NULL DEFAULT 'system',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PromptVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "EnterpriseTenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportShareLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "finaleId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" DATETIME,
    "createdBy" TEXT NOT NULL DEFAULT 'system',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "ReportShareLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "EnterpriseTenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReportShareLink_finaleId_fkey" FOREIGN KEY ("finaleId") REFERENCES "SimulationFinale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "LlmCallLog" ADD COLUMN "estimatedCostUsd" REAL;
ALTER TABLE "LlmCallLog" ADD COLUMN "promptVersionId" TEXT;
ALTER TABLE "LlmCallLog" ADD COLUMN "modelConfig" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "LlmJob" ADD COLUMN "timeoutMs" INTEGER NOT NULL DEFAULT 60000;
ALTER TABLE "LlmJob" ADD COLUMN "runAfter" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "TenantInvitation_tokenHash_key" ON "TenantInvitation"("tokenHash");
CREATE UNIQUE INDEX "PromptVersion_tenantId_task_version_key" ON "PromptVersion"("tenantId", "task", "version");
CREATE UNIQUE INDEX "ReportShareLink_tokenHash_key" ON "ReportShareLink"("tokenHash");

-- SQLite cannot add foreign keys with ALTER TABLE for existing tables. Prisma keeps relation metadata in schema.
