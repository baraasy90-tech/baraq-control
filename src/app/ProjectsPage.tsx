import { useNavigate } from "react-router-dom";
import { useCompany } from "@/features/company/useCompany";
import { ProjectsDashboard } from "@/features/projects/ProjectsDashboard";

export function ProjectsPage() {
  const { company } = useCompany();
  const navigate = useNavigate();

  return <ProjectsDashboard company={company} onOpenControlPanel={() => navigate("/control-panel")} />;
}
