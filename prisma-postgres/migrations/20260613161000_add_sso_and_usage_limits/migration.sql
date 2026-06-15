CREATE TABLE "TenantSsoSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disabled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSsoSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantSsoSetting_tenantId_provider_key" ON "TenantSsoSetting"("tenantId", "provider");

ALTER TABLE "TenantSsoSetting"
ADD CONSTRAINT "TenantSsoSetting_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "EnterpriseTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TenantUsageLimit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "monthlyLlmCalls" INTEGER NOT NULL DEFAULT 500,
    "monthlyExports" INTEGER NOT NULL DEFAULT 50,
    "monthlyWorkspaces" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantUsageLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantUsageLimit_tenantId_key" ON "TenantUsageLimit"("tenantId");

ALTER TABLE "TenantUsageLimit"
ADD CONSTRAINT "TenantUsageLimit_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "EnterpriseTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
