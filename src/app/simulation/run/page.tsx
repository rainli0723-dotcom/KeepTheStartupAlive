import Link from "next/link";
import { SimulationRunClient } from "@/components/simulation-run-client";
import { EmptyState } from "@/components/app-shell";
import { parseJson } from "@/lib/domain";
import { getLockedMemberIds, parseInteractionLog } from "@/lib/simulation-run";
import { getActiveWorkspaceForRun } from "@/lib/workspace";

export const dynamic = "force-dynamic";

type ParticipantView = {
  roleName: string;
  view: string;
};

export default async function SimulationRunPage() {
  const workspace = await getActiveWorkspaceForRun();
  if (!workspace) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <EmptyState title="尚未创建沙盘" description="请先创建组织工作区，再开始模拟。" />
        <Link href="/setup" className="glass-primary-button mt-4 px-4 py-2 text-sm">
          创建沙盘
        </Link>
      </main>
    );
  }

  const latestMeeting = workspace.meetings[0] ?? null;
  const lockedMemberIds = getLockedMemberIds(workspace.selectedRoleNames);
  const lockedParticipants = workspace.teamMembers
    .filter((member) => lockedMemberIds.includes(member.id))
    .map((member) => `${member.name}/${member.roleName}`);

  return (
    <SimulationRunClient
      run={{
        workspaceName: workspace.name,
        organizationName: workspace.organizationProfile.name,
        userRole: workspace.userRole,
        status: workspace.status,
        completedCycles: Math.max(0, workspace.currentCycle - 1),
        totalCycles: 20,
        lockedParticipants,
        selectedMemberIds: lockedMemberIds,
        teamMembers: workspace.teamMembers.map((member) => ({
          id: member.id,
          name: member.name,
          roleName: member.roleName,
          isRealMember: member.isRealMember,
        })),
        latestMeeting: latestMeeting
          ? {
              id: latestMeeting.id,
              cycle: latestMeeting.cycle,
              chair: latestMeeting.chair,
              agenda: latestMeeting.agenda,
              conclusion: latestMeeting.conclusion,
              participantViews: parseJson<ParticipantView[]>(latestMeeting.participantViews, []),
              interactions: parseInteractionLog(latestMeeting.userInput),
              businessEvent: latestMeeting.businessEvent
                ? {
                    title: latestMeeting.businessEvent.title,
                    description: latestMeeting.businessEvent.description,
                    eventType: latestMeeting.businessEvent.eventType,
                  }
                : null,
              decisionOptions: latestMeeting.decisionOptions.map((option) => ({
                id: option.id,
                title: option.title,
                recommendation: option.recommendation,
                upside: option.upside,
                risk: option.risk,
                resourceNeed: option.resourceNeed,
              })),
            }
          : null,
      }}
    />
  );
}
