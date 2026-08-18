export type CalendarType = "calendar" | "workdays";
export type DepType = "SS" | "FS";
export type LagUnit = "day" | "month";
export type ScopeType = "project" | "zone" | "unit" | "facility";
export type BudgetType = "lumpsum" | "boq";
export type Decision = "approved" | "approvedWithNotes" | "rejected";
export type StorageType = "cloud" | "local" | "drive";
export type PrintMode = "none" | "header_footer" | "full_page";

export interface PrintSettings {
  mode: PrintMode;
  headerUrl: string | null;
  footerUrl: string | null;
  fullPageUrl: string | null;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export interface Company {
  id: string;
  createdBy: string;
  name: string;
  companyCode: string;
  countryCode: string;
  logoUrl: string | null;
  archiveFolderName: string;
  archiveStorageType: StorageType;
  archiveLocalPath: string | null;
  print: PrintSettings;
  headerColor: string;
}

export interface Profile {
  id: string;
  fullName: string;
  companyId: string | null;
}

export type DepartmentType = "project_management" | "finance" | "hr" | "executive" | "custom";
export type MemberRole = "member" | "head";

export interface Department {
  id: string;
  companyId: string;
  name: string;
  type: DepartmentType;
  headLabel: string | null;
  memberLabel: string | null;
  parentDepartmentId: string | null;
  positionX: number | null;
  positionY: number | null;
}

export interface DepartmentMember {
  id: string;
  departmentId: string;
  userId: string;
  role: MemberRole;
  fullName: string;
}

export type ProjectMemberRole = "manager" | "member";

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  fullName: string;
}

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignedTo: string | null;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
}

export interface Invite {
  id: string;
  companyId: string;
  departmentId: string;
  role: MemberRole;
  email: string;
  token: string;
  status: "pending" | "accepted" | "revoked";
  createdAt: string;
  expiresAt: string;
}

export interface ScopeCode {
  code: string;
}

export interface UnitScopeCode {
  code: string;
  zoneCode: string | null;
}

export interface ScopeConfig {
  zones: ScopeCode[];
  units: UnitScopeCode[];
  facilities: ScopeCode[];
}

export interface ActiveScope {
  type: "all" | ScopeType;
  ref: string | null;
  label: string;
}

export type ProjectStatus = "preparing" | "active" | "completed";

export interface Project {
  id: string;
  companyId: string;
  departmentId: string | null;
  name: string;
  managerName: string;
  location: string;
  mapLink: string;
  area: string;
  unitsCount: string;
  projectType: string;
  managerSignatureUrl: string | null;
  themeColor: string;
  themeIcon: string;
  scopeConfig: ScopeConfig | null;
  status: ProjectStatus;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  activityId: string;
  text: string;
  photoRequired: boolean;
  order: number;
}

export interface BudgetActualEntry {
  id: string;
  activityId: string;
  date: string;
  amount: number;
  source: string;
  note: string | null;
  contractRef: string | null;
}

export interface CustomCalendar {
  id: string;
  companyId: string;
  name: string;
  workingWeekdays: number[];
}

export interface CompanyHoliday {
  id: string;
  companyId: string;
  name: string;
  date: string;
  recurringYearly: boolean;
}

export interface Activity {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  code: string | null;
  order: number;
  durationDays: number;
  done: boolean;
  startDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  calendarType: CalendarType;
  customCalendarId: string | null;
  assignedTo: string | null;
  dependsOn: string | null;
  depType: DepType | null;
  lagDays: number;
  lagUnit: LagUnit;
  critical: boolean;
  alertLeadDays: number;
  requiresReceiving: boolean;
  scopeType: ScopeType;
  scopeRef: string | null;
  templateGroupId: string | null;
  budgetType: BudgetType | null;
  plannedAmount: number | null;
  boqQty: number | null;
  boqUnit: string | null;
  boqUnitPrice: number | null;
  checklist: ChecklistItem[];
  actualEntries: BudgetActualEntry[];
  submissions: Submission[];
}

export interface ChecklistResult {
  id: string;
  submissionId: string;
  checklistItemId: string | null;
  checked: boolean;
  imageUrl: string | null;
}

export interface Submission {
  id: string;
  activityId: string;
  managerName: string;
  managerSignatureUrl: string | null;
  decision: Decision;
  notes: string | null;
  createdAt: string;
  checklistResults: ChecklistResult[];
  images: string[];
}

export interface DocumentFolder {
  id: string;
  projectId: string;
  parentFolderId: string | null;
  name: string;
}

export interface ProjectDocument {
  id: string;
  folderId: string;
  name: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface Contract {
  id: string;
  projectId: string;
  name: string;
  pdfUrl: string | null;
  startDate: string | null;
  durationDays: number | null;
  totalValue: number | null;
  paymentTerms: string | null;
  hasAdvancePayment: boolean;
  advancePaymentPercentage: number | null;
  advancePaymentGuaranteeNote: string | null;
  advanceDeductionPercentage: number | null;
  retentionPercentage: number | null;
  retentionReleased: boolean;
  retentionReleaseNote: string | null;
  createdAt: string;
  status: ContractStatus;
  submittedBy: string | null;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export type ContractStatus = "draft" | "pending_approval" | "approved" | "rejected";

export interface ContractLineItem {
  id: string;
  contractId: string;
  description: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  order: number;
}

export interface ContractPayment {
  id: string;
  contractId: string;
  title: string;
  dueDate: string | null;
  amount: number | null;
  percentage: number | null;
  paid: boolean;
  guaranteeNote: string | null;
  order: number;
  isAdvancePayment: boolean;
}

export interface ContractDeduction {
  id: string;
  contractId: string;
  violationName: string;
  deductionAmount: number;
  damageDescription: string | null;
  deductedAt: string;
  createdBy: string;
  createdAt: string;
}

export type ReconciliationStatus = "pending" | "approved" | "rejected";

export interface BudgetReconciliationNote {
  id: string;
  projectId: string;
  contractValue: number | null;
  trackedBudgetValue: number | null;
  note: string;
  createdBy: string;
  createdAt: string;
  status: ReconciliationStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface ScheduleEntry {
  start: string;
  end: string;
}

export type Schedule = Record<string, ScheduleEntry>;
