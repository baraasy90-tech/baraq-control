import { useState } from "react";
import clsx from "clsx";
import { FieldLabel, TextInput } from "@/components/ui";
import type { StorageType } from "@/types/domain";

declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<{ name: string }>;
  }
}

const STORAGE_OPTIONS: { id: StorageType; label: string; desc: string }[] = [
  { id: "cloud", label: "تخزين سحابي (افتراضي)", desc: "حفظ تلقائي، بدون إعداد إضافي، متاح من أي جهاز" },
  { id: "local", label: "مجلد محلي على الجهاز", desc: "نسخة إضافية على حاسوب مدير المشروع" },
  { id: "drive", label: "ربط مع Google Drive", desc: "أرشفة خارجية، يحتاج ربط حساب لاحقاً" },
];

export function ArchiveStorageFields({
  folderName,
  onFolderNameChange,
  storageType,
  onStorageTypeChange,
  localPath,
  onLocalPathChange,
}: {
  folderName: string;
  onFolderNameChange: (v: string) => void;
  storageType: StorageType;
  onStorageTypeChange: (v: StorageType) => void;
  localPath: string;
  onLocalPathChange: (v: string) => void;
}) {
  const [browseError, setBrowseError] = useState("");

  const handleBrowse = async () => {
    setBrowseError("");
    if (typeof window === "undefined" || !window.showDirectoryPicker) {
      setBrowseError("المتصفح الحالي لا يدعم اختيار المجلد مباشرة — اكتب المسار يدوياً");
      return;
    }
    try {
      const dirHandle = await window.showDirectoryPicker();
      onLocalPathChange(dirHandle.name);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setBrowseError("تعذّر فتح نافذة اختيار المجلد — اكتب المسار يدوياً");
    }
  };

  return (
    <>
      <FieldLabel>اسم المجلد الرئيسي (الجذر)</FieldLabel>
      <TextInput value={folderName} onChange={(e) => onFolderNameChange(e.target.value)} />
      <div className="mb-5" />

      <FieldLabel>طريقة الأرشفة</FieldLabel>
      <div className="flex flex-col gap-2 mb-5">
        {STORAGE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onStorageTypeChange(opt.id)}
            className={clsx(
              "text-right p-3 rounded-lg border cursor-pointer",
              storageType === opt.id ? "border-primary bg-primary-bg" : "border-line bg-transparent"
            )}
          >
            <div className="text-sm font-semibold text-ink">{opt.label}</div>
            <div className="text-xs text-ink-soft mt-0.5">{opt.desc}</div>
          </button>
        ))}
      </div>

      {storageType === "local" && (
        <div className="mb-5">
          <FieldLabel>مسار المجلد على الجهاز</FieldLabel>
          <div className="flex gap-2">
            <TextInput
              value={localPath}
              onChange={(e) => onLocalPathChange(e.target.value)}
              placeholder="مثال: D:\المشاريع\أبراج الياسمين"
              dir="ltr"
              className="text-right font-mono text-xs"
            />
            <button
              type="button"
              onClick={handleBrowse}
              title="تحديد المسار من الجهاز"
              className="w-11 shrink-0 border border-line bg-white rounded-lg text-base cursor-pointer"
            >
              📁
            </button>
          </div>
          {browseError && <p className="text-xs text-warn mt-1.5">{browseError}</p>}
        </div>
      )}

      {storageType === "drive" && (
        <div className="text-xs text-warn bg-warn-bg rounded-lg px-3 py-2.5 mb-5">
          ربط Google Drive الفعلي هيتم لاحقاً بعد نقل المشروع للبنية الدائمة — حالياً بيتحفظ كإعداد مبدئي فقط.
        </div>
      )}
    </>
  );
}

export function isArchiveConfigValid(folderName: string, storageType: StorageType, localPath: string): boolean {
  return folderName.trim().length > 0 && (storageType !== "local" || localPath.trim().length > 0);
}
