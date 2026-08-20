import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui";
import { fmtMoney } from "@/utils/money";
import type { SCurvePoint } from "@/features/budget/lib/sCurve";

export function SCurveChart({
  points,
  title = "منحنى الأداء التراكمي (مخطط مقابل فعلي)",
  height = 320,
  bare = false,
}: {
  points: SCurvePoint[];
  title?: string;
  height?: number;
  bare?: boolean;
}) {
  if (points.length === 0) {
    const empty = <p className="text-sm text-ink-soft py-8 text-center">لا توجد بيانات كافية لرسم المنحنى بعد</p>;
    return bare ? empty : <Card>{empty}</Card>;
  }

  const chart = (
    <>
      <h3 className="text-sm font-bold text-ink mb-4">{title}</h3>
      <div style={{ height }} dir="ltr">
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
    </>
  );

  return bare ? chart : <Card>{chart}</Card>;
}
