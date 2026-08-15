import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import {
  Card,
  SecondaryButton,
  PrimaryButton,
  IconButton,
  Modal,
  ErrorText,
  FieldLabel,
  TextInput,
} from "@/components/ui";
import { useCompany } from "@/features/company/useCompany";
import { useAuth } from "@/features/auth/AuthContext";
import { useProjects } from "@/features/projects/api/useProjects";
import { useCompanyMembers } from "@/features/company/api/useCompanyMembers";
import { useCompanyTasks, type TaskWithContext } from "@/features/tasks/api/useTasks";
import { useCreateTask } from "@/features/tasks/api/useCreateTask";
import { useUpdateTask } from "@/features/tasks/api/useUpdateTask";
import { useDeleteTask } from "@/features/tasks/api/useDeleteTask";
import { useCompanyScheduleTasks } from "@/features/tasks/api/useCompanyScheduleTasks";
import { useUpcomingHolidays } from "@/features/overview/api/useUpcomingHolidays";
import { fmt, todayISO, addDays, startOfWeek } from "@/utils/dates";
import type { TaskPriority, TaskStatus } from "@/types/domain";

const PRIORITY_LABEL: Record<TaskPriority, string> = { high: "عالي", medium: "متوسط", low: "منخفض" };
const PRIORITY_TONE: Record<TaskPriority, string> = {
  high: "text-critical bg-critical-bg",
  medium: "text-warn bg-warn-bg",
  low: "text-ink-soft bg-bg",
};
const STATUS_LABEL: Record<TaskStatus, string> = { todo: "لم تبدأ", in_progress: "قيد التنفيذ", done: "مكتملة" };

type Tab = "all" | "mine" | "created";

interface BucketItem {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  status: TaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  source: "task" | "activity";
}

function taskToBucketItem(t: TaskWithContext): BucketItem {
  return {
    id: t.id,
    title: t.title,
    projectId: t.projectId,
    projectName: t.projectName,
    status: t.status,
    dueDate: t.dueDate,
    completedAt: t.completedAt,
    createdAt: t.createdAt,
    source: "task",
  };
}

function TimeBucketCard({
  title,
  tasks,
  dateField,
  onOpen,
}: {
  title: string;
  tasks: BucketItem[];
  dateField: "due" | "completed";
  onOpen: (item: BucketItem) => void;
}) {
  return (
    <Card>
      <h3 className="text-sm font-bold text-ink mb-3">
        {title} <span className="text-ink-soft font-normal">({tasks.length})</span>
      </h3>
      {tasks.length === 0 ? (
        <p className="text-sm text-ink-soft">لا توجد مهام</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => onOpen(t)}
              className="flex items-center justify-between text-sm bg-bg rounded-lg px-3 py-2 gap-2 border-none cursor-pointer text-right hover:brightness-95"
            >
              <span className="text-ink truncate">
                {t.title} <span className="text-ink-soft text-xs">· {t.projectName}</span>
                {t.source === "activity" && (
                  <span className="text-[10px] bg-primary-bg text-primary rounded px-1.5 py-0.5 mr-1.5">جدول زمني</span>
                )}
              </span>
              <span className="text-xs text-ink-soft font-mono shrink-0">
                {fmt(dateField === "due" ? t.dueDate : (t.completedAt ?? t.dueDate))}
              </span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

interface TaskBuckets {
  thisWeek: BucketItem[];
  nextWeek: BucketItem[];
  nextMonth: BucketItem[];
  lastWeekDone: BucketItem[];
  previousDone: BucketItem[];
}

function groupTasksByTime(tasks: BucketItem[]): TaskBuckets {
  const today = todayISO();
  const thisWeekStart = startOfWeek(today);
  const thisWeekEnd = addDays(thisWeekStart, 6);
  const nextWeekStart = addDays(thisWeekStart, 7);
  const nextWeekEnd = addDays(thisWeekStart, 13);
  const nextMonthStart = addDays(thisWeekStart, 14);
  const nextMonthEnd = addDays(thisWeekStart, 44);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastWeekEnd = addDays(thisWeekStart, -1);

  const buckets: TaskBuckets = { thisWeek: [], nextWeek: [], nextMonth: [], lastWeekDone: [], previousDone: [] };

  for (const t of tasks) {
    if (t.status === "done") {
      const completedDate = (t.completedAt ?? t.dueDate ?? t.createdAt).slice(0, 10);
      if (completedDate >= lastWeekStart && completedDate <= lastWeekEnd) buckets.lastWeekDone.push(t);
      else if (completedDate < lastWeekStart) buckets.previousDone.push(t);
    } else if (t.dueDate) {
      if (t.dueDate >= thisWeekStart && t.dueDate <= thisWeekEnd) buckets.thisWeek.push(t);
      else if (t.dueDate >= nextWeekStart && t.dueDate <= nextWeekEnd) buckets.nextWeek.push(t);
      else if (t.dueDate >= nextMonthStart && t.dueDate <= nextMonthEnd) buckets.nextMonth.push(t);
    }
  }

  return buckets;
}

function TaskForm({
  companyId,
  onClose,
}: {
  companyId: string;
  onClose: () => void;
}) {
  const projectsQuery = useProjects(companyId);
  const membersQuery = useCompanyMembers(companyId);
  const createTask = useCreateTask();

  const projects = projectsQuery.data ?? [];
  const members = membersQuery.data ?? [];

  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [error, setError] = useState("");

  const effectiveProjectId = projectId || projects[0]?.id || "";
  const canSubmit = title.trim().length > 0 && !!effectiveProjectId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    try {
      await createTask.mutateAsync({
        companyId,
        projectId: effectiveProjectId,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        dueDate: dueDate || null,
        assignedTo: assignedTo || null,
      });
      onClose();
    } catch {
      setError("تعذّر إنشاء المهمة، حاول مجدداً");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <FieldLabel>عنوان المهمة</FieldLabel>
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: اعتماد عقد الاستشارات" autoFocus />
      </div>
      <div>
        <FieldLabel>المشروع</FieldLabel>
        <select
          value={effectiveProjectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>الأولوية</FieldLabel>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border"
          >
            <option value="high">عالي</option>
            <option value="medium">متوسط</option>
            <option value="low">منخفض</option>
          </select>
        </div>
        <div>
          <FieldLabel>تاريخ الاستحقاق</FieldLabel>
          <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>
      <div>
        <FieldLabel>إسناد إلى</FieldLabel>
        <select
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border"
        >
          <option value="">بدون تحديد</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel>ملاحظات (اختياري)</FieldLabel>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans box-border resize-none"
        />
      </div>

      <ErrorText>{error}</ErrorText>

      <div className="flex gap-2 pt-3 pb-1 sticky bottom-0 bg-panel border-t border-line/60 -mx-1 px-1 mt-2">
        <SecondaryButton type="button" onClick={onClose} className="flex-1">
          إلغاء
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={!canSubmit || createTask.isPending} className="flex-1">
          {createTask.isPending ? "جارٍ الحفظ..." : "إنشاء المهمة"}
        </PrimaryButton>
      </div>
    </form>
  );
}

function TaskRow({ task, companyId }: { task: TaskWithContext; companyId: string }) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask(companyId);

  return (
    <tr className="border-b border-line/60 last:border-0">
      <td className="py-2.5 pl-3 text-sm text-ink">{task.title}</td>
      <td className="py-2.5 pl-3 text-sm text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: task.projectThemeColor }} />
          {task.projectName}
        </span>
      </td>
      <td className="py-2.5 pl-3">
        <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${PRIORITY_TONE[task.priority]}`}>
          {PRIORITY_LABEL[task.priority]}
        </span>
      </td>
      <td className="py-2.5 pl-3">
        <select
          value={task.status}
          onChange={(e) => updateTask.mutate({ id: task.id, companyId, status: e.target.value as TaskStatus })}
          className="text-xs border border-line/60 rounded-lg px-2 py-1 bg-white text-ink"
        >
          {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2.5 pl-3 text-xs text-ink-soft font-mono">{task.dueDate ? fmt(task.dueDate) : "—"}</td>
      <td className="py-2.5 pl-3 text-sm text-ink-soft truncate max-w-[120px]">{task.assigneeName ?? "—"}</td>
      <td className="py-2.5">
        <IconButton icon={Trash2} label="حذف" tone="critical" onClick={() => deleteTask.mutate(task.id)} />
      </td>
    </tr>
  );
}

export function TasksScreen() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { user } = useAuth();
  const tasksQuery = useCompanyTasks(company.id);
  const scheduleTasksQuery = useCompanyScheduleTasks(company.id);
  const [tab, setTab] = useState<Tab>("all");
  const [formOpen, setFormOpen] = useState(false);

  const tasks = tasksQuery.data ?? [];
  const scheduleTasks = scheduleTasksQuery.data ?? [];
  const filtered = tasks.filter((t) => {
    if (tab === "mine") return t.assignedTo === user?.id;
    if (tab === "created") return t.createdBy === user?.id;
    return true;
  });
  const filteredScheduleTasks = scheduleTasks.filter((s) => {
    if (tab === "mine") return s.assignedTo === user?.id;
    if (tab === "created") return false;
    return true;
  });
  const bucketItems: BucketItem[] = [
    ...filtered.map(taskToBucketItem),
    ...filteredScheduleTasks.map(
      (s): BucketItem => ({
        id: s.id,
        title: s.title,
        projectId: s.projectId,
        projectName: s.projectName,
        status: s.status,
        dueDate: s.dueDate,
        completedAt: s.completedAt,
        createdAt: s.dueDate ?? todayISO(),
        source: "activity",
      })
    ),
  ];
  const buckets = groupTasksByTime(bucketItems);
  const openBucketItem = (item: BucketItem) => {
    navigate(item.source === "activity" ? `/projects/${item.projectId}/admin` : `/projects/${item.projectId}`);
  };
  const holidaysQuery = useUpcomingHolidays(company.id, company.countryCode);
  const holidays = holidaysQuery.data ?? [];

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-ink">المهام</h1>
        <div className="flex gap-2 shrink-0">
          <PrimaryButton onClick={() => setFormOpen(true)} className="w-auto px-4 py-2 text-sm inline-flex items-center gap-1.5">
            <Plus size={15} strokeWidth={2.5} /> مهمة جديدة
          </PrimaryButton>
          <SecondaryButton onClick={() => navigate("/")} className="text-sm">
            رجوع
          </SecondaryButton>
        </div>
      </div>

      {holidays.length > 0 && (
        <Card className="mb-4">
          <h3 className="text-sm font-bold text-ink mb-3">أعياد ومناسبات قادمة (خلال 60 يوماً)</h3>
          <div className="flex flex-col gap-2">
            {holidays.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-bg rounded-lg px-3 py-2">
                <span className="text-ink-soft">
                  {h.name}
                  {h.source === "islamic" && <span className="text-xs text-ink-soft mr-1">(هجري تقريبي)</span>}
                  {h.source === "custom" && <span className="text-xs text-primary mr-1">(مُضافة يدوياً)</span>}
                </span>
                <span className="font-bold text-ink">{fmt(h.date)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex gap-2 mb-4">
        {(
          [
            { key: "all", label: "الكل" },
            { key: "mine", label: "مهامي" },
            { key: "created", label: "أنشأتها" },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-sm font-semibold px-3 py-1.5 rounded-lg cursor-pointer border ${
              tab === t.key ? "border-primary bg-primary-bg text-ink" : "border-line/60 bg-panel text-ink-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tasksQuery.isLoading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}
      {tasksQuery.isError && <p className="text-sm text-critical">تعذّر تحميل المهام</p>}

      {tasksQuery.data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <TimeBucketCard title="مهام خلال الأسبوع الحالي" tasks={buckets.thisWeek} dateField="due" onOpen={openBucketItem} />
          <TimeBucketCard title="مهام الأسبوع القادم" tasks={buckets.nextWeek} dateField="due" onOpen={openBucketItem} />
          <TimeBucketCard title="مهام الشهر القادم" tasks={buckets.nextMonth} dateField="due" onOpen={openBucketItem} />
          <TimeBucketCard
            title="مهام الأسبوع الماضي المنجزة"
            tasks={buckets.lastWeekDone}
            dateField="completed"
            onOpen={openBucketItem}
          />
          <TimeBucketCard
            title="المهام المنجزة خلال المدة السابقة"
            tasks={buckets.previousDone}
            dateField="completed"
            onOpen={openBucketItem}
          />
        </div>
      )}

      {tasksQuery.data && filtered.length === 0 ? (
        <div className="bg-panel border border-dashed border-line rounded-xl p-10 text-center text-sm text-ink-soft">
          لا توجد مهام هنا بعد
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-soft text-right border-b border-line/60">
                <th className="pb-2 pl-3 font-semibold">المهمة</th>
                <th className="pb-2 pl-3 font-semibold">المشروع</th>
                <th className="pb-2 pl-3 font-semibold">الأولوية</th>
                <th className="pb-2 pl-3 font-semibold">الحالة</th>
                <th className="pb-2 pl-3 font-semibold">الاستحقاق</th>
                <th className="pb-2 pl-3 font-semibold">المسؤول</th>
                <th className="pb-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <TaskRow key={task.id} task={task} companyId={company.id} />
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {formOpen && (
        <Modal title="مهمة جديدة" onClose={() => setFormOpen(false)}>
          <TaskForm companyId={company.id} onClose={() => setFormOpen(false)} />
        </Modal>
      )}
    </div>
  );
}
