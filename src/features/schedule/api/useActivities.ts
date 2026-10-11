import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapActivity, mapChecklistItem } from "@/features/schedule/api/mapActivity";
import { mapChecklistResult, mapSubmission } from "@/features/receiving/api/mapSubmission";
import { mapBudgetEntry } from "@/features/budget/api/mapBudgetEntry";
import { computeVat } from "@/features/contracts/lib/vat";
import { getFileUrls } from "@/lib/supabase/storage";
import type { ContractStatus, Submission } from "@/types/domain";

import { fetchAllRows } from "@/lib/supabase/fetchAllRows";

/** Same activity, contract and receiving semantics for project and company totals. */
export async function loadActivities(projectIds: string[], includeDetails = true) {
  if (projectIds.length === 0) return [];
  const activityRows = await fetchAllRows((from, to) => supabase
    .from("activities")
    .select("*")
    .in("project_id", projectIds)
    .order("order", { ascending: true }).order("id").range(from, to));
  const activityIds = activityRows.map((a) => a.id);

  if (activityIds.length === 0) return [];

  const [checklistRows, submissionRows, budgetRows] = await Promise.all([
    includeDetails ? fetchAllRows((from, to) => supabase.from("checklist_items").select("*").in("activity_id", activityIds).order("order").order("id").range(from, to)) : [],
    fetchAllRows((from, to) => supabase.from("submissions").select("*").in("activity_id", activityIds).order("created_at").order("id").range(from, to)),
    fetchAllRows((from, to) => supabase.from("budget_actual_entries").select("*").in("activity_id", activityIds).order("date", { ascending: false }).order("id").range(from, to)),
  ]);
  const submissionIds = submissionRows.map((s) => s.id);

  const linkedContractIds = [...new Set(activityRows.map((a) => a.linked_contract_id).filter((id): id is string => !!id))];
  const linkedContracts = linkedContractIds.length > 0
    ? await fetchAllRows((from, to) => supabase.from("contracts")
        .select("id, contract_name, status, total_value, vat_inclusive, vat_rate")
        .in("id", linkedContractIds).order("id").range(from, to)) : [];
  const linkedContractById = new Map(linkedContracts.map((c) => [c.id, c]));

  const [resultRows, imageRows] = includeDetails && submissionIds.length > 0
    ? await Promise.all([
        fetchAllRows((from, to) => supabase.from("checklist_results").select("*").in("submission_id", submissionIds).order("id").range(from, to)),
        fetchAllRows((from, to) => supabase.from("submission_images").select("*").in("submission_id", submissionIds).order("id").range(from, to)),
      ]) : [[], []];
  const signatureUrlByStored = includeDetails
    ? await getFileUrls("signatures", submissionRows.map((s) => s.manager_signature_url))
    : new Map<string, string>();
  const checklistByActivity = new Map<string, ReturnType<typeof mapChecklistItem>[]>();
  for (const row of checklistRows) {
    const item = mapChecklistItem(row);
    const list = checklistByActivity.get(item.activityId) ?? [];
    list.push(item);
    checklistByActivity.set(item.activityId, list);
  }

  const resultsBySubmission = new Map<string, ReturnType<typeof mapChecklistResult>[]>();
  for (const row of resultRows) {
    const item = mapChecklistResult(row);
    const list = resultsBySubmission.get(item.submissionId) ?? [];
    list.push(item);
    resultsBySubmission.set(item.submissionId, list);
  }

  const imagesBySubmission = new Map<string, typeof imageRows>();
  for (const row of imageRows) {
    const list = imagesBySubmission.get(row.submission_id) ?? [];
    list.push(row);
    imagesBySubmission.set(row.submission_id, list);
  }

  const submissionsByActivity = new Map<string, Submission[]>();
  for (const row of submissionRows) {
    const submission = mapSubmission(
      row,
      resultsBySubmission.get(row.id) ?? [],
      imagesBySubmission.get(row.id) ?? []
    );
    submission.managerSignatureUrl = row.manager_signature_url
      ? signatureUrlByStored.get(row.manager_signature_url) ?? null
      : null;
    const list = submissionsByActivity.get(submission.activityId) ?? [];
    list.push(submission);
    submissionsByActivity.set(submission.activityId, list);
  }

  const budgetByActivity = new Map<string, ReturnType<typeof mapBudgetEntry>[]>();
  for (const row of budgetRows) {
    const entry = mapBudgetEntry(row);
    const list = budgetByActivity.get(entry.activityId) ?? [];
    list.push(entry);
    budgetByActivity.set(entry.activityId, list);
  }

  return activityRows.map((row) => {
    const activity = mapActivity(row, checklistByActivity.get(row.id) ?? []);
    activity.submissions = submissionsByActivity.get(row.id) ?? [];
    activity.actualEntries = budgetByActivity.get(row.id) ?? [];
    const contract = row.linked_contract_id ? linkedContractById.get(row.linked_contract_id) : undefined;
    if (contract) {
      activity.linkedContractName = contract.contract_name;
      activity.linkedContractStatus = contract.status as ContractStatus;
      activity.linkedContractValue =
        contract.total_value != null
          ? contract.vat_rate != null
            ? computeVat(contract.total_value, contract.vat_inclusive, contract.vat_rate).valueIncludingVat
            : contract.total_value
          : null;
    }
    return activity;
  });
}
export function useActivities(projectId: string | undefined) {
  return useQuery({
    queryKey: ["activities", projectId], enabled: !!projectId,
    queryFn: () => loadActivities([projectId!]),
  });
}
