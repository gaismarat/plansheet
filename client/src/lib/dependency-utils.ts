import type { WorkDependency } from "@shared/schema";

export type DependencyType = "FS" | "SS" | "FF" | "SF";

export interface WorkDateInfo {
  workId: number;
  planStartDate: string | null;
  planEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
}

export interface DependencyConstraint {
  dependencyType: DependencyType;
  lagDays: number;
  predecessorWorkId: number;
  predecessorDates: WorkDateInfo;
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function calculateMinActualStartDate(
  constraints: DependencyConstraint[]
): Date | null {
  if (constraints.length === 0) return null;

  let maxMinDate: Date | null = null;

  for (const constraint of constraints) {
    const { dependencyType, lagDays, predecessorDates } = constraint;
    let minDate: Date | null = null;

    const predActualStart = parseDate(predecessorDates.actualStartDate);
    const predActualEnd = parseDate(predecessorDates.actualEndDate);
    const predPlanStart = parseDate(predecessorDates.planStartDate);
    const predPlanEnd = parseDate(predecessorDates.planEndDate);

    const effectiveStart = predActualStart || predPlanStart;
    const effectiveEnd = predActualEnd || predPlanEnd;

    switch (dependencyType) {
      case "FS":
        if (effectiveEnd) {
          minDate = addDays(effectiveEnd, 1 + lagDays);
        }
        break;
      case "SS":
        if (effectiveStart) {
          minDate = addDays(effectiveStart, lagDays);
        }
        break;
      case "FF":
        break;
      case "SF":
        if (effectiveStart) {
          minDate = addDays(effectiveStart, lagDays);
        }
        break;
    }

    if (minDate) {
      if (!maxMinDate || minDate > maxMinDate) {
        maxMinDate = minDate;
      }
    }
  }

  return maxMinDate;
}

export function calculateMinActualEndDate(
  constraints: DependencyConstraint[],
  actualStartDate: Date | null
): Date | null {
  if (constraints.length === 0) return null;

  let maxMinDate: Date | null = null;

  for (const constraint of constraints) {
    const { dependencyType, lagDays, predecessorDates } = constraint;
    let minDate: Date | null = null;

    const predActualEnd = parseDate(predecessorDates.actualEndDate);
    const predPlanEnd = parseDate(predecessorDates.planEndDate);
    const predActualStart = parseDate(predecessorDates.actualStartDate);
    const predPlanStart = parseDate(predecessorDates.planStartDate);

    const effectiveEnd = predActualEnd || predPlanEnd;
    const effectiveStart = predActualStart || predPlanStart;

    switch (dependencyType) {
      case "FF":
        if (effectiveEnd) {
          minDate = addDays(effectiveEnd, 1 + lagDays);
        }
        break;
      case "SF":
        if (effectiveStart) {
          minDate = addDays(effectiveStart, lagDays);
        }
        break;
      default:
        break;
    }

    if (minDate) {
      if (!maxMinDate || minDate > maxMinDate) {
        maxMinDate = minDate;
      }
    }
  }

  if (actualStartDate && (!maxMinDate || actualStartDate > maxMinDate)) {
    return actualStartDate;
  }

  return maxMinDate;
}

export function isDateBlocked(
  date: Date,
  minAllowedDate: Date | null
): boolean {
  if (!minAllowedDate) return false;
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const minOnly = new Date(minAllowedDate.getFullYear(), minAllowedDate.getMonth(), minAllowedDate.getDate());
  return dateOnly < minOnly;
}

export function getDisabledDays(minAllowedDate: Date | null): (date: Date) => boolean {
  if (!minAllowedDate) return () => false;
  return (date: Date) => isDateBlocked(date, minAllowedDate);
}
