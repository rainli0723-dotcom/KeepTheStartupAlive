import { parseJson, type CustomMetric } from "./domain";

const lockedMembersPrefix = "member:";
const interactionPrefix = "::KTSA_INTERACTION::";

export type MeetingInteractionLog = {
  speaker: string;
  message: string;
  evaluation: string;
  createdAt: string;
  assistantReply?: string;
  suggestedChoices?: string[];
  dialogueTurns?: {
    speaker: string;
    message: string;
  }[];
};

export function serializeLockedMemberIds(memberIds: string[]) {
  return JSON.stringify(memberIds.map((id) => `${lockedMembersPrefix}${id}`));
}

export function getLockedMemberIds(value: string) {
  return parseJson<string[]>(value, [])
    .filter((item) => item.startsWith(lockedMembersPrefix))
    .map((item) => item.slice(lockedMembersPrefix.length));
}

export function appendInteractionLog(userInput: string, entry: MeetingInteractionLog) {
  return `${userInput.trimEnd()}\n${interactionPrefix}${JSON.stringify(entry)}`.trim();
}

export function parseInteractionLog(userInput: string) {
  return userInput
    .split(/\r?\n/)
    .filter((line) => line.startsWith(interactionPrefix))
    .map((line) => parseJson<MeetingInteractionLog | null>(line.slice(interactionPrefix.length), null))
    .filter((entry): entry is MeetingInteractionLog => Boolean(entry));
}

export function formatMetrics(metrics: CustomMetric[]) {
  return metrics.map((metric) => `${metric.label}:${metric.value}`).join(", ");
}
