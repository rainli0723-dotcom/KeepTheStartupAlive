import { getDb } from "./db";

let initialized = false;

export async function ensureDatabase() {
  if (initialized) return;
  if (isPostgresUrl(process.env.DATABASE_URL)) {
    initialized = true;
    return;
  }
  const db = getDb();
  await db.$executeRawUnsafe(`PRAGMA foreign_keys = ON`);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS OrganizationProfile (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      stage TEXT NOT NULL,
      industry TEXT NOT NULL,
      product TEXT NOT NULL,
      market TEXT NOT NULL,
      cashflow INTEGER NOT NULL DEFAULT 60,
      revenue TEXT NOT NULL DEFAULT 'not_set',
      teamSize INTEGER NOT NULL DEFAULT 1,
      governanceStructure TEXT NOT NULL DEFAULT 'founder_led',
      keyRisks TEXT NOT NULL DEFAULT '[]',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS EnterpriseTenant (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'trial',
      status TEXT NOT NULL DEFAULT 'active',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS TenantMember (
      id TEXT PRIMARY KEY NOT NULL,
      tenantId TEXT NOT NULL,
      userId TEXT,
      name TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'admin',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL,
      CONSTRAINT TenantMember_tenantId_fkey FOREIGN KEY (tenantId) REFERENCES EnterpriseTenant (id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await ensureColumn("TenantMember", "userId", "TEXT");
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS AppUser (
      id TEXT PRIMARY KEY NOT NULL,
      tenantId TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      status TEXT NOT NULL DEFAULT 'active',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL,
      CONSTRAINT AppUser_tenantId_fkey FOREIGN KEY (tenantId) REFERENCES EnterpriseTenant (id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS AuthSession (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      tokenHash TEXT NOT NULL UNIQUE,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT AuthSession_userId_fkey FOREIGN KEY (userId) REFERENCES AppUser (id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS AuditLog (
      id TEXT PRIMARY KEY NOT NULL,
      tenantId TEXT,
      actor TEXT NOT NULL DEFAULT 'system',
      action TEXT NOT NULL,
      entityType TEXT NOT NULL,
      entityId TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT AuditLog_tenantId_fkey FOREIGN KEY (tenantId) REFERENCES EnterpriseTenant (id) ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS LlmCallLog (
      id TEXT PRIMARY KEY NOT NULL,
      tenantId TEXT,
      task TEXT NOT NULL DEFAULT 'structured_call',
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      status TEXT NOT NULL,
      attemptCount INTEGER NOT NULL DEFAULT 1,
      durationMs INTEGER NOT NULL DEFAULT 0,
      promptTokens INTEGER,
      completionTokens INTEGER,
      totalTokens INTEGER,
      errorMessage TEXT,
      requestHash TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT LlmCallLog_tenantId_fkey FOREIGN KEY (tenantId) REFERENCES EnterpriseTenant (id) ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS LlmJob (
      id TEXT PRIMARY KEY NOT NULL,
      tenantId TEXT,
      task TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      attempts INTEGER NOT NULL DEFAULT 0,
      maxAttempts INTEGER NOT NULL DEFAULT 3,
      payload TEXT NOT NULL,
      result TEXT,
      errorMessage TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL,
      startedAt DATETIME,
      completedAt DATETIME,
      CONSTRAINT LlmJob_tenantId_fkey FOREIGN KEY (tenantId) REFERENCES EnterpriseTenant (id) ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS SimulationWorkspace (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      organizationStage TEXT NOT NULL,
      sandboxType TEXT NOT NULL,
      currentCycle INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active',
      organizationState TEXT NOT NULL,
      selectedRoleNames TEXT NOT NULL,
      userRole TEXT NOT NULL DEFAULT 'CEO',
      tenantId TEXT,
      organizationProfileId TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL,
      CONSTRAINT SimulationWorkspace_tenantId_fkey FOREIGN KEY (tenantId) REFERENCES EnterpriseTenant (id) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT SimulationWorkspace_organizationProfileId_fkey FOREIGN KEY (organizationProfileId) REFERENCES OrganizationProfile (id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await ensureColumn("SimulationWorkspace", "tenantId", "TEXT");
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS OrganizationDocument (
      id TEXT PRIMARY KEY NOT NULL,
      organizationProfileId TEXT NOT NULL,
      fileName TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      extractedText TEXT NOT NULL,
      sourceKind TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT OrganizationDocument_organizationProfileId_fkey FOREIGN KEY (organizationProfileId) REFERENCES OrganizationProfile (id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS RoleTemplate (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      stages TEXT NOT NULL,
      sandboxTypes TEXT NOT NULL,
      defaultCapabilities TEXT NOT NULL,
      defaultMetrics TEXT NOT NULL,
      description TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS TeamMember (
      id TEXT PRIMARY KEY NOT NULL,
      workspaceId TEXT NOT NULL,
      name TEXT NOT NULL,
      roleName TEXT NOT NULL,
      isRealMember BOOLEAN NOT NULL DEFAULT false,
      capabilities TEXT NOT NULL,
      customMetrics TEXT NOT NULL,
      personality TEXT NOT NULL,
      communicationStyle TEXT NOT NULL,
      decisionPreference TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL,
      CONSTRAINT TeamMember_workspaceId_fkey FOREIGN KEY (workspaceId) REFERENCES SimulationWorkspace (id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS SimulationFinale (
      id TEXT PRIMARY KEY NOT NULL,
      workspaceId TEXT NOT NULL,
      completedCycles INTEGER NOT NULL,
      outcomeType TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      score INTEGER NOT NULL,
      keyDrivers TEXT NOT NULL,
      decisionTrace TEXT NOT NULL,
      alternativeEndings TEXT NOT NULL,
      nextActions TEXT NOT NULL,
      rawReport TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT SimulationFinale_workspaceId_fkey FOREIGN KEY (workspaceId) REFERENCES SimulationWorkspace (id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS SourceDocument (
      id TEXT PRIMARY KEY NOT NULL,
      teamMemberId TEXT NOT NULL,
      fileName TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      extractedText TEXT NOT NULL,
      sourceKind TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT SourceDocument_teamMemberId_fkey FOREIGN KEY (teamMemberId) REFERENCES TeamMember (id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS DistillationProfile (
      id TEXT PRIMARY KEY NOT NULL,
      teamMemberId TEXT NOT NULL UNIQUE,
      languageStyle TEXT NOT NULL,
      decisionPreference TEXT NOT NULL,
      "values" TEXT NOT NULL,
      pressureResponse TEXT NOT NULL,
      capabilityTendency TEXT NOT NULL,
      typicalPhrases TEXT NOT NULL,
      professionalBoundary TEXT NOT NULL,
      rawProfile TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL,
      CONSTRAINT DistillationProfile_teamMemberId_fkey FOREIGN KEY (teamMemberId) REFERENCES TeamMember (id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Scenario (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      sandboxType TEXT NOT NULL,
      stage TEXT NOT NULL,
      description TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ScenarioNode (
      id TEXT PRIMARY KEY NOT NULL,
      scenarioId TEXT NOT NULL,
      nodeType TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      effect TEXT NOT NULL,
      sortOrder INTEGER NOT NULL,
      CONSTRAINT ScenarioNode_scenarioId_fkey FOREIGN KEY (scenarioId) REFERENCES Scenario (id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS BusinessEvent (
      id TEXT PRIMARY KEY NOT NULL,
      workspaceId TEXT NOT NULL,
      cycle INTEGER NOT NULL,
      eventType TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      impact TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT BusinessEvent_workspaceId_fkey FOREIGN KEY (workspaceId) REFERENCES SimulationWorkspace (id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS StrategyMeeting (
      id TEXT PRIMARY KEY NOT NULL,
      workspaceId TEXT NOT NULL,
      businessEventId TEXT,
      cycle INTEGER NOT NULL,
      chair TEXT NOT NULL,
      agenda TEXT NOT NULL,
      participantViews TEXT NOT NULL,
      userInput TEXT NOT NULL,
      conclusion TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT StrategyMeeting_workspaceId_fkey FOREIGN KEY (workspaceId) REFERENCES SimulationWorkspace (id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT StrategyMeeting_businessEventId_fkey FOREIGN KEY (businessEventId) REFERENCES BusinessEvent (id) ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS DecisionOption (
      id TEXT PRIMARY KEY NOT NULL,
      meetingId TEXT NOT NULL,
      title TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      upside TEXT NOT NULL,
      risk TEXT NOT NULL,
      resourceNeed TEXT NOT NULL,
      impactScore TEXT NOT NULL,
      nextIndicators TEXT NOT NULL,
      CONSTRAINT DecisionOption_meetingId_fkey FOREIGN KEY (meetingId) REFERENCES StrategyMeeting (id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  initialized = true;
}

async function ensureColumn(tableName: string, columnName: string, columnDefinition: string) {
  const db = getDb();
  const columns = await db.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info(${tableName})`);
  if (!columns.some((column) => column.name === columnName)) {
    await db.$executeRawUnsafe(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

function isPostgresUrl(value?: string) {
  return Boolean(value?.startsWith("postgres://") || value?.startsWith("postgresql://"));
}
