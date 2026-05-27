import {
  defaultOrganizationState,
  parseJson,
  type CapabilityMap,
  type CustomMetric,
  type OrganizationState,
} from "./domain";

export function toJson(value: unknown) {
  return JSON.stringify(value);
}

export function parseCapabilities(value: string): CapabilityMap {
  return parseJson(value, {
    sales: 50,
    technology: 50,
    management: 50,
    operations: 50,
    financing: 50,
    strategy: 50,
  });
}

export function parseMetrics(value: string): CustomMetric[] {
  return parseJson(value, []);
}

export function parseState(value: string): OrganizationState {
  return parseJson(value, defaultOrganizationState());
}

export function parseStringList(value: string) {
  return parseJson<string[]>(value, []);
}
