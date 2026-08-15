import clsx from "clsx";
import { DECISION_META, NOT_SUBMITTED_META, getLatestDecision } from "@/features/receiving/decisionMeta";
import type { Submission } from "@/types/domain";

export function DecisionPill({ submissions }: { submissions: Submission[] }) {
  const decision = getLatestDecision(submissions);
  const meta = decision === "notSubmitted" ? NOT_SUBMITTED_META : DECISION_META[decision];
  return (
    <span className={clsx("inline-block text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", meta.color, meta.bg)}>
      {meta.label}
    </span>
  );
}
