import { ProjectQueryState } from "@/components/ProjectQueryState";
import { useParams } from "react-router-dom";
import { useProject } from "@/features/projects/api/useProject";
import { BudgetScreen } from "@/features/budget/BudgetScreen";

export function ProjectBudgetPage() {
  const { id } = useParams<{ id: string }>();
  const projectQuery = useProject(id);

  if (projectQuery.isError || projectQuery.isPending || !projectQuery.data) {
    return <ProjectQueryState query={projectQuery} />;
  }

  return <BudgetScreen project={projectQuery.data} />;
}
