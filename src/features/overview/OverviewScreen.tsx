import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, StatCard, SecondaryButton } from "@/components/ui";
import { useCompany } from "@/features/company/useCompany";
import { useCompanyOverview } from "@/features/overview/api/useCompanyOverview";
import { fmt } from "@/utils/dates";
import { fmtMoney } from "@/utils/money";

const PROJECT_STATUS_COLORS: Record<string, string> = { preparing: "#DFA22E", active: "#2E6FE8", completed: "#2E9E52" };
const PROJECT_STATUS_LABEL: Record<string, string> = { preparing: "تحت التجهيز", active: "قائم", completed: "منتهٍ" };

const TASK_STATUS_COLORS: Record<string, string> = { todo: "#94A3B8", in_progress: "#2E6FE8", done: "#2E9E52" };
const TASK_STATUS_LABEL: Record<string, string> = { todo: "لم تبدأ", in_progress: "قيد التنفيذ", done: "مكتملة" };

function DonutCard({
  title,
  data,
  colors,
  labels,
  total,
}: {
  title: string;
  data: Record<string, number>;
  colors: Record<string, string>;
  labels: Record<string, string>;
  total: number;
}) {
  const chartData = Object.entries(data)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({ key, value, label: labels[key], color: colors[key] }));

  return (
    <Card>
      <h3 className="text-sm font-bold text-ink mb-3">{title}</h3>
      {total === 0 ? (
        <p className="text-sm text-ink-soft py-8 text-center">لا توجد بيانات بعد</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="w-32 h-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="label" innerRadius={35} outerRadius={55} paddingAngle={2}>
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            {chartData.map((entry) => (
              <div key={entry.key} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-ink-soft">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
                  {entry.label}
                </span>
                <span className="font-bold text-ink">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export function OverviewScreen() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const overviewQuery = useCompanyOverview(company.id);
  const data = overviewQuery.data;

  const totalProjects = data?.projects.length ?? 0;
  const totalTasks = data ? Object.values(data.taskStatusCounts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-ink">نظرة عامة على الأقسام</h1>
        <SecondaryButton onClick={() => navigate("/")} className="text-sm">
          رجوع
        </SecondaryButton>
      </div>

      {overviewQuery.isLoading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}
      {overviewQuery.isError && <p className="text-sm text-critical">تعذّر تحميل البيانات</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard label="إجمالي المشاريع" value={totalProjects} />
            <StatCard
              label="مراحل متأخرة"
              value={data.latePhases.length}
              tone={data.latePhases.length > 0 ? "critical" : undefined}
            />
            <StatCard
              label="طلبيات تحتاج توريداً قريباً"
              value={data.upcomingCritical.length}
              tone={data.upcomingCritical.length > 0 ? "warn" : undefined}
            />
            <StatCard
              label="مهام متأخرة"
              value={data.overdueTaskCount}
              tone={data.overdueTaskCount > 0 ? "critical" : undefined}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard label="إجمالي المخطط (كل المشاريع)" value={fmtMoney(data.budget.planned)} />
            <StatCard label="إجمالي الفعلي (كل المشاريع)" value={fmtMoney(data.budget.actual)} />
            <StatCard
              label="الفرق"
              value={fmtMoney(data.budget.variance)}
              tone={data.budget.variance < 0 ? "critical" : undefined}
            />
            <StatCard
              label="بنود بانتظار الاستلام"
              value={data.pendingReceivingCount}
              tone={data.pendingReceivingCount > 0 ? "warn" : undefined}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <DonutCard
              title="حالة المشاريع"
              data={data.projectStatusCounts}
              colors={PROJECT_STATUS_COLORS}
              labels={PROJECT_STATUS_LABEL}
              total={totalProjects}
            />
            <DonutCard
              title="حالة المهام"
              data={data.taskStatusCounts}
              colors={TASK_STATUS_COLORS}
              labels={TASK_STATUS_LABEL}
              total={totalTasks}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <h3 className="text-sm font-bold text-ink mb-3">مراحل متأخرة عن موعدها</h3>
              {data.latePhases.length === 0 ? (
                <p className="text-sm text-ink-soft">لا توجد مراحل متأخرة، كل شيء على المسار 👍</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.latePhases.slice(0, 8).map((lp, i) => (
                    <button
                      key={i}
                      onClick={() => navigate(`/projects/${lp.projectId}/admin`)}
                      className="text-right bg-critical-bg rounded-lg px-3 py-2 cursor-pointer border-none"
                    >
                      <div className="text-sm font-semibold text-ink">{lp.activityName}</div>
                      <div className="text-xs text-ink-soft">
                        {lp.projectName} · كان يفترض ينتهي {fmt(lp.end)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h3 className="text-sm font-bold text-ink mb-3">بنود تحتاج طلباً وتوريداً قريباً</h3>
              {data.upcomingCritical.length === 0 ? (
                <p className="text-sm text-ink-soft">لا توجد بنود بحاجة لطلب مسبق قريباً</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.upcomingCritical.slice(0, 8).map((uc, i) => (
                    <button
                      key={i}
                      onClick={() => navigate(`/projects/${uc.projectId}/admin`)}
                      className="text-right bg-warn-bg rounded-lg px-3 py-2 cursor-pointer border-none"
                    >
                      <div className="text-sm font-semibold text-ink">{uc.activityName}</div>
                      <div className="text-xs text-ink-soft">
                        {uc.projectName} · يبدأ خلال {uc.daysToStart} يوم
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
