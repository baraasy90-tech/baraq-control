import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui";
import { fmtMoney } from "@/utils/money";
import type { SCurvePoint } from "@/features/budget/lib/sCurve";

export function SCurveChart({ points }: { points: SCurvePoint[] }) {
  if (points.length === 0) {
    return (
      <Card>
        <p className="text-sm text-ink-soft py-8 text-center">لا توجد بيانات كافية لرسم المنحنى بعد</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-sm font-bold text-ink mb-4">منحنى الأداء التراكمي (مخطط مقابل فعلي)</h3>
      <div className="h-80" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E2DA" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtMoney(v)} width={80} />
            <Tooltip formatter={(v) => fmtMoney(Number(v))} contentStyle={{ fontFamily: "IBM Plex Sans Arabic" }} />
            <Legend wrapperStyle={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12 }} />
            <Line type="monotone" dataKey="plannedCumulative" name="مخطط" stroke="#2E6FE8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="actualCumulative" name="فعلي" stroke="#E86B2C" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
