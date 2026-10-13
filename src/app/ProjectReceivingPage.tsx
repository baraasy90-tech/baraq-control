import { ProjectQueryState } from "@/components/ProjectQueryState";
import { useParams } from "react-router-dom";
import { useProject } from "@/features/projects/api/useProject";
import { ReceivingScreen } from "@/features/receiving/ReceivingScreen";

export function ProjectReceivingPage() {
  const { id } = useParams<{ id: string }>();
  const projectQuery = useProject(id);

  if (projectQuery.isError || projectQuery.isPending || !projectQuery.data) {
    return <ProjectQueryState query={projectQuery} />;
  }

  return <ReceivingScreen project={projectQuery.data} />;
}
