import type { DepartmentType } from "@/types/domain";

export const DEPARTMENT_TYPE_LABEL: Record<DepartmentType, string> = {
  project_management: "إدارة المشاريع",
  finance: "الإدارة المالية",
  hr: "الموارد البشرية",
  executive: "مدير الحساب",
  procurement: "المشتريات",
  custom: "قسم مخصص",
};

/** لون تمييز بصري لكل نوع قسم — يُستخدم كنقطة صغيرة بجانب اسم القسم بمخطط الهيكلة. */
export const DEPARTMENT_TYPE_COLOR: Record<DepartmentType, string> = {
  executive: "#171b26",
  project_management: "#e86b2c",
  finance: "#2e9e52",
  procurement: "#dfa22e",
  hr: "#8b5cf6",
  custom: "#5b6472",
};
