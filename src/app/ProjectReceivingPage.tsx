import { useParams } from "react-router-dom";
import { useProject } from "@/features/projects/api/useProject";
import { ReceivingScreen } from "@/features/receiving/ReceivingScreen";

export function ProjectReceivingPage() {
  const { id } = useParams<{ id: string }>();
  const projectQuery = useProject(id);

  if (!projectQuery.data) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-ink-soft">جارٍ التحميل...</div>;
  }

  return <ReceivingScreen project={projectQuery.data} />;
}
