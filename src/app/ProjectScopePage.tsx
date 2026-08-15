import { useNavigate, useParams } from "react-router-dom";
import { useProject } from "@/features/projects/api/useProject";
import { useUpdateProject } from "@/features/projects/api/useUpdateProject";
import { useCompany } from "@/features/company/useCompany";
import { ScopeSetupScreen } from "@/features/projects/ScopeSetupScreen";

export function ProjectScopePage() {
  const { id } = useParams<{ id: string }>();
  const { company } = useCompany();
  const projectQuery = useProject(id);
  const updateProject = useUpdateProject();
  const navigate = useNavigate();

  if (!projectQuery.data) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-ink-soft">جارٍ التحميل...</div>;
  }

  return (
    <ScopeSetupScreen
      initial={projectQuery.data.scopeConfig}
      saving={updateProject.isPending}
      onBack={() => navigate(`/projects/${id}`)}
      onComplete={(config) => {
        updateProject.mutate(
          { id: projectQuery.data.id, companyId: company.id, scopeConfig: config },
          { onSuccess: () => navigate(`/projects/${id}`) }
        );
      }}
    />
  );
}
