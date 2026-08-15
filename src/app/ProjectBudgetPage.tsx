import { useParams } from "react-router-dom";
import { useProject } from "@/features/projects/api/useProject";
import { BudgetScreen } from "@/features/budget/BudgetScreen";

export function ProjectBudgetPage() {
  const { id } = useParams<{ id: string }>();
  const projectQuery = useProject(id);

  if (!projectQuery.data) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-ink-soft">جارٍ التحميل...</div>;
  }

  return <BudgetScreen project={projectQuery.data} />;
}
