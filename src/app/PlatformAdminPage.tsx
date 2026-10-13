import { PlatformAdminScreen } from "@/features/billing/PlatformAdminScreen";
import { PlatformAdminGate } from "@/features/billing/PlatformAdminGate";

export function PlatformAdminPage() {
  return <PlatformAdminGate><PlatformAdminScreen /></PlatformAdminGate>;
}
