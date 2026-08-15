import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export interface ChecklistItemDraft {
  id?: string;
  text: string;
  photoRequired: boolean;
  order: number;
}

export function useSaveChecklist(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ activityId, items }: { activityId: string; items: ChecklistItemDraft[] }) => {
      const { data: existing, error: fetchError } = await supabase
        .from("checklist_items")
        .select("id")
        .eq("activity_id", activityId);
      if (fetchError) throw fetchError;

      const keepIds = new Set(items.filter((i) => i.id).map((i) => i.id));
      const toDelete = existing.filter((row) => !keepIds.has(row.id)).map((row) => row.id);
      if (toDelete.length > 0) {
        const { error } = await supabase.from("checklist_items").delete().in("id", toDelete);
        if (error) throw error;
      }

      const toUpdate = items.filter((i) => i.id);
      for (const item of toUpdate) {
        const { error } = await supabase
          .from("checklist_items")
          .update({ text: item.text, photo_required: item.photoRequired, order: item.order })
          .eq("id", item.id!);
        if (error) throw error;
      }

      const toInsert = items.filter((i) => !i.id);
      if (toInsert.length > 0) {
        const { error } = await supabase.from("checklist_items").insert(
          toInsert.map((i) => ({
            activity_id: activityId,
            text: i.text,
            photo_required: i.photoRequired,
            order: i.order,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", projectId] });
    },
  });
}
