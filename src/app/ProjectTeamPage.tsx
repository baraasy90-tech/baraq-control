import { ProjectQueryState } from "@/components/ProjectQueryState";
import { useParams } from "react-router-dom";
import { useProject } from "@/features/projects/api/useProject";
import { ProjectTeamScreen } from "@/features/projects/ProjectTeamScreen";

export function ProjectTeamPage() {
  const { id } = useParams<{ id: string }>();
  const projectQuery = useProject(id);

  if (projectQuery.isError || projectQuery.isPending || !projectQuery.data) {
    return <ProjectQueryState query={projectQuery} />;
  }

  return <ProjectTeamScreen project={projectQuery.data} />;
}
