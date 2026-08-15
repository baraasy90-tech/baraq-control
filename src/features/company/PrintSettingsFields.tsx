import clsx from "clsx";
import { FieldLabel, TextInput } from "@/components/ui";
import type { PrintMode } from "@/types/domain";

const PRINT_MODE_OPTIONS: { id: PrintMode; label: string; desc: string }[] = [
  { id: "none", label: "بدون تنسيق خاص", desc: "طباعة عادية بدون رأس/تذييل أو قالب رسمي" },
  {
    id: "header_footer",
    label: "رأس وتذييل رسمي",
    desc: "إرفاق صورة رأس الصفحة وصورة تذييلها، مع بقاء محتوى التقرير بينهما",
  },
  {
    id: "full_page",
    label: "قالب صفحة كاملة",
    desc: "إرفاق صورة الورق الرسمي كاملة، وتحديد الهوامش ليتماشى النص معها",
  },
];

export interface PrintSettingsValue {
  mode: PrintMode;
  headerUrl: string | null;
  footerUrl: string | null;
  fullPageUrl: string | null;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export function PrintSettingsFields({
  value,
  onChange,
  onUploadHeader,
  onUploadFooter,
  onUploadFullPage,
}: {
  value: PrintSettingsValue;
  onChange: (patch: Partial<PrintSettingsValue>) => void;
  onUploadHeader: (file: File) => void;
  onUploadFooter: (file: File) => void;
  onUploadFullPage: (file: File) => void;
}) {
  const handleFile = (handler: (file: File) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handler(file);
  };

  return (
    <div>
      <FieldLabel>نمط الطباعة</FieldLabel>
      <div className="flex flex-col gap-2 mb-5">
        {PRINT_MODE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange({ mode: opt.id })}
            className={clsx(
              "text-right p-3 rounded-lg border cursor-pointer",
              value.mode === opt.id ? "border-primary bg-primary-bg" : "border-line bg-transparent"
            )}
          >
            <div className="text-sm font-semibold text-ink">{opt.label}</div>
            <div className="text-xs text-ink-soft mt-0.5">{opt.desc}</div>
          </button>
        ))}
      </div>

      {value.mode === "header_footer" && (
        <div className="flex flex-col gap-4 mb-5">
          <div>
            <FieldLabel>صورة رأس الصفحة (PNG أو JPG)</FieldLabel>
            {value.headerUrl && <img src={value.headerUrl} alt="رأس الصفحة" className="h-14 mb-2 object-contain border border-line rounded" />}
            <input type="file" accept="image/png,image/jpeg" onChange={handleFile(onUploadHeader)} className="text-sm" />
          </div>
          <div>
            <FieldLabel>صورة تذييل الصفحة (PNG أو JPG)</FieldLabel>
            {value.footerUrl && <img src={value.footerUrl} alt="تذييل الصفحة" className="h-14 mb-2 object-contain border border-line rounded" />}
            <input type="file" accept="image/png,image/jpeg" onChange={handleFile(onUploadFooter)} className="text-sm" />
          </div>
        </div>
      )}

      {value.mode === "full_page" && (
        <div className="mb-5">
          <FieldLabel>صورة الصفحة الرسمية كاملة (PNG أو JPG)</FieldLabel>
          {value.fullPageUrl && <img src={value.fullPageUrl} alt="القالب" className="h-24 mb-2 object-contain border border-line rounded" />}
          <input type="file" accept="image/png,image/jpeg" onChange={handleFile(onUploadFullPage)} className="text-sm" />
          <p className="text-xs text-warn bg-warn-bg rounded-lg px-3 py-2 mt-2">
            ملاحظة: طباعة الصور الخلفية تحتاج تفعيل خيار "الرسومات الخلفية / Background graphics" من نافذة الطباعة
            بالمتصفح، وإلا لن تظهر صورة القالب — فقط النص ضمن الهوامش المحددة.
          </p>
        </div>
      )}

      {value.mode !== "none" && (
        <div>
          <FieldLabel>الهوامش (مم) — لضبط محاذاة النص مع تصميم الورق الرسمي</FieldLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-xs text-ink-soft mb-1">أعلى</label>
              <TextInput
                type="number"
                value={value.marginTop}
                onChange={(e) => onChange({ marginTop: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-xs text-ink-soft mb-1">أسفل</label>
              <TextInput
                type="number"
                value={value.marginBottom}
                onChange={(e) => onChange({ marginBottom: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-xs text-ink-soft mb-1">يمين</label>
              <TextInput
                type="number"
                value={value.marginRight}
                onChange={(e) => onChange({ marginRight: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-xs text-ink-soft mb-1">يسار</label>
              <TextInput
                type="number"
                value={value.marginLeft}
                onChange={(e) => onChange({ marginLeft: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
