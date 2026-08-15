import { Card } from "@/components/ui";

export interface AdvanceOrderItem {
  id: string;
  name: string;
  daysToStart: number;
  leadDays: number;
}

function toneFor(item: AdvanceOrderItem): { label: string; classes: string } {
  if (item.daysToStart <= 0) return { label: "متأخر عن موعد الطلب", classes: "bg-order-urgent-bg text-order-urgent border-order-urgent/30" };
  const ratio = item.daysToStart / Math.max(item.leadDays, 1);
  if (ratio <= 1 / 3) return { label: `باقي ${item.daysToStart} يوم`, classes: "bg-order-urgent-bg text-order-urgent border-order-urgent/30" };
  if (ratio <= 2 / 3) return { label: `باقي ${item.daysToStart} يوم`, classes: "bg-order-soon-bg text-order-soon border-order-soon/30" };
  return { label: `باقي ${item.daysToStart} يوم`, classes: "bg-order-upcoming-bg text-order-upcoming border-order-upcoming/30" };
}

/** طلبيات/بنود حرجة بحاجة لطلب مسبق (توريد خلاطات، بلاط، حجر...) — مبنية على علامة "بند حرج" ومهلة التنبيه لكل بند. */
export function AdvanceOrdersPanel({ items }: { items: AdvanceOrderItem[] }) {
  if (items.length === 0) return null;

  return (
    <Card title="طلبيات بحاجة لطلب مسبق" className="mb-6">
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const tone = toneFor(item);
          return (
            <div key={item.id} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${tone.classes}`}>
              <span className="text-sm font-semibold truncate">{item.name}</span>
              <span className="text-xs font-mono shrink-0">{tone.label}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
