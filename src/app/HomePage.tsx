import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { useCompany } from "@/features/company/useCompany";
import { useDepartments } from "@/features/company/api/useDepartments";
import { useDepartmentMembers } from "@/features/company/api/useDepartmentMembers";
import { ProjectsPage } from "@/app/ProjectsPage";
import type { DepartmentType } from "@/types/domain";

/** يهبط كل دور على الشاشة الأنسب له مرة واحدة فقط لكل جلسة تصفّح — بعدها يبقى الضغط
 * على "المشاريع" بالقائمة الجانبية يعرض لوحة المشاريع دائماً دون إعادة توجيه. */
const redirectedSessions = new WeakSet<object>();

export function HomePage() {
  const queryClient = useQueryClient();
  const { company, profile } = useCompany();
  const departmentsQuery = useDepartments(company.id);
  const departments = departmentsQuery.data;
  const membersQuery = useDepartmentMembers((departments ?? []).map((d) => d.id));
  const members = departments?.length === 0 ? [] : membersQuery.data;

  const [skip] = useState(() => redirectedSessions.has(queryClient));

  if (!skip) {
    if (departmentsQuery.isError || membersQuery.isError) {
      return (
        <div className="p-6 text-center">
          <p role="alert" className="text-sm text-ink-soft">تعذّر تحميل صلاحيات الصفحة الرئيسية.</p>
          <button className="mt-3 text-primary underline" onClick={() => {
            void departmentsQuery.refetch();
            if (departments?.length) void membersQuery.refetch();
          }}>إعادة المحاولة</button>
        </div>
      );
    }
    if (!departments || !members) {
      return <div className="min-h-screen flex items-center justify-center text-sm text-ink-soft">جارٍ التحميل...</div>;
    }

    redirectedSessions.add(queryClient);

    const isOwner = company.createdBy === profile.id;
    const isExecutive = members.some(
      (m) => m.userId === profile.id && departments.find((d) => d.id === m.departmentId)?.type === "executive"
    );
    const isHeadOf = (type: DepartmentType) =>
      members.some(
        (m) => m.userId === profile.id && m.role === "head" && departments.find((d) => d.id === m.departmentId)?.type === type
      );

    if (isOwner || isExecutive) return <Navigate to="/overview" replace />;
    if (isHeadOf("project_management") || isHeadOf("finance") || isHeadOf("procurement")) return <Navigate to="/approvals" replace />;
    if (isHeadOf("hr")) return <Navigate to="/my-requests" replace />;
  }

  return <ProjectsPage />;
}
