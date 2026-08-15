import { useNavigate } from "react-router-dom";
import { useCompany } from "@/features/company/useCompany";
import { ControlPanelScreen } from "@/features/company/ControlPanelScreen";

export function ControlPanelPage() {
  const { company } = useCompany();
  const navigate = useNavigate();

  return <ControlPanelScreen company={company} onBack={() => navigate("/")} />;
}
