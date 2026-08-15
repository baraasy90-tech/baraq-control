import { useState } from "react";
import { TextInput, SecondaryButton } from "@/components/ui";
import type { ScopeCode, UnitScopeCode } from "@/types/domain";

const NO_ZONE = "__none__";

export function UnitListManager({
  zones,
  items,
  onAdd,
  onRemove,
}: {
  zones: ScopeCode[];
  items: UnitScopeCode[];
  onAdd: (code: string, zoneCode: string | null) => void;
  onRemove: (code: string) => void;
}) {
  const [value, setValue] = useState("");
  const [zoneCode, setZoneCode] = useState<string>(NO_ZONE);

  const handleAdd = () => {
    const code = value.trim();
    if (!code || items.some((i) => i.code === code)) return;
    onAdd(code, zoneCode === NO_ZONE ? null : zoneCode);
    setValue("");
  };

  const groups: { zoneCode: string | null; zoneName: string; units: UnitScopeCode[] }[] = [
    ...zones.map((z) => ({ zoneCode: z.code, zoneName: z.code, units: items.filter((u) => u.zoneCode === z.code) })),
    { zoneCode: null, zoneName: "بدون زون", units: items.filter((u) => !u.zoneCode || !zones.some((z) => z.code === u.zoneCode)) },
  ].filter((g) => g.units.length > 0);

  return (
    <div className="bg-panel border border-line/60 shadow-sm rounded-xl p-5">
      <h3 className="text-sm font-bold text-ink mb-3">الوحدات (Units)</h3>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <TextInput
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="مثال: A-101"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        {zones.length > 0 && (
          <select
            value={zoneCode}
            onChange={(e) => setZoneCode(e.target.value)}
            className="px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white shrink-0"
          >
            <option value={NO_ZONE}>بدون زون</option>
            {zones.map((z) => (
              <option key={z.code} value={z.code}>
                {z.code}
              </option>
            ))}
          </select>
        )}
        <SecondaryButton type="button" onClick={handleAdd} className="shrink-0">
          إضافة
        </SecondaryButton>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-ink-soft">لا توجد وحدات بعد</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <div key={g.zoneCode ?? "none"}>
              {zones.length > 0 && <div className="text-xs font-semibold text-ink-soft mb-1.5">{g.zoneName}</div>}
              <div className="flex flex-wrap gap-2">
                {g.units.map((unit) => (
                  <span
                    key={unit.code}
                    className="inline-flex items-center gap-1.5 bg-bg border border-line/60 rounded-full px-3 py-1 text-xs font-medium text-ink"
                  >
                    {unit.code}
                    <button
                      type="button"
                      onClick={() => onRemove(unit.code)}
                      className="text-ink-soft hover:text-critical cursor-pointer bg-transparent border-none text-sm leading-none"
                      aria-label={`حذف ${unit.code}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
