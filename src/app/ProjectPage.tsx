import { useNavigate, useParams } from "react-router-dom";
import { useProject } from "@/features/projects/api/useProject";
import { useUpdateProject } from "@/features/projects/api/useUpdateProject";
import { useCompany } from "@/features/company/useCompany";
import { useActivities } from "@/features/schedule/api/useActivities";
import { ScopeSetupScreen } from "@/features/projects/ScopeSetupScreen";
import { ProjectPath } from "@/features/schedule/ProjectPath";
import { AdvanceOrdersPanel } from "@/features/schedule/AdvanceOrdersPanel";
import { computeSchedule, getCurrentPreviousNext, getLatePhases, getCriticalUpcoming } from "@/features/schedule/lib/schedule";
import { useCustomCalendarMap } from "@/features/schedule/api/useCustomCalendars";
import { withComputedDone } from "@/features/schedule/lib/completion";
import { DonutChart } from "@/components/DonutChart";
import { Card, StatCard, SecondaryButton } from "@/components/ui";
import { fmt } from "@/utils/dates";
import type { ScopeConfig } from "@/types/domain";

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { company } = useCompany();
  const projectQuery = useProject(id);
  const activitiesQuery = useActivities(id);
  const updateProject = useUpdateProject();
  const customCalendars = useCustomCalendarMap(company.id);
  const navigate = useNavigate();

  if (projectQuery.isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-ink-soft">جارٍ التحميل...</div>;
  }
  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-sm text-ink-soft">
        <p>تعذّر العثور على المشروع</p>
        <SecondaryButton onClick={() => navigate("/")}>رجوع للمشاريع</SecondaryButton>
      </div>
    );
  }

  const project = projectQuery.data;

  if (!project.scopeConfig) {
    const handleComplete = (config: ScopeConfig) => {
      updateProject.mutate({ id: project.id, companyId: company.id, scopeConfig: config });
    };
    return <ScopeSetupScreen initial={null} onComplete={handleComplete} saving={updateProject.isPending} />;
  }

  const activities = withComputedDone(activitiesQuery.data ?? []);
  const schedule = computeSchedule(activities, customCalendars);
  const roots = activities.filter((a) => a.parentId === null);
  const { current, previous, next } = getCurrentPreviousNext(activities, schedule);
  const latePhases = getLatePhases(activities, schedule);
  const criticalUpcoming = getCriticalUpcoming(activities, schedule);

  const totalDuration = roots.reduce((s, a) => s + a.durationDays, 0);
  const doneDuration = roots.filter((a) => a.done).reduce((s, a) => s + a.durationDays, 0);
  const overallPercent = totalDuration > 0 ? (doneDuration / totalDuration) * 100 : 0;

  const navButtons: { label: string; onClick: () => void }[] = [
    { label: "الجدول الزمني للمشروع", onClick: () => navigate(`/projects/${project.id}/admin`) },
    { label: "الاستلام", onClick: () => navigate(`/projects/${project.id}/receiving`) },
    { label: "الميزانية", onClick: () => navigate(`/projects/${project.id}/budget`) },
    { label: "العقود", onClick: () => navigate(`/projects/${project.id}/contract`) },
    { label: "اعتماد المواد والمشتريات", onClick: () => navigate(`/projects/${project.id}/materials`) },
    { label: "المستندات", onClick: () => navigate(`/projects/${project.id}/documents`) },
    { label: "الفريق", onClick: () => navigate(`/projects/${project.id}/team`) },
    { label: "النطاقات", onClick: () => navigate(`/projects/${project.id}/scope`) },
    { label: "المظهر", onClick: () => navigate(`/projects/${project.id}/appearance`) },
  ];

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center text-xl shrink-0"
            style={{ background: `${project.themeColor}1a` }}
          >
            {project.themeIcon}
          </div>
          <h1 className="text-lg font-bold text-ink truncate">{project.name}</h1>
        </div>
        <SecondaryButton onClick={() => navigate("/")} className="text-sm shrink-0">
          رجوع للمشاريع
        </SecondaryButton>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {navButtons.map((btn) => (
          <SecondaryButton key={btn.label} onClick={btn.onClick} className="text-sm">
            {btn.label}
          </SecondaryButton>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card className="flex items-center gap-3">
          <DonutChart percent={overallPercent} size={52} color={project.themeColor} />
          <div>
            <div className="text-xs text-ink-soft font-semibold mb-0.5">نسبة الإنجاز</div>
            <div className="text-xs text-ink-soft">{roots.filter((a) => a.done).length} / {roots.length} مرحلة</div>
          </div>
        </Card>
        <StatCard label="المرحلة الحالية" value={current?.name} sub={current ? `حتى ${fmt(schedule[current.id]?.end)}` : undefined} />
        <StatCard
          label="مراحل متأخرة"
          value={latePhases.length}
          tone={latePhases.length > 0 ? "critical" : undefined}
          sub={latePhases.length > 0 ? latePhases.map((p) => p.name).slice(0, 2).join("، ") : "لا يوجد تأخير"}
        />
        <StatCard
          label="طلبيات تحتاج توريداً قريباً"
          value={criticalUpcoming.length}
          tone={criticalUpcoming.length > 0 ? "warn" : undefined}
          sub={criticalUpcoming.length > 0 ? criticalUpcoming.map((p) => p.name).slice(0, 2).join("، ") : "لا يوجد"}
        />
      </div>

      <AdvanceOrdersPanel items={criticalUpcoming} />

      <Card title="خط سير المشروع" className="mb-6">
        <ProjectPath activities={activities} schedule={schedule} />
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="المرحلة السابقة المنجزة" value={previous?.name} sub={previous ? `انتهت ${fmt(schedule[previous.id]?.end)}` : undefined} />
        <StatCard label="المرحلة الحالية" value={current?.name} sub={current ? `${fmt(schedule[current.id]?.start)} → ${fmt(schedule[current.id]?.end)}` : undefined} />
        <StatCard label="المرحلة القادمة" value={next?.name} sub={next ? `تبدأ ${fmt(schedule[next.id]?.start)}` : undefined} />
      </div>
    </div>
  );
}
