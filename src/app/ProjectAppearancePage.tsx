import { useNavigate, useParams } from "react-router-dom";
import { useProject } from "@/features/projects/api/useProject";
import { useUpdateProject } from "@/features/projects/api/useUpdateProject";
import { useCompany } from "@/features/company/useCompany";
import { AppearanceSettingsScreen } from "@/features/projects/AppearanceSettingsScreen";

export function ProjectAppearancePage() {
  const { id } = useParams<{ id: string }>();
  const { company } = useCompany();
  const projectQuery = useProject(id);
  const updateProject = useUpdateProject();
  const navigate = useNavigate();

  if (!projectQuery.data) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-ink-soft">جارٍ التحميل...</div>;
  }

  return (
    <AppearanceSettingsScreen
      project={projectQuery.data}
      saving={updateProject.isPending}
      onSave={(patch) => {
        updateProject.mutate(
          { id: projectQuery.data.id, companyId: company.id, ...patch },
          { onSuccess: () => navigate(`/projects/${id}`) }
        );
      }}
      onBack={() => navigate(`/projects/${id}`)}
    />
  );
}
