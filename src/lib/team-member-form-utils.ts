import { roleTemplates, type CustomMetric } from "./domain";

export const customRoleOption = "其他负责人";

export const editableRoleOptions = [
  ...roleTemplates.map((roleTemplate) => roleTemplate.name),
  customRoleOption,
] as const;

export const editableCapabilityFields = [
  ["sales", "销售能力"],
  ["technology", "技术能力"],
  ["management", "管理能力"],
  ["operations", "运营能力"],
  ["financing", "融资能力"],
  ["strategy", "战略能力"],
] as const;

export function resolveEditableRole(rolePreset: string, roleCustom: string) {
  return roleCustom.trim() || rolePreset.trim();
}

export function metricsFromLines(value: string): CustomMetric[] {
  return value
    .split("\n")
    .map((line) => {
      const [label, rawValue] = line.split(":");
      const trimmedLabel = (label ?? "").trim();
      if (!trimmedLabel) return null;
      const normalizedRawValue = (rawValue ?? "").trim();
      if (!normalizedRawValue) return null;
      const numericValue = Number(normalizedRawValue);
      return {
        label: trimmedLabel,
        value: Number.isFinite(numericValue) ? numericValue : 50,
      };
    })
    .filter((metric): metric is CustomMetric => Boolean(metric));
}

export function metricsToLines(metrics: CustomMetric[]) {
  return metrics.map((metric) => `${metric.label}:${metric.value}`).join("\n");
}
