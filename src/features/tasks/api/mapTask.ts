import type { Database } from "@/lib/supabase/database.types";
import type { Task } from "@/types/domain";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

export function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}
