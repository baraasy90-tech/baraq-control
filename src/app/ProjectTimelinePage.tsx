import { useParams } from "react-router-dom";
import { useProject } from "@/features/projects/api/useProject";
import { ProjectScheduleScreen } from "@/features/schedule/ProjectScheduleScreen";

export function ProjectTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const projectQuery = useProject(id);

  if (projectQuery.isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-ink-soft">جارٍ التحميل...</div>;
  }
  if (!projectQuery.data) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-critical">تعذّر العثور على المشروع</div>;
  }

  return <ProjectScheduleScreen project={projectQuery.data} defaultTab="preview" />;
}
