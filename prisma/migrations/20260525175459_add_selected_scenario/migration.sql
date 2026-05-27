-- CreateTable
CREATE TABLE "OrganizationProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "cashflow" INTEGER NOT NULL DEFAULT 60,
    "revenue" TEXT NOT NULL DEFAULT '尚未填写',
    "teamSize" INTEGER NOT NULL DEFAULT 1,
    "governanceStructure" TEXT NOT NULL DEFAULT '创始人负责制',
    "keyRisks" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrganizationDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationProfileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationDocument_organizationProfileId_fkey" FOREIGN KEY ("organizationProfileId") REFERENCES "OrganizationProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SimulationWorkspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "organizationStage" TEXT NOT NULL,
    "sandboxType" TEXT NOT NULL,
    "currentCycle" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "organizationState" TEXT NOT NULL,
    "selectedRoleNames" TEXT NOT NULL,
    "userRole" TEXT NOT NULL DEFAULT 'CEO',
    "selectedScenarioId" TEXT,
    "organizationProfileId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SimulationWorkspace_organizationProfileId_fkey" FOREIGN KEY ("organizationProfileId") REFERENCES "OrganizationProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SimulationFinale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "completedCycles" INTEGER NOT NULL,
    "outcomeType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "keyDrivers" TEXT NOT NULL,
    "decisionTrace" TEXT NOT NULL,
    "alternativeEndings" TEXT NOT NULL,
    "nextActions" TEXT NOT NULL,
    "rawReport" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SimulationFinale_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "SimulationWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoleTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "stages" TEXT NOT NULL,
    "sandboxTypes" TEXT NOT NULL,
    "defaultCapabilities" TEXT NOT NULL,
    "defaultMetrics" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "isRealMember" BOOLEAN NOT NULL DEFAULT false,
    "capabilities" TEXT NOT NULL,
    "customMetrics" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "communicationStyle" TEXT NOT NULL,
    "decisionPreference" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TeamMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "SimulationWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SourceDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamMemberId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SourceDocument_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DistillationProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamMemberId" TEXT NOT NULL,
    "languageStyle" TEXT NOT NULL,
    "decisionPreference" TEXT NOT NULL,
    "values" TEXT NOT NULL,
    "pressureResponse" TEXT NOT NULL,
    "capabilityTendency" TEXT NOT NULL,
    "typicalPhrases" TEXT NOT NULL,
    "professionalBoundary" TEXT NOT NULL,
    "rawProfile" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DistillationProfile_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sandboxType" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ScenarioNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    CONSTRAINT "ScenarioNode_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BusinessEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "cycle" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusinessEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "SimulationWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StrategyMeeting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "businessEventId" TEXT,
    "cycle" INTEGER NOT NULL,
    "chair" TEXT NOT NULL,
    "agenda" TEXT NOT NULL,
    "participantViews" TEXT NOT NULL,
    "userInput" TEXT NOT NULL,
    "conclusion" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StrategyMeeting_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "SimulationWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StrategyMeeting_businessEventId_fkey" FOREIGN KEY ("businessEventId") REFERENCES "BusinessEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecisionOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "upside" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "resourceNeed" TEXT NOT NULL,
    "impactScore" TEXT NOT NULL,
    "nextIndicators" TEXT NOT NULL,
    CONSTRAINT "DecisionOption_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "StrategyMeeting" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleTemplate_name_key" ON "RoleTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DistillationProfile_teamMemberId_key" ON "DistillationProfile"("teamMemberId");
