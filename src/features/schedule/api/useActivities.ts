import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapActivity, mapChecklistItem } from "@/features/schedule/api/mapActivity";
import { mapChecklistResult, mapSubmission } from "@/features/receiving/api/mapSubmission";
import { mapBudgetEntry } from "@/features/budget/api/mapBudgetEntry";
import type { Submission } from "@/types/domain";

/**
 * جلب موحّد لكل بيانات أنشطة المشروع: الشجرة + الاستلامات الفرعية + تقديمات الاستلام
 * (بنتائجها وصورها) + الدفعات الفعلية للميزانية — مصدر بيانات واحد تستخدمه كل
 * الشاشات (الإدارة، الرئيسية، الاستلام، الميزانية) بدل تكرار نفس الاستعلامات.
 */
export function useActivities(projectId: string | undefined) {
  return useQuery({
    queryKey: ["activities", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const activitiesRes = await supabase
        .from("activities")
        .select("*")
        .eq("project_id", projectId!)
        .order("order", { ascending: true });
      if (activitiesRes.error) throw activitiesRes.error;
      const activityIds = activitiesRes.data.map((a) => a.id);

      if (activityIds.length === 0) return [];

      const [checklistRes, submissionsRes, budgetRes] = await Promise.all([
        supabase.from("checklist_items").select("*").in("activity_id", activityIds).order("order", { ascending: true }),
        supabase.from("submissions").select("*").in("activity_id", activityIds).order("created_at", { ascending: true }),
        supabase.from("budget_actual_entries").select("*").in("activity_id", activityIds).order("date", { ascending: false }),
      ]);
      if (checklistRes.error) throw checklistRes.error;
      if (submissionsRes.error) throw submissionsRes.error;
      if (budgetRes.error) throw budgetRes.error;
      const submissionIds = submissionsRes.data.map((s) => s.id);

      const [resultsRes, imagesRes] = await Promise.all([
        supabase.from("checklist_results").select("*").in("submission_id", submissionIds),
        supabase.from("submission_images").select("*").in("submission_id", submissionIds),
      ]);
      if (resultsRes.error) throw resultsRes.error;
      if (imagesRes.error) throw imagesRes.error;

      const checklistByActivity = new Map<string, ReturnType<typeof mapChecklistItem>[]>();
      for (const row of checklistRes.data) {
        const item = mapChecklistItem(row);
        const list = checklistByActivity.get(item.activityId) ?? [];
        list.push(item);
        checklistByActivity.set(item.activityId, list);
      }

      const resultsBySubmission = new Map<string, ReturnType<typeof mapChecklistResult>[]>();
      for (const row of resultsRes.data) {
        const item = mapChecklistResult(row);
        const list = resultsBySubmission.get(item.submissionId) ?? [];
        list.push(item);
        resultsBySubmission.set(item.submissionId, list);
      }

      const imagesBySubmission = new Map<string, typeof imagesRes.data>();
      for (const row of imagesRes.data) {
        const list = imagesBySubmission.get(row.submission_id) ?? [];
        list.push(row);
        imagesBySubmission.set(row.submission_id, list);
      }

      const submissionsByActivity = new Map<string, Submission[]>();
      for (const row of submissionsRes.data) {
        const submission = mapSubmission(
          row,
          resultsBySubmission.get(row.id) ?? [],
          imagesBySubmission.get(row.id) ?? []
        );
        const list = submissionsByActivity.get(submission.activityId) ?? [];
        list.push(submission);
        submissionsByActivity.set(submission.activityId, list);
      }

      const budgetByActivity = new Map<string, ReturnType<typeof mapBudgetEntry>[]>();
      for (const row of budgetRes.data) {
        const entry = mapBudgetEntry(row);
        const list = budgetByActivity.get(entry.activityId) ?? [];
        list.push(entry);
        budgetByActivity.set(entry.activityId, list);
      }

      return activitiesRes.data.map((row) => {
        const activity = mapActivity(row, checklistByActivity.get(row.id) ?? []);
        activity.submissions = submissionsByActivity.get(row.id) ?? [];
        activity.actualEntries = budgetByActivity.get(row.id) ?? [];
        return activity;
      });
    },
  });
}
