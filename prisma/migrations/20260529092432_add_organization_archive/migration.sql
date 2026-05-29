-- CreateTable
CREATE TABLE "OrganizationArchive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "cashflow" INTEGER NOT NULL,
    "revenue" TEXT NOT NULL,
    "teamSize" INTEGER NOT NULL,
    "governanceStructure" TEXT NOT NULL,
    "keyRisks" TEXT NOT NULL,
    "organizationProfileId" TEXT NOT NULL,
    "simulationEndedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalOutcome" TEXT,
    "finalScore" INTEGER,
    CONSTRAINT "OrganizationArchive_organizationProfileId_fkey" FOREIGN KEY ("organizationProfileId") REFERENCES "OrganizationProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
