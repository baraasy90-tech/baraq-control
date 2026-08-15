import type { ChecklistItem } from "@/types/domain";

export interface ChecklistRowState {
  checked: boolean;
  imagePreview: string | null;
}

export function ChecklistConfirmRow({
  item,
  state,
  onToggle,
  onImage,
  onRemoveImage,
}: {
  item: ChecklistItem;
  state: ChecklistRowState;
  onToggle: () => void;
  onImage: (file: File) => void;
  onRemoveImage: () => void;
}) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onImage(file);
  };

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-line last:border-0">
      <input type="checkbox" checked={state.checked} onChange={onToggle} className="mt-1 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-ink">
          {item.text} {item.photoRequired && <span className="text-critical text-xs">(صورة إلزامية)</span>}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          {state.imagePreview ? (
            <div className="relative">
              <img src={state.imagePreview} alt="" className="w-16 h-16 object-cover rounded-lg border border-line" />
              <button
                type="button"
                onClick={onRemoveImage}
                className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-critical text-white text-xs leading-none cursor-pointer border-none"
                aria-label="حذف الصورة"
              >
                ×
              </button>
            </div>
          ) : (
            <label className="text-xs text-primary cursor-pointer border border-dashed border-primary rounded-lg px-2.5 py-1.5">
              + إضافة صورة
              <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
