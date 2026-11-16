import {ProjectWorkspaceHeader} from '@/features/projects/ProjectWorkspaceHeader';
import { useNavigate, useParams } from "react-router-dom";
import { ProjectQueryState } from "@/components/ProjectQueryState";
import { QueryFailureScreen } from "@/components/QueryFailureScreen";
import type { ComponentType } from "react";
import {
  CalendarClock,
  PackageCheck,
  Wallet,
  FileText,
  Package,
  Folder,
  Users,
  Layers,
  Palette,
} from "lucide-react";
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
import { Card, StatCard, SecondaryButton } from "@/components/ui";
import { fmt } from "@/utils/dates";
import type { ScopeConfig } from "@/types/domain";

const sectionDescriptions:Record<string,string>={"الجدول الزمني للمشروع":"المراحل والمواعيد وترابط أعمال التنفيذ","الاستلام":"فحص الأعمال وتوثيق الصور والقرارات","المستندات":"ملفات المشروع ومجلداته والبحث عنها","الميزانية":"المخطط والمصروف ومتابعة الفروقات","العقود":"العقود والدفعات ومستندات الاعتماد","اعتماد المواد والمشتريات":"طلبات المواد ومسار الموافقة والتوريد","الفريق":"أعضاء المشروع وأدوارهم وصلاحياتهم"};

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { company } = useCompany();
  const projectQuery = useProject(id);
  const activitiesQuery = useActivities(id);
  const updateProject = useUpdateProject();
  const customCalendars = useCustomCalendarMap(company.id);
  const navigate = useNavigate();

  if (projectQuery.isError || projectQuery.isPending || !projectQuery.data) return <ProjectQueryState query={projectQuery} />;
  if (activitiesQuery.isError) return <QueryFailureScreen title="بيانات المشروع" retry={() => activitiesQuery.refetch()} />;

  const project = projectQuery.data;

  if (!project.scopeConfig) {
    const handleComplete = async (config: ScopeConfig) => {
      await updateProject.mutateAsync({ id: project.id, companyId: company.id, scopeConfig: config });
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

  const navTiles: { label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }>; onClick: () => void }[] = [
    { label: "الجدول الزمني للمشروع", icon: CalendarClock, onClick: () => navigate(`/projects/${project.id}/admin`) },
    { label: "الاستلام", icon: PackageCheck, onClick: () => navigate(`/projects/${project.id}/receiving`) },
    { label: "الميزانية", icon: Wallet, onClick: () => navigate(`/projects/${project.id}/budget`) },
    { label: "العقود", icon: FileText, onClick: () => navigate(`/projects/${project.id}/contract`) },
    ...(company.isIndividual
      ? []
      : [{ label: "اعتماد المواد والمشتريات", icon: Package, onClick: () => navigate(`/projects/${project.id}/materials`) }]),
    { label: "المستندات", icon: Folder, onClick: () => navigate(`/projects/${project.id}/documents`) },
    ...(company.isIndividual
      ? []
      : [{ label: "الفريق", icon: Users, onClick: () => navigate(`/projects/${project.id}/team`) }]),
    { label: "النطاقات", icon: Layers, onClick: () => navigate(`/projects/${project.id}/scope`) },
    { label: "المظهر", icon: Palette, onClick: () => navigate(`/projects/${project.id}/appearance`) },
  ];

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto">
      <ProjectWorkspaceHeader project={project} percent={roots.length?overallPercent:null} completed={roots.filter(a=>a.done).length} total={roots.length} loading={activitiesQuery.isPending} onSchedule={()=>navigate('/projects/'+project.id+'/admin')} onBudget={()=>navigate('/projects/'+project.id+'/budget')} onBack={()=>navigate('/')}/>
      {[
        {title:'متابعة التنفيذ',description:'أعمال الموقع، الاستلامات، وملفات المشروع في متناولك.',labels:['الجدول الزمني للمشروع','الاستلام','المستندات']},
        {title:'الماليات والفريق',description:'تابع الالتزامات المالية ونسّق القرارات مع فريقك.',labels:['العقود','الميزانية','اعتماد المواد والمشتريات','الفريق']},
      ].map(group=><section key={group.title} aria-label={group.title} className="mb-6"><div className="mb-3"><h2 className="text-base font-bold text-ink">{group.title}</h2><p className="text-xs text-ink-soft mt-1">{group.description}</p></div><div className={"grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 "+(navTiles.filter(tile=>group.labels.includes(tile.label)).length===4?"lg:grid-cols-4":navTiles.filter(tile=>group.labels.includes(tile.label)).length===2?"lg:grid-cols-2":"lg:grid-cols-3")}>{navTiles.filter(tile=>group.labels.includes(tile.label)).map(tile=>{const Icon=tile.icon;return <button type="button" key={tile.label} aria-label={tile.label} onClick={tile.onClick} className="group flex items-start gap-3 text-right bg-panel border border-line/70 rounded-2xl p-4 sm:p-5 hover:border-primary/50 hover:shadow-sm transition focus-visible:outline-2 focus-visible:outline-primary cursor-pointer min-w-0"><span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{background:project.themeColor+'12',color:project.themeColor}}><Icon size={21} strokeWidth={1.8}/></span><span className="min-w-0"><span className="block text-sm font-bold text-ink mb-1">{tile.label}</span><span className="block text-xs text-ink-soft leading-relaxed">{sectionDescriptions[tile.label]}</span></span></button>;})}</div></section>)}
      <div className="flex flex-wrap items-center gap-2 mb-6"><span className="text-xs text-ink-soft ml-1">إعدادات المشروع</span>{navTiles.filter(tile=>['النطاقات','المظهر'].includes(tile.label)).map(tile=>{const Icon=tile.icon;return <SecondaryButton key={tile.label} onClick={tile.onClick} className="text-xs inline-flex gap-2 items-center"><Icon size={14}/>{tile.label}</SecondaryButton>;})}</div>
      {activitiesQuery.isPending?<p role="status" className="text-sm text-ink-soft p-4">جارٍ تحميل خط سير المشروع...</p>:roots.length===0?<Card title="جهّز مشروعك للمتابعة"><p className="text-sm text-ink-soft mb-3">ابدأ بإضافة مراحل المشروع ومواعيدها؛ ستظهر مؤشرات المتابعة بعد حفظ الجدول.</p><SecondaryButton onClick={()=>navigate('/projects/'+project.id+'/admin')}>إضافة أول مرحلة</SecondaryButton></Card>:<>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="المراحل المكتملة" value={roots.filter(a=>a.done).length} sub={"من أصل "+roots.length+" مرحلة رئيسية"}/>
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
      </>}
    </div>
  );
}
