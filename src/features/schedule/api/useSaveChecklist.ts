import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export interface ChecklistItemDraft {
  id?: string;
  text: string;
  photoRequired: boolean;
  order: number;
}

const draftIds = new WeakMap<ChecklistItemDraft, string>();

export function useSaveChecklist(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ activityId, items }: { activityId: string; items: ChecklistItemDraft[] }) => {
      const payload = items.map(item => ({
        id: item.id ?? (draftIds.get(item) ?? (() => { const id = crypto.randomUUID(); draftIds.set(item, id); return id; })()),
        text: item.text, photo_required: item.photoRequired, order: item.order,
      }));
      const {error} = await supabase.rpc('save_checklist_atomic', {p_activity_id:activityId,p_items:payload});
      if(error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", projectId] });
    },
  });
}

