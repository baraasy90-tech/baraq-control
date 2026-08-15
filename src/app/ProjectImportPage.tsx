import { useParams } from "react-router-dom";
import { ImportScheduleScreen } from "@/features/schedule/ImportScheduleScreen";

export function ProjectImportPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <ImportScheduleScreen projectId={id} />;
}
