import { ProjectQueryState } from "@/components/ProjectQueryState";
import { useParams } from "react-router-dom";
import { useProject } from "@/features/projects/api/useProject";
import { ProjectScheduleScreen } from "@/features/schedule/ProjectScheduleScreen";

export function ProjectAdminPage() {
  const { id } = useParams<{ id: string }>();
  const projectQuery = useProject(id);

  if (projectQuery.isError || projectQuery.isPending || !projectQuery.data) {
    return <ProjectQueryState query={projectQuery} />;
  }

  return <ProjectScheduleScreen project={projectQuery.data} defaultTab="create" />;
}
