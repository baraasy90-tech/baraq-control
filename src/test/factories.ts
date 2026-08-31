import type { Activity, BudgetActualEntry, ContractStatus } from "@/types/domain";

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function makeActivity(overrides: Partial<Activity> = {}): Activity {
  const id = overrides.id ?? nextId("activity");
  return {
    id,
    projectId: "project-1",
    parentId: null,
    name: id,
    code: null,
    order: 0,
    durationDays: 5,
    done: false,
    startDate: null,
    actualStartDate: null,
    actualEndDate: null,
    calendarType: "calendar",
    customCalendarId: null,
    assignedTo: null,
    dependsOn: null,
    depType: null,
    lagDays: 0,
    lagUnit: "day",
    critical: false,
    alertLeadDays: 7,
    requiresReceiving: false,
    scopeType: "project",
    scopeRef: null,
    templateGroupId: null,
    budgetType: null,
    plannedAmount: null,
    boqQty: null,
    boqUnit: null,
    boqUnitPrice: null,
    linkedContractId: null,
    linkedContractName: null,
    linkedContractStatus: null,
    linkedContractValue: null,
    checklist: [],
    actualEntries: [],
    submissions: [],
    ...overrides,
  };
}

export function makeBudgetEntry(overrides: Partial<BudgetActualEntry> = {}): BudgetActualEntry {
  return {
    id: overrides.id ?? nextId("entry"),
    activityId: "activity-1",
    date: "2026-01-01",
    amount: 0,
    source: "other",
    note: null,
    contractRef: null,
    contractPaymentId: null,
    status: "approved",
    submittedAt: null,
    pmReviewedAt: null,
    pmReviewNote: null,
    financeReviewedAt: null,
    financeReviewNote: null,
    ...overrides,
  };
}

export function linkedContract(status: ContractStatus, value: number, name = "عقد تجريبي") {
  return {
    linkedContractId: nextId("contract"),
    linkedContractName: name,
    linkedContractStatus: status,
    linkedContractValue: value,
  };
}
