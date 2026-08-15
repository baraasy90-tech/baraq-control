import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { TaskStatus } from "@/types/domain";

type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export interface UpdateTaskInput {
  id: string;
  companyId: string;
  status?: TaskStatus;
  assignedTo?: string | null;
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTaskInput) => {
      const patch: TaskUpdate = {};
      if (input.status !== undefined) {
        patch.status = input.status;
        patch.completed_at = input.status === "done" ? new Date().toISOString() : null;
      }
      if (input.assignedTo !== undefined) patch.assigned_to = input.assignedTo;
      const { error } = await supabase.from("tasks").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", input.companyId] });
    },
  });
}
