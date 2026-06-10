import { getDb } from "./db";
import { ensureDatabase } from "./bootstrap-db";
import { getActiveTenant } from "./tenant";

// Lightweight version for simulation preparation page
export async function getActiveWorkspaceForSimulationPrep() {
  await ensureDatabase();
  const db = getDb();
  const tenant = await getActiveTenant();
  const workspace = await db.simulationWorkspace.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      userRole: true,
      selectedScenarioId: true,
      organizationProfile: {
        select: {
          name: true,
          stage: true,
          industry: true,
          product: true,
          market: true,
          cashflow: true,
          revenue: true,
          teamSize: true,
          governanceStructure: true,
          keyRisks: true,
        },
      },
      teamMembers: {
        select: {
          id: true,
          name: true,
          roleName: true,
          isRealMember: true,
          distillationProfile: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  // If no workspace, return basic structure
  if (!workspace) {
    return null;
  }

  // Get all scenarios for selection
  const scenarios = await db.scenario.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      sandboxType: true,
      stage: true,
      description: true,
    },
  });

  // Get selected scenario details
  let selectedScenario = null;
  if (workspace.selectedScenarioId) {
    selectedScenario = await db.scenario.findUnique({
      where: { id: workspace.selectedScenarioId },
      select: {
        id: true,
        name: true,
        sandboxType: true,
        stage: true,
        description: true,
      },
    });
  }

  return {
    ...workspace,
    scenarios,
    selectedScenario,
  };
}

// Lightweight version for simulation overview page
export async function getActiveWorkspaceForOverview() {
  await ensureDatabase();
  const db = getDb();
  const tenant = await getActiveTenant();
  const workspace = await db.simulationWorkspace.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      currentCycle: true,
      userRole: true,
      selectedScenarioId: true,
      organizationState: true,
      organizationProfile: {
        select: {
          name: true,
          stage: true,
          industry: true,
          product: true,
          market: true,
          revenue: true,
          cashflow: true,
          teamSize: true,
          governanceStructure: true,
          keyRisks: true,
        },
      },
      teamMembers: {
        select: {
          id: true,
          name: true,
          roleName: true,
          isRealMember: true,
        },
        orderBy: { createdAt: "asc" },
      },
      events: {
        select: {
          id: true,
          cycle: true,
          eventType: true,
          title: true,
          description: true,
        },
        orderBy: [{ cycle: "desc" }, { createdAt: "desc" }],
        take: 10,
      },
      meetings: {
        select: {
          id: true,
          cycle: true,
          chair: true,
          agenda: true,
          conclusion: true,
          decisionOptions: {
            select: {
              id: true,
              title: true,
              recommendation: true,
            },
            take: 2,
          },
        },
        orderBy: [{ cycle: "desc" }, { createdAt: "desc" }],
        take: 3,
      },
    },
  });

  // If no workspace, return null
  if (!workspace) {
    return null;
  }

  // Get selected scenario details
  let selectedScenario = null;
  if (workspace.selectedScenarioId) {
    selectedScenario = await db.scenario.findUnique({
      where: { id: workspace.selectedScenarioId },
      select: {
        id: true,
        name: true,
        sandboxType: true,
        stage: true,
        description: true,
      },
    });
  }

  return {
    ...workspace,
    selectedScenario,
  };
}

// Lightweight version for team page (only needs team members + profiles)
export async function getActiveWorkspaceForTeam() {
  await ensureDatabase();
  const db = getDb();
  const tenant = await getActiveTenant();
  return db.simulationWorkspace.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      teamMembers: {
        include: {
          distillationProfile: true,
          sourceDocuments: { orderBy: { createdAt: "desc" }, take: 3 },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

// Full version for pages that need complete data (simulation, cycles API)
export async function getActiveWorkspace() {
  await ensureDatabase();
  const db = getDb();
  const tenant = await getActiveTenant();
  return db.simulationWorkspace.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { updatedAt: "desc" },
    include: {
      organizationProfile: {
        include: {
          documents: { orderBy: { createdAt: "desc" }, take: 8 },
        },
      },
      teamMembers: {
        include: {
          distillationProfile: true,
          sourceDocuments: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      },
      events: { orderBy: [{ cycle: "desc" }, { createdAt: "desc" }], take: 20 },
      meetings: {
        orderBy: [{ cycle: "desc" }, { createdAt: "desc" }],
        take: 20,
        include: { decisionOptions: true, businessEvent: true },
      },
    },
  });
}
