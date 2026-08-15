import { DECISION_META } from "@/features/receiving/decisionMeta";
import type { Decision } from "@/types/domain";

const STAMP_COLOR: Record<Decision, string> = {
  approved: "#2E9E52",
  approvedWithNotes: "#DFA22E",
  rejected: "#D64545",
};

export function DecisionStamp({ decision, size = 96 }: { decision: Decision; size?: number }) {
  const color = STAMP_COLOR[decision];
  const label = DECISION_META[decision].label;
  return (
    <div
      className="rounded-full border-4 flex items-center justify-center text-center font-black select-none"
      style={{
        width: size,
        height: size,
        borderColor: color,
        color,
        transform: "rotate(-8deg)",
        fontSize: size * 0.13,
        lineHeight: 1.15,
        padding: size * 0.08,
      }}
    >
      {label}
    </div>
  );
}
