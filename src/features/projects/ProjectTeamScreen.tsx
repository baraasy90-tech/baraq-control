import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Card, SecondaryButton, PrimaryButton, IconButton, ErrorText } from "@/components/ui";
import { useCompany } from "@/features/company/useCompany";
import { useCompanyMembers } from "@/features/company/api/useCompanyMembers";
import { useProjectMembers } from "@/features/projects/api/useProjectMembers";
import { useAddProjectMember } from "@/features/projects/api/useAddProjectMember";
import { useRemoveProjectMember } from "@/features/projects/api/useRemoveProjectMember";
import type { Project, ProjectMemberRole } from "@/types/domain";

const ROLE_LABEL: Record<ProjectMemberRole, string> = { manager: "مدير المشروع", member: "عضو فريق" };

export function ProjectTeamScreen({ project }: { project: Project }) {
  const navigate = useNavigate();
  const { company } = useCompany();
  const membersQuery = useProjectMembers(project.id);
  const companyMembersQuery = useCompanyMembers(company.id);
  const addMember = useAddProjectMember();
  const removeMember = useRemoveProjectMember(project.id);

  const members = membersQuery.data ?? [];
  const memberUserIds = new Set(members.map((m) => m.userId));
  const availableCompanyMembers = (companyMembersQuery.data ?? []).filter((m) => !memberUserIds.has(m.id));

  const [selectedUserId, setSelectedUserId] = useState("");
  const [role, setRole] = useState<ProjectMemberRole>("member");
  const [error, setError] = useState("");

  const effectiveUserId = selectedUserId || availableCompanyMembers[0]?.id || "";

  const handleAdd = async () => {
    if (!effectiveUserId) return;
    setError("");
    try {
      await addMember.mutateAsync({ projectId: project.id, userId: effectiveUserId, role });
      setSelectedUserId("");
    } catch {
      setError("تعذّر إضافة العضو، حاول مجدداً");
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-2">
        <h1 className="text-lg font-bold text-ink truncate">فريق المشروع — {project.name}</h1>
        <SecondaryButton onClick={() => navigate(`/projects/${project.id}`)}>رجوع</SecondaryButton>
      </div>

      <Card className="mb-4">
        <h2 className="text-sm font-bold text-ink mb-3">الأعضاء الحاليون</h2>
        {members.length === 0 ? (
          <p className="text-sm text-ink-soft">
            لا يوجد أعضاء مُعيَّنون بعد — مالك الشركة والإدارة التنفيذية ورئيس القسم يشوفون المشروع تلقائياً بأي حال
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 bg-bg border border-line/60 rounded-lg px-3 py-2.5">
                <div>
                  <div className="text-sm font-semibold text-ink">{m.fullName}</div>
                  <div className="text-xs text-ink-soft">{ROLE_LABEL[m.role]}</div>
                </div>
                <IconButton icon={Trash2} label="إزالة من المشروع" tone="critical" onClick={() => removeMember.mutate(m.id)} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-bold text-ink mb-3">إضافة عضو</h2>
        {availableCompanyMembers.length === 0 ? (
          <p className="text-sm text-ink-soft">كل أعضاء الشركة مُضافون بالفعل، أو لا يوجد أعضاء بعد بالشركة</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <select
              value={effectiveUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border"
            >
              {availableCompanyMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </select>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as ProjectMemberRole)}
              className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border"
            >
              <option value="member">عضو فريق</option>
              <option value="manager">مدير المشروع</option>
            </select>
          </div>
        )}
        <ErrorText>{error}</ErrorText>
        <PrimaryButton
          onClick={handleAdd}
          disabled={!effectiveUserId || addMember.isPending}
          className="w-auto px-4 py-2 text-sm"
        >
          {addMember.isPending ? "جارٍ الإضافة..." : "إضافة للمشروع"}
        </PrimaryButton>
      </Card>
    </div>
  );
}
