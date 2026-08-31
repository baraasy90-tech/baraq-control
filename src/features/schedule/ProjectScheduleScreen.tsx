import { useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { ChevronUp, ChevronDown, Plus, Pencil, Trash2, FileCode } from "lucide-react";
import { SecondaryButton, PrimaryButton, IconButton, Card, Modal, ErrorText, ExportMenu } from "@/components/ui";
import { useActivities } from "@/features/schedule/api/useActivities";
import { useCreateActivity } from "@/features/schedule/api/useCreateActivity";
import { useUpdateActivity } from "@/features/schedule/api/useUpdateActivity";
import { useDeleteActivity } from "@/features/schedule/api/useDeleteActivity";
import { useSaveChecklist } from "@/features/schedule/api/useSaveChecklist";
import { ActivityForm, type ActivityFormValues } from "@/features/schedule/ActivityForm";
import { computeSchedule } from "@/features/schedule/lib/schedule";
import { useCustomCalendars, useCustomCalendarMap } from "@/features/schedule/api/useCustomCalendars";
import { useCompanyMembers } from "@/features/company/api/useCompanyMembers";
import { withComputedDone, getCompletionDates } from "@/features/schedule/lib/completion";
import { exportPrimaveraXer, downloadXerFile } from "@/features/schedule/lib/exportXer";
import { suggestActivityCode } from "@/features/schedule/lib/activityCode";
import { useScheduleHolidays } from "@/features/schedule/api/useScheduleHolidays";
import { useCompany } from "@/features/company/useCompany";
import { fmt, todayISO } from "@/utils/dates";
import { getErrorMessage } from "@/utils/errors";
import type { Activity, Project, Schedule } from "@/types/domain";

export type ScheduleTab = "create" | "preview";

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
  onStartNow,
  onSetActualDate,
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
  onStartNow: (a: Activity) => void;
  onSetActualDate: (a: Activity, field: "start" | "end", value: string) => void;
  onMove: (a: Activity, direction: "up" | "down") => void;
}) {
  const children = childrenMap.get(activity.id) ?? [];
  const sc = schedule[activity.id];
  const index = siblings.findIndex((s) => s.id === activity.id);
  const isAutoDone = children.length > 0 || activity.requiresReceiving;

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-2 pt-3 pb-1.5"
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
          {activity.code && (
            <span className="text-[11px] font-mono font-bold text-ink-soft bg-bg rounded px-1.5 py-0.5 shrink-0">{activity.code}</span>
          )}
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
          {activity.actualStartDate && !activity.actualEndDate && (
            <span className="text-[10px] bg-warn-bg text-warn rounded px-1.5 py-0.5 shrink-0">
              جارٍ منذ {fmt(activity.actualStartDate)}
            </span>
          )}
        </div>
        <div className="text-xs text-ink-soft font-mono shrink-0 hidden sm:block">
          {sc ? `${fmt(sc.start)} → ${fmt(sc.end)}` : "—"} · {activity.durationDays} يوم
        </div>
        {!activity.actualStartDate && (
          <SecondaryButton onClick={() => onStartNow(activity)} className="text-[11px] px-2 py-1 shrink-0">
            بدء الآن
          </SecondaryButton>
        )}
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

      <div
        className="flex items-center gap-4 flex-wrap pb-3 border-b border-line/60 last:border-b-0"
        style={{ paddingRight: depth * 20 + 28 }}
      >
        <label className="flex items-center gap-1.5 text-[11px] text-ink-soft">
          <span className="shrink-0">البداية الفعلية</span>
          <input
            type="date"
            value={activity.actualStartDate ?? ""}
            onChange={(e) => onSetActualDate(activity, "start", e.target.value)}
            className="border border-line rounded px-1.5 py-1 text-[11px] font-mono bg-white"
          />
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-ink-soft">
          <span className="shrink-0">النهاية الفعلية</span>
          <input
            type="date"
            value={activity.actualEndDate ?? ""}
            onChange={(e) => onSetActualDate(activity, "end", e.target.value)}
            className="border border-line rounded px-1.5 py-1 text-[11px] font-mono bg-white"
          />
        </label>
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
          onStartNow={onStartNow}
          onSetActualDate={onSetActualDate}
          onMove={onMove}
        />
      ))}
    </div>
  );
}

function CreateTab({
  project,
  activities,
  schedule,
  childrenMap,
}: {
  project: Project;
  activities: Activity[];
  schedule: Schedule;
  childrenMap: Map<string | null, Activity[]>;
}) {
  const navigate = useNavigate();
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity(project.id);
  const saveChecklist = useSaveChecklist(project.id);

  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [suggestedCode, setSuggestedCode] = useState<string | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<Activity | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [error, setError] = useState("");

  const customCalendarsQuery = useCustomCalendars(project.companyId);
  const customCalendars = customCalendarsQuery.data ?? [];
  const membersQuery = useCompanyMembers(project.companyId);
  const members = membersQuery.data ?? [];
  const memberNameById = new Map(members.map((m) => [m.id, m.fullName]));
  const roots = childrenMap.get(null) ?? [];

  const openCreate = (parentId: string | null) => {
    setEditingActivity(null);
    setNewParentId(parentId);
    const parentCode = parentId ? (activities.find((a) => a.id === parentId)?.code ?? null) : null;
    const siblingCount = (childrenMap.get(parentId) ?? []).length;
    setSuggestedCode(suggestActivityCode(parentCode, siblingCount));
    setFormOpen(true);
  };

  const openEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setNewParentId(activity.parentId);
    setSuggestedCode(undefined);
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
          code: values.code,
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
          actualStartDate: values.actualStartDate,
          actualEndDate: values.actualEndDate,
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
          code: values.code,
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
    } catch (err) {
      setError(getErrorMessage(err, "تعذّر حفظ البند، حاول مجدداً"));
    }
  };

  const handleDelete = async (activity: Activity) => {
    setDeleteError("");
    try {
      await deleteActivity.mutateAsync(activity.id);
      setConfirmDelete(null);
    } catch (err) {
      setDeleteError(getErrorMessage(err, "تعذّر حذف البند، حاول مجدداً"));
    }
  };

  const handleToggleDone = (activity: Activity) => {
    const nextDone = !activity.done;
    updateActivity.mutate({
      id: activity.id,
      projectId: project.id,
      done: nextDone,
      actualEndDate: nextDone ? (activity.actualEndDate ?? todayISO()) : null,
    });
  };

  const handleStartNow = (activity: Activity) => {
    updateActivity.mutate({ id: activity.id, projectId: project.id, actualStartDate: todayISO() });
  };

  const handleSetActualDate = (activity: Activity, field: "start" | "end", value: string) => {
    updateActivity.mutate({
      id: activity.id,
      projectId: project.id,
      ...(field === "start" ? { actualStartDate: value || null } : { actualEndDate: value || null }),
    });
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
    <div>
      <div className="flex justify-end gap-2 mb-3 flex-wrap">
        <SecondaryButton onClick={() => navigate(`/projects/${project.id}/import`)} className="text-sm">
          إرفاق الجدول الزمني
        </SecondaryButton>
        <ExportMenu
          options={[{ label: "تصدير لبريمافيرا (XER)", icon: FileCode, onSelect: handleExportXer, disabled: roots.length === 0 }]}
        />
        <PrimaryButton onClick={() => openCreate(null)} className="w-auto px-4 py-2 text-sm inline-flex items-center gap-1.5">
          <Plus size={15} strokeWidth={2.5} /> مرحلة رئيسية
        </PrimaryButton>
      </div>

      {roots.length === 0 ? (
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
              onStartNow={handleStartNow}
              onSetActualDate={handleSetActualDate}
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
            suggestedCode={suggestedCode}
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
        <Modal
          title="تأكيد الحذف"
          onClose={() => {
            setConfirmDelete(null);
            setDeleteError("");
          }}
        >
          <p className="text-sm text-ink-soft mb-5">
            هل أنت متأكد من حذف "{confirmDelete.name}"؟ سيتم حذف كل البنود التابعة له أيضاً بشكل نهائي.
          </p>
          <ErrorText>{deleteError}</ErrorText>
          <div className="flex gap-2">
            <SecondaryButton
              onClick={() => {
                setConfirmDelete(null);
                setDeleteError("");
              }}
              className="flex-1"
            >
              إلغاء
            </SecondaryButton>
            <button
              onClick={() => handleDelete(confirmDelete)}
              disabled={deleteActivity.isPending}
              className="flex-1 py-2.5 rounded-lg bg-critical text-white border-none font-bold text-sm cursor-pointer disabled:opacity-50"
            >
              {deleteActivity.isPending ? "جارٍ الحذف..." : "حذف نهائياً"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const TONE_COLOR: Record<"onTime" | "doneLate" | "current" | "overdue" | "upcoming", string> = {
  onTime: "#2E9E52",
  doneLate: "#DFA22E",
  current: "#2E6FE8",
  overdue: "#D64545",
  upcoming: "#94A3B8",
};
const HOLIDAY_COLOR = "#8A3FE8";
const dayMs = 86400000;
const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / dayMs);

interface GanttRow {
  activity: Activity;
  depth: number;
}

function flattenTree(activities: Activity[]): GanttRow[] {
  const childrenMap = new Map<string | null, Activity[]>();
  for (const a of activities) {
    const list = childrenMap.get(a.parentId) ?? [];
    list.push(a);
    childrenMap.set(a.parentId, list);
  }
  for (const list of childrenMap.values()) list.sort((a, b) => a.order - b.order);

  const rows: GanttRow[] = [];
  function walk(parentId: string | null, depth: number) {
    for (const a of childrenMap.get(parentId) ?? []) {
      rows.push({ activity: a, depth });
      walk(a.id, depth + 1);
    }
  }
  walk(null, 0);
  return rows;
}

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-SA", { month: "short", year: "2-digit" });
}

function PreviewTab({ activities, schedule }: { activities: Activity[]; schedule: Schedule }) {
  const { company } = useCompany();
  const completionDates = getCompletionDates(activities);
  const rows = flattenTree(activities).filter((r) => schedule[r.activity.id]);
  const groupIds = new Set(activities.map((a) => a.parentId).filter((id): id is string => !!id));

  const todayForRange = todayISO();
  const starts = rows.flatMap((r) => [schedule[r.activity.id].start, ...(r.activity.actualStartDate ? [r.activity.actualStartDate] : [])]);
  const ends = rows.flatMap((r) => [
    schedule[r.activity.id].end,
    ...(r.activity.actualStartDate ? [r.activity.actualEndDate ?? todayForRange] : []),
  ]);
  const rangeStart = starts.length > 0 ? starts.reduce((min, s) => (s < min ? s : min)) : undefined;
  const rangeEndRaw = ends.length > 0 ? ends.reduce((max, e) => (e > max ? e : max)) : undefined;
  const rangeEnd =
    rangeStart && rangeEndRaw
      ? daysBetween(rangeStart, rangeEndRaw) < 1
        ? new Date(new Date(rangeStart).getTime() + dayMs).toISOString().slice(0, 10)
        : rangeEndRaw
      : undefined;
  const totalDays = rangeStart && rangeEnd ? Math.max(1, daysBetween(rangeStart, rangeEnd)) : 1;

  const holidaysQuery = useScheduleHolidays(company.id, company.countryCode, rangeStart, rangeEnd);
  const holidays = holidaysQuery.data ?? [];

  if (rows.length === 0 || !rangeStart || !rangeEnd) {
    return (
      <div className="bg-panel border border-dashed border-line rounded-xl p-10 text-center text-sm text-ink-soft">
        لا توجد مراحل مجدولة بعد لعرضها كجدول زمني
      </div>
    );
  }

  const months: { iso: string; leftPct: number }[] = [];
  {
    const cursor = new Date(rangeStart);
    cursor.setDate(1);
    while (cursor.toISOString().slice(0, 10) <= rangeEnd) {
      const iso = cursor.toISOString().slice(0, 10);
      if (iso >= rangeStart || months.length === 0) {
        const offset = Math.max(0, daysBetween(rangeStart, iso));
        months.push({ iso, leftPct: (offset / totalDays) * 100 });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  const t = todayISO();
  const todayOffset = daysBetween(rangeStart, t);
  const todayPct = todayOffset >= 0 && todayOffset <= totalDays ? (todayOffset / totalDays) * 100 : null;

  const toneColor = (activity: Activity, sc: Schedule[string]): string => {
    const isLate = !activity.done && t > sc.end;
    const isCurrent = !activity.done && sc.start <= t && t <= sc.end;
    if (activity.done) {
      const d = completionDates.get(activity.id);
      const onTime = !d || d <= sc.end;
      return onTime ? TONE_COLOR.onTime : TONE_COLOR.doneLate;
    }
    if (isLate) return TONE_COLOR.overdue;
    if (isCurrent) return TONE_COLOR.current;
    return TONE_COLOR.upcoming;
  };

  const holidayMarkers = holidays
    .filter((h) => h.date >= rangeStart && h.date <= rangeEnd)
    .map((h) => ({ ...h, leftPct: (Math.max(0, daysBetween(rangeStart, h.date)) / totalDays) * 100 }));

  // المسار الفعلي: أخضر لو بدأ بموعده أو أبكر وانتهى (أو ما زال جارياً) بموعده أو أسرع من
  // المخطط، أحمر لو تأخر بالبداية أو تجاوز نهاية المخطط.
  const actualToneColor = (activity: Activity, sc: Schedule[string]): string => {
    const actualStart = activity.actualStartDate!;
    const actualEnd = activity.actualEndDate ?? t;
    const delayed = actualStart > sc.start || actualEnd > sc.end;
    return delayed ? TONE_COLOR.overdue : TONE_COLOR.onTime;
  };

  return (
    <div>
      <Card className="overflow-x-auto">
        <div style={{ minWidth: 700 }}>
          <div className="flex border-b border-line/60 pb-2 mb-2">
            <div className="w-48 shrink-0 text-xs font-bold text-ink-soft">البند</div>
            <div className="flex-1 relative h-5">
              {months.map((m) => (
                <div
                  key={m.iso}
                  className="absolute top-0 text-[10px] text-ink-soft font-mono border-r border-line/60 pr-1.5"
                  style={{ left: `${m.leftPct}%` }}
                >
                  {monthLabel(m.iso)}
                </div>
              ))}
              {holidayMarkers.map((h, i) => (
                <div
                  key={i}
                  title={`${h.name} · ${fmt(h.date)}`}
                  className="absolute top-0 bottom-0 w-1 rounded-sm"
                  style={{ left: `${h.leftPct}%`, background: HOLIDAY_COLOR }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {rows.map(({ activity, depth }) => {
              const sc = schedule[activity.id];
              const offset = Math.max(0, daysBetween(rangeStart, sc.start));
              const duration = Math.max(1, daysBetween(sc.start, sc.end));
              const leftPct = (offset / totalDays) * 100;
              const widthPct = (duration / totalDays) * 100;

              const hasActual = !!activity.actualStartDate;
              let actualLeftPct = 0;
              let actualWidthPct = 0;
              if (hasActual) {
                const actualStart = activity.actualStartDate!;
                const actualEnd = activity.actualEndDate ?? t;
                const actualOffset = Math.max(0, daysBetween(rangeStart, actualStart));
                const actualDuration = Math.max(1, daysBetween(actualStart, actualEnd));
                actualLeftPct = (actualOffset / totalDays) * 100;
                actualWidthPct = (actualDuration / totalDays) * 100;
              }

              const actualColor = hasActual ? actualToneColor(activity, sc) : undefined;
              const isGroup = groupIds.has(activity.id);

              return (
                <div key={activity.id} className="flex items-center">
                  <div
                    className={`w-48 shrink-0 text-xs truncate pl-2 ${isGroup ? "font-bold text-ink" : "text-ink"}`}
                    style={{ paddingRight: depth * 12 }}
                    title={activity.name}
                  >
                    <div className="truncate">
                      {activity.code && <span className="font-mono text-ink-soft">{activity.code} </span>}
                      {activity.name}
                    </div>
                    {hasActual && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-[9px] text-ink-soft">
                          <span
                            className="w-2.5 h-1.5 rounded-sm shrink-0"
                            style={{
                              background: `repeating-linear-gradient(45deg, ${toneColor(activity, sc)}, ${toneColor(activity, sc)} 2px, transparent 2px, transparent 4px)`,
                              border: `1px solid ${toneColor(activity, sc)}`,
                            }}
                          />
                          مخطط
                        </span>
                        <span className="flex items-center gap-1 text-[9px] text-ink-soft">
                          <span className="w-2.5 h-1.5 rounded-sm shrink-0" style={{ background: actualColor }} />
                          فعلي
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={`flex-1 relative bg-bg rounded overflow-hidden ${hasActual ? "h-11" : "h-6"}`}>
                    {holidayMarkers.map((h, i) => (
                      <div
                        key={i}
                        title={`${h.name} · ${fmt(h.date)}`}
                        className="absolute top-0 bottom-0"
                        style={{ left: `${h.leftPct}%`, width: `${Math.max(100 / totalDays, 0.6)}%`, background: HOLIDAY_COLOR, opacity: 0.12 }}
                      />
                    ))}
                    {todayPct !== null && (
                      <div className="absolute top-0 bottom-0 w-px bg-primary z-10" style={{ left: `${todayPct}%` }} />
                    )}
                    {isGroup ? (
                      <div
                        title={`إجمالي فترة المهام الفرعية: ${fmt(sc.start)} → ${fmt(sc.end)}`}
                        className="absolute rounded-full bg-ink"
                        style={{
                          left: `${leftPct}%`,
                          width: `${Math.max(widthPct, 1.5)}%`,
                          top: "50%",
                          height: 5,
                          transform: "translateY(-50%)",
                        }}
                      />
                    ) : (
                      <div
                        title={`مخطط: ${fmt(sc.start)} → ${fmt(sc.end)}`}
                        className="absolute rounded"
                        style={{
                          left: `${leftPct}%`,
                          width: `${Math.max(widthPct, 1.5)}%`,
                          background: hasActual
                            ? `repeating-linear-gradient(45deg, ${toneColor(activity, sc)}, ${toneColor(activity, sc)} 4px, transparent 4px, transparent 8px)`
                            : toneColor(activity, sc),
                          border: hasActual ? `1px solid ${toneColor(activity, sc)}` : undefined,
                          boxSizing: "border-box",
                          top: 3,
                          height: hasActual ? 13 : "auto",
                          bottom: hasActual ? undefined : 3,
                        }}
                      />
                    )}
                    {hasActual && (
                      <div
                        title={`فعلي: ${fmt(activity.actualStartDate)} → ${activity.actualEndDate ? fmt(activity.actualEndDate) : "مستمر"}`}
                        className="absolute rounded shadow-sm"
                        style={{
                          left: `${actualLeftPct}%`,
                          width: `${Math.max(actualWidthPct, 1.5)}%`,
                          background: actualColor,
                          bottom: 3,
                          height: 13,
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3 mt-4 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: TONE_COLOR.onTime }} /> منتهٍ بالموعد
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: TONE_COLOR.doneLate }} /> منتهٍ متأخراً
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: TONE_COLOR.current }} /> جارٍ حالياً
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: TONE_COLOR.overdue }} /> متأخر عن الموعد
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: TONE_COLOR.upcoming }} /> قادم
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: HOLIDAY_COLOR }} /> عطلة/عيد
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-0.5 h-2.5 bg-primary" /> اليوم
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 rounded-full bg-ink" /> قسم (إجمالي مدة أبنائه)
        </span>
        <span className="flex items-center gap-1.5 border-r border-line/60 pr-3">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: TONE_COLOR.onTime }} /> المسار الفعلي — على الموعد
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: TONE_COLOR.overdue }} /> المسار الفعلي — متأخر
        </span>
      </div>
    </div>
  );
}

export function ProjectScheduleScreen({ project, defaultTab }: { project: Project; defaultTab: ScheduleTab }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ScheduleTab>(defaultTab);
  const activitiesQuery = useActivities(project.id);
  const customCalendarMap = useCustomCalendarMap(project.companyId);
  const activities = withComputedDone(activitiesQuery.data ?? []);
  const schedule = computeSchedule(activities, customCalendarMap);
  const childrenMap = buildChildrenMap(activities);

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-ink truncate">الجدول الزمني للمشروع — {project.name}</h1>
        <SecondaryButton onClick={() => navigate(`/projects/${project.id}`)} className="text-sm shrink-0">
          رجوع
        </SecondaryButton>
      </div>

      <div className="flex gap-2 mb-4">
        {(
          [
            { key: "create", label: "إنشاء الجدول الزمني" },
            { key: "preview", label: "معاينة الجدول الزمني" },
          ] as { key: ScheduleTab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "text-sm font-semibold px-3 py-1.5 rounded-lg cursor-pointer border",
              tab === t.key ? "border-primary bg-primary-bg text-ink" : "border-line/60 bg-panel text-ink-soft"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activitiesQuery.isLoading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}
      {activitiesQuery.isError && <p className="text-sm text-critical">تعذّر تحميل المراحل</p>}

      {!activitiesQuery.isLoading &&
        (tab === "create" ? (
          <CreateTab project={project} activities={activities} schedule={schedule} childrenMap={childrenMap} />
        ) : (
          <PreviewTab activities={activities} schedule={schedule} />
        ))}
    </div>
  );
}
