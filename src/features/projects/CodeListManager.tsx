import { useState } from "react";
import { TextInput, SecondaryButton } from "@/components/ui";
import type { ScopeCode } from "@/types/domain";

export function CodeListManager({
  title,
  placeholder,
  items,
  onAdd,
  onRemove,
}: {
  title: string;
  placeholder: string;
  items: ScopeCode[];
  onAdd: (code: string) => void;
  onRemove: (code: string) => void;
}) {
  const [value, setValue] = useState("");

  const handleAdd = () => {
    const code = value.trim();
    if (!code || items.some((i) => i.code === code)) return;
    onAdd(code);
    setValue("");
  };

  return (
    <div className="bg-panel border border-line/60 shadow-sm rounded-xl p-5">
      <h3 className="text-sm font-bold text-ink mb-3">{title}</h3>
      <div className="flex gap-2 mb-3">
        <TextInput
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <SecondaryButton type="button" onClick={handleAdd} className="shrink-0">
          إضافة
        </SecondaryButton>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-ink-soft">لا توجد عناصر بعد</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item.code}
              className="inline-flex items-center gap-1.5 bg-bg border border-line/60 rounded-full px-3 py-1 text-xs font-medium text-ink"
            >
              {item.code}
              <button
                type="button"
                onClick={() => onRemove(item.code)}
                className="text-ink-soft hover:text-critical cursor-pointer bg-transparent border-none text-sm leading-none"
                aria-label={`حذف ${item.code}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
