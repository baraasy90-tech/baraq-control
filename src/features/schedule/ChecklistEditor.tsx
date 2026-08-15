import { TextInput, SecondaryButton } from "@/components/ui";
import type { ChecklistItemDraft } from "@/features/schedule/api/useSaveChecklist";

export function ChecklistEditor({
  items,
  onChange,
}: {
  items: ChecklistItemDraft[];
  onChange: (items: ChecklistItemDraft[]) => void;
}) {
  const addItem = () => {
    onChange([...items, { text: "", photoRequired: false, order: items.length + 1 }]);
  };

  const updateItem = (index: number, patch: Partial<ChecklistItemDraft>) => {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      {items.length === 0 && <p className="text-xs text-ink-soft mb-2">لا توجد بنود بعد</p>}
      <div className="flex flex-col gap-2 mb-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <TextInput
              value={item.text}
              onChange={(e) => updateItem(index, { text: e.target.value })}
              placeholder="نص البند"
              className="flex-1"
            />
            <label className="flex items-center gap-1.5 text-xs text-ink-soft shrink-0 pt-2.5 whitespace-nowrap">
              <input
                type="checkbox"
                checked={item.photoRequired}
                onChange={(e) => updateItem(index, { photoRequired: e.target.checked })}
              />
              صورة إلزامية
            </label>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-ink-soft hover:text-critical cursor-pointer bg-transparent border-none text-lg leading-none pt-1.5 shrink-0"
              aria-label="حذف البند"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <SecondaryButton type="button" onClick={addItem} className="text-xs py-1.5 px-3">
        + إضافة بند
      </SecondaryButton>
    </div>
  );
}
