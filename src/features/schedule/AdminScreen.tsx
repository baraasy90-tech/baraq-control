import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronUp, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import { SecondaryButton, PrimaryButton, IconButton, Modal, ErrorText } from "@/components/ui";
import { useActivities } from "@/features/schedule/api/useActivities";
import { useCreateActivity } from "@/features/schedule/api/useCreateActivity";
import { useUpdateActivity } from "@/features/schedule/api/useUpdateActivity";
import { useDeleteActivity } from "@/features/schedule/api/useDeleteActivity";
import { useSaveChecklist } from "@/features/schedule/api/useSaveChecklist";
import { ActivityForm, type ActivityFormValues } from "@/features/schedule/ActivityForm";
import { computeSchedule } from "@/features/schedule/lib/schedule";
import { useCustomCalendars } from "@/features/schedule/api/useCustomCalendars";
import { useCompanyMembers } from "@/features/company/api/useCompanyMembers";
import { withComputedDone } from "@/features/schedule/lib/completion";
import { exportPrimaveraXer, downloadXerFile } from "@/features/schedule/lib/exportXer";
import { fmt } from "@/utils/dates";
import type { Activity, Project } from "@/types/domain";

function buildChildrenMap(activities: Activity[]): Map<string | null, Activity[]> {
  const map = new Map<string | null, Activity[]>();
  for (const a of activities) {
    const list = map.get(a.parentId) ?? [];
    list.push(a);
    map.set(a.parentId, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.order - b.order);
  return map;
}

function ActivityRow({
  activity,
  depth,
  childrenMap,
  schedule,
  siblings,
  memberNameById,
  onEdit,
  onAddChild,
  onDelete,
  onToggleDone,
  onMove,
}: {
  activity: Activity;
  depth: number;
  childrenMap: Map<string | null, Activity[]>;
  schedule: ReturnType<typeof computeSchedule>;
  siblings: Activity[];
  memberNameById: Map<string, string>;
  onEdit: (a: Activity) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (a: Activity) => void;
  onToggleDone: (a: Activity) => void;
  onMove: (a: Activity, direction: "up" | "down") => void;
}) {
  const children = childrenMap.get(activity.id) ?? [];
  const sc = schedule[activity.id];
  const index = siblings.findIndex((s) => s.id === activity.id);
  const isAutoDone = children.length > 0 || activity.requiresReceiving;

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-2 py-3 border-b border-line/60 last:border-b-0"
        style={{ paddingRight: depth * 20 }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <input
            type="checkbox"
            checked={activity.done}
            onChange={() => !isAutoDone && onToggleDone(activity)}
            disabled={isAutoDone}
            title={isAutoDone ? "يُحدَّد تلقائياً من اعتماد الاستلام/اكتمال البنود التابعة" : undefined}
            className="shrink-0 disabled:opacity-60"
          />
          <span className="text-sm font-medium text-ink truncate">{activity.name}</span>
          {activity.critical && <span title="يتطلب طلباً وتوريداً مسبقاً">📦</span>}
          {activity.requiresReceiving && (
            <span className="text-[10px] bg-primary-bg text-primary rounded px-1.5 py-0.5 shrink-0">استلام</span>
          )}
          {activity.assignedTo && memberNameById.get(activity.assignedTo) && (
            <span className="text-[10px] bg-bg text-ink-soft rounded px-1.5 py-0.5 shrink-0">
              👤 {memberNameById.get(activity.assignedTo)}
            </span>
          )}
        </div>
        <div className="text-xs text-ink-soft font-mono shrink-0 hidden sm:block">
          {sc ? `${fmt(sc.start)} → ${fmt(sc.end)}` : "—"} · {activity.durationDays} يوم
        </div>
        <div className="flex gap-1 shrink-0">
          <IconButton icon={ChevronUp} label="نقل لأعلى" onClick={() => onMove(activity, "up")} disabled={index <= 0} />
          <IconButton
            icon={ChevronDown}
            label="نقل لأسفل"
            onClick={() => onMove(activity, "down")}
            disabled={index >= siblings.length - 1}
          />
          <IconButton icon={Plus} label="إضافة بند تابع" onClick={() => onAddChild(activity.id)} />
          <IconButton icon={Pencil} label="تعديل" onClick={() => onEdit(activity)} />
          <IconButton icon={Trash2} label="حذف" tone="critical" onClick={() => onDelete(activity)} />
        </div>
      </div>
      {children.map((child) => (
        <ActivityRow
          key={child.id}
          activity={child}
          depth={depth + 1}
          childrenMap={childrenMap}
          schedule={schedule}
          siblings={children}
          memberNameById={memberNameById}
          onEdit={onEdit}
          onAddChild={onAddChild}
          onDelete={onDelete}
          onToggleDone={onToggleDone}
          onMove={onMove}
        />
      ))}
    </div>
  );
}

export function AdminScreen({ project }: { project: Project }) {
  const navigate = useNavigate();
  const activitiesQuery = useActivities(project.id);
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity(project.id);
  const saveChecklist = useSaveChecklist(project.id);

  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Activity | null>(null);
  const [error, setError] = useState("");

  const customCalendarsQuery = useCustomCalendars(project.companyId);
  const customCalendars = customCalendarsQuery.data ?? [];
  const membersQuery = useCompanyMembers(project.companyId);
  const members = membersQuery.data ?? [];
  const memberNameById = new Map(members.map((m) => [m.id, m.fullName]));
  const customCalendarMap = new Map(customCalendars.map((c) => [c.id, c.workingWeekdays]));
  const activities = withComputedDone(activitiesQuery.data ?? []);
  const schedule = computeSchedule(activities, customCalendarMap);
  const childrenMap = buildChildrenMap(activities);
  const roots = childrenMap.get(null) ?? [];

  const openCreate = (parentId: string | null) => {
    setEditingActivity(null);
    setNewParentId(parentId);
    setFormOpen(true);
  };

  const openEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setNewParentId(activity.parentId);
    setFormOpen(true);
  };

  const handleSave = async (values: ActivityFormValues) => {
    setError("");
    try {
      if (editingActivity) {
        await updateActivity.mutateAsync({
          id: editingActivity.id,
          projectId: project.id,
          name: values.name,
          durationDays: values.durationDays,
          calendarType: values.calendarType,
          customCalendarId: values.customCalendarId,
          assignedTo: values.assignedTo,
          startDate: values.startDate,
          dependsOn: values.dependsOn,
          depType: values.dependsOn ? values.depType : null,
          lagDays: values.lagDays,
          lagUnit: values.lagUnit,
          critical: values.critical,
          alertLeadDays: values.alertLeadDays,
          requiresReceiving: values.requiresReceiving,
          budgetType: values.budgetType,
          plannedAmount: values.plannedAmount,
          boqQty: values.boqQty,
          boqUnit: values.boqUnit,
          boqUnitPrice: values.boqUnitPrice,
        });
        await saveChecklist.mutateAsync({ activityId: editingActivity.id, items: values.checklist });
      } else {
        const siblings = childrenMap.get(newParentId) ?? [];
        const nextOrder = siblings.length > 0 ? Math.max(...siblings.map((s) => s.order)) + 1 : 1;
        const created = await createActivity.mutateAsync({
          projectId: project.id,
          parentId: newParentId,
          name: values.name,
          order: nextOrder,
          durationDays: values.durationDays,
          calendarType: values.calendarType,
          customCalendarId: values.customCalendarId,
          assignedTo: values.assignedTo,
          startDate: values.startDate,
          dependsOn: values.dependsOn,
          depType: values.dependsOn ? values.depType : null,
          lagDays: values.lagDays,
          lagUnit: values.lagUnit,
          critical: values.critical,
          alertLeadDays: values.alertLeadDays,
          requiresReceiving: values.requiresReceiving,
          scopeType: "project",
          scopeRef: null,
          budgetType: values.budgetType,
          plannedAmount: values.plannedAmount,
          boqQty: values.boqQty,
          boqUnit: values.boqUnit,
          boqUnitPrice: values.boqUnitPrice,
        });
        if (values.checklist.length > 0) {
          await saveChecklist.mutateAsync({ activityId: created.id, items: values.checklist });
        }
      }
      setFormOpen(false);
      setEditingActivity(null);
    } catch {
      setError("تعذّر حفظ البند، حاول مجدداً");
    }
  };

  const handleDelete = async (activity: Activity) => {
    try {
      await deleteActivity.mutateAsync(activity.id);
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleToggleDone = (activity: Activity) => {
    updateActivity.mutate({ id: activity.id, projectId: project.id, done: !activity.done });
  };

  const handleMove = (activity: Activity, direction: "up" | "down") => {
    const siblings = childrenMap.get(activity.parentId) ?? [];
    const index = siblings.findIndex((s) => s.id === activity.id);
    const swapWith = direction === "up" ? siblings[index - 1] : siblings[index + 1];
    if (!swapWith) return;
    updateActivity.mutate({ id: activity.id, projectId: project.id, order: swapWith.order });
    updateActivity.mutate({ id: swapWith.id, projectId: project.id, order: activity.order });
  };

  const candidateDependencies = activities.filter((a) => a.id !== editingActivity?.id);

  const handleExportXer = () => {
    const xer = exportPrimaveraXer(project, activities, schedule);
    downloadXerFile(xer, `${project.name.replace(/[^\w؀-ۿ]+/g, "_")}.xer`);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-ink truncate">إدارة المراحل — {project.name}</h1>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <SecondaryButton onClick={() => navigate(`/projects/${project.id}/import`)} className="text-sm">
            إرفاق الجدول الزمني
          </SecondaryButton>
          <SecondaryButton onClick={handleExportXer} disabled={roots.length === 0} className="text-sm">
            تصدير لبريمافيرا (XER)
          </SecondaryButton>
          <SecondaryButton onClick={() => navigate(`/projects/${project.id}`)} className="text-sm">
            رجوع
          </SecondaryButton>
        </div>
      </div>

      <div className="flex justify-end mb-3">
        <PrimaryButton onClick={() => openCreate(null)} className="w-auto px-4 py-2 text-sm inline-flex items-center gap-1.5">
          <Plus size={15} strokeWidth={2.5} /> مرحلة رئيسية
        </PrimaryButton>
      </div>

      {activitiesQuery.isLoading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}
      {activitiesQuery.isError && <p className="text-sm text-critical">تعذّر تحميل المراحل</p>}

      {roots.length === 0 && !activitiesQuery.isLoading ? (
        <div className="bg-panel border border-dashed border-line rounded-xl p-10 text-center text-sm text-ink-soft">
          لا توجد مراحل بعد — ابدأ بإضافة أول مرحلة رئيسية
        </div>
      ) : (
        <div className="bg-panel border border-line/60 shadow-sm rounded-xl px-4">
          {roots.map((root) => (
            <ActivityRow
              key={root.id}
              activity={root}
              depth={0}
              childrenMap={childrenMap}
              schedule={schedule}
              siblings={roots}
              memberNameById={memberNameById}
              onEdit={openEdit}
              onAddChild={openCreate}
              onDelete={setConfirmDelete}
              onToggleDone={handleToggleDone}
              onMove={handleMove}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <Modal
          title={editingActivity ? "تعديل البند" : "بند جديد"}
          onClose={() => {
            setFormOpen(false);
            setEditingActivity(null);
          }}
        >
          <ErrorText>{error}</ErrorText>
          <ActivityForm
            initial={editingActivity}
            candidateDependencies={candidateDependencies}
            customCalendars={customCalendars}
            members={members}
            saving={createActivity.isPending || updateActivity.isPending || saveChecklist.isPending}
            onSave={handleSave}
            onCancel={() => {
              setFormOpen(false);
              setEditingActivity(null);
            }}
          />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="تأكيد الحذف" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-ink-soft mb-5">
            هل أنت متأكد من حذف "{confirmDelete.name}"؟ سيتم حذف كل البنود التابعة له أيضاً بشكل نهائي.
          </p>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setConfirmDelete(null)} className="flex-1">
              إلغاء
            </SecondaryButton>
            <button
              onClick={() => handleDelete(confirmDelete)}
              className="flex-1 py-2.5 rounded-lg bg-critical text-white border-none font-bold text-sm cursor-pointer"
            >
              حذف نهائياً
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
