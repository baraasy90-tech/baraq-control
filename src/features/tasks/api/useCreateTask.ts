import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapTask } from "@/features/tasks/api/mapTask";
import { useAuth } from "@/features/auth/AuthContext";
import type { TaskPriority } from "@/types/domain";

export interface CreateTaskInput {
  companyId: string;
  projectId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  dueDate: string | null;
  assignedTo: string | null;
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      if (!user) throw new Error("غير مسجّل دخول");
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          project_id: input.projectId,
          title: input.title,
          description: input.description,
          priority: input.priority,
          due_date: input.dueDate,
          assigned_to: input.assignedTo,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return mapTask(data);
    },
    onSuccess: (_task, input) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", input.companyId] });
    },
  });
}
