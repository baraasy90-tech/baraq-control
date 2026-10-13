import { ProjectQueryState } from "@/components/ProjectQueryState";
import { useParams } from "react-router-dom";
import { useProject } from "@/features/projects/api/useProject";
import { DocumentsScreen } from "@/features/documents/DocumentsScreen";

export function ProjectDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const projectQuery = useProject(id);

  if (projectQuery.isError || projectQuery.isPending || !projectQuery.data) {
    return <ProjectQueryState query={projectQuery} />;
  }

  return <DocumentsScreen project={projectQuery.data} />;
}
