import { useState } from "react";
import { CodeListManager } from "@/features/projects/CodeListManager";
import { UnitListManager } from "@/features/projects/UnitListManager";
import { PrimaryButton, SecondaryButton, ErrorText } from "@/components/ui";
import type { ScopeConfig } from "@/types/domain";

export function ScopeSetupScreen({
  initial,
  onComplete,
  onBack,
  saving,
}: {
  initial: ScopeConfig | null;
  onComplete: (config: ScopeConfig) => void;
  onBack?: () => void;
  saving?: boolean;
}) {
  const [zones, setZones] = useState(initial?.zones ?? []);
  const [units, setUnits] = useState(initial?.units ?? []);
  const [facilities, setFacilities] = useState(initial?.facilities ?? []);
  const [error, setError] = useState("");

  const handleFinish = () => {
    setError("");
    onComplete({ zones, units, facilities });
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-ink-soft tracking-wide font-mono">
          {onBack ? "إعداد المشروع" : "إعداد أولي للمشروع"}
        </div>
        {onBack && <SecondaryButton onClick={onBack}>رجوع</SecondaryButton>}
      </div>
      <h1 className="text-xl font-bold text-ink mb-2">نطاقات المشروع</h1>
      <p className="text-sm text-ink-soft mb-6">
        إذا كان مشروعك يتكرر بوحدات أو مناطق متشابهة (زون/وحدة/منشأة)، عرّفها هنا لتوليد جداول ونماذج استلام مستقلة لكل
        واحدة لاحقاً. يمكنك تجاوز هذه الخطوة إذا كان مشروعك موحّداً بالكامل.
      </p>

      <div className="flex flex-col gap-4 mb-6">
        <CodeListManager
          title="الزونات (Zones)"
          placeholder="مثال: Z1"
          items={zones}
          onAdd={(code) => setZones((prev) => [...prev, { code }])}
          onRemove={(code) => {
            setZones((prev) => prev.filter((z) => z.code !== code));
            setUnits((prev) => prev.map((u) => (u.zoneCode === code ? { ...u, zoneCode: null } : u)));
          }}
        />
        <UnitListManager
          zones={zones}
          items={units}
          onAdd={(code, zoneCode) => setUnits((prev) => [...prev, { code, zoneCode }])}
          onRemove={(code) => setUnits((prev) => prev.filter((u) => u.code !== code))}
        />
        <CodeListManager
          title="المنشآت المستقلة (Facilities)"
          placeholder="مثال: نادي صحي"
          items={facilities}
          onAdd={(code) => setFacilities((prev) => [...prev, { code }])}
          onRemove={(code) => setFacilities((prev) => prev.filter((f) => f.code !== code))}
        />
      </div>

      <ErrorText>{error}</ErrorText>
      <PrimaryButton onClick={handleFinish} disabled={saving} className="w-auto px-6">
        {saving ? "جارٍ الحفظ..." : onBack ? "حفظ" : "متابعة"}
      </PrimaryButton>
    </div>
  );
}
