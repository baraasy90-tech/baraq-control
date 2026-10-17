import { ProjectQueryState } from "@/components/ProjectQueryState";
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

  if (projectQuery.isError || projectQuery.isPending || !projectQuery.data) {
    return <ProjectQueryState query={projectQuery} />;
  }
  const project = projectQuery.data;

  return (
    <AppearanceSettingsScreen
      project={project}
      saving={updateProject.isPending}
      onSave={async (patch) => {
        await updateProject.mutateAsync({ id: project.id, companyId: company.id, ...patch });
        navigate(`/projects/${id}`);
      }}
      onBack={() => navigate(`/projects/${id}`)}
    />
  );
}
