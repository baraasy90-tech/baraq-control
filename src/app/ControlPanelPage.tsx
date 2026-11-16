import { useNavigate } from "react-router-dom";
import { useCompany } from "@/features/company/useCompany";
import { ControlPanelScreen } from "@/features/company/ControlPanelScreen";
import { InterfaceAppearanceSettings } from '@/features/appearance/InterfaceAppearance';

export function ControlPanelPage() {
  const { company, profile } = useCompany();
  const navigate = useNavigate();

  return <><div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5"><InterfaceAppearanceSettings userId={profile.id} /></div><ControlPanelScreen company={company} onBack={() => navigate("/")} /></>;
}
