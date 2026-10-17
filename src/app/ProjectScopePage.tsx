import { ProjectQueryState } from "@/components/ProjectQueryState";
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

  if (projectQuery.isError || projectQuery.isPending || !projectQuery.data) {
    return <ProjectQueryState query={projectQuery} />;
  }
  const project = projectQuery.data;

  return (
    <ScopeSetupScreen
      initial={project.scopeConfig}
      saving={updateProject.isPending}
      onBack={() => navigate(`/projects/${id}`)}
      onComplete={async (config) => {
        await updateProject.mutateAsync({ id: project.id, companyId: company.id, scopeConfig: config });
        navigate(`/projects/${id}`);
      }}
    />
  );
}
