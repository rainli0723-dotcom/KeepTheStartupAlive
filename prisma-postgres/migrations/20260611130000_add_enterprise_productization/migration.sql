-- CreateTable
CREATE TABLE "TenantInvitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "task" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "outputSchema" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdBy" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportShareLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "finaleId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ReportShareLink_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "LlmCallLog" ADD COLUMN "estimatedCostUsd" DOUBLE PRECISION;
ALTER TABLE "LlmCallLog" ADD COLUMN "promptVersionId" TEXT;
ALTER TABLE "LlmCallLog" ADD COLUMN "modelConfig" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "LlmJob" ADD COLUMN "timeoutMs" INTEGER NOT NULL DEFAULT 60000;
ALTER TABLE "LlmJob" ADD COLUMN "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "TenantInvitation_tokenHash_key" ON "TenantInvitation"("tokenHash");
CREATE UNIQUE INDEX "PromptVersion_tenantId_task_version_key" ON "PromptVersion"("tenantId", "task", "version");
CREATE UNIQUE INDEX "ReportShareLink_tokenHash_key" ON "ReportShareLink"("tokenHash");

-- AddForeignKey
ALTER TABLE "TenantInvitation" ADD CONSTRAINT "TenantInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "EnterpriseTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "EnterpriseTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LlmCallLog" ADD CONSTRAINT "LlmCallLog_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReportShareLink" ADD CONSTRAINT "ReportShareLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "EnterpriseTenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReportShareLink" ADD CONSTRAINT "ReportShareLink_finaleId_fkey" FOREIGN KEY ("finaleId") REFERENCES "SimulationFinale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
