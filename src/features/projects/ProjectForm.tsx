import { useState } from "react";
import clsx from "clsx";
import { FieldLabel, TextInput, PrimaryButton, SecondaryButton, ErrorText } from "@/components/ui";
import { SignaturePad } from "@/features/projects/SignaturePad";
import { THEME_COLOR_PRESETS, THEME_ICON_PRESETS, PROJECT_TYPES } from "@/features/projects/projectTheme";
import { uploadFile, uniqueFileName, dataUrlToBlob } from "@/lib/supabase/storage";
import { useAuth } from "@/features/auth/AuthContext";
import type { Project } from "@/types/domain";

export interface ProjectFormValues {
  name: string;
  managerName: string;
  location: string;
  mapLink: string;
  area: string;
  unitsCount: string;
  projectType: string;
  managerSignatureUrl: string | null;
  themeColor: string;
  themeIcon: string;
}

export function ProjectForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: Project | null;
  onSave: (values: ProjectFormValues) => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(initial?.name ?? "");
  const [managerName, setManagerName] = useState(initial?.managerName ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [mapLink, setMapLink] = useState(initial?.mapLink ?? "");
  const [area, setArea] = useState(initial?.area ?? "");
  const [unitsCount, setUnitsCount] = useState(initial?.unitsCount ?? "");
  const [projectType, setProjectType] = useState(initial?.projectType ?? PROJECT_TYPES[0]);
  const [themeColor, setThemeColor] = useState(initial?.themeColor ?? THEME_COLOR_PRESETS[0]);
  const [themeIcon, setThemeIcon] = useState(initial?.themeIcon ?? THEME_ICON_PRESETS[0]);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureChanged, setSignatureChanged] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = name.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user) return;
    setError("");
    try {
      let managerSignatureUrl = initial?.managerSignatureUrl ?? null;
      if (signatureChanged) {
        if (signatureDataUrl) {
          setUploading(true);
          const blob = await dataUrlToBlob(signatureDataUrl);
          managerSignatureUrl = await uploadFile("signatures", `${user.id}/${uniqueFileName("signature.png")}`, blob);
        } else {
          managerSignatureUrl = null;
        }
      }
      onSave({
        name: name.trim(),
        managerName: managerName.trim(),
        location: location.trim(),
        mapLink: mapLink.trim(),
        area: area.trim(),
        unitsCount: unitsCount.trim(),
        projectType,
        managerSignatureUrl,
        themeColor,
        themeIcon,
      });
    } catch {
      setError("تعذّر رفع التوقيع، حاول مجدداً");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <FieldLabel>اسم المشروع</FieldLabel>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: مشروع أبراج الياسمين" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>اسم مدير المشروع</FieldLabel>
          <TextInput value={managerName} onChange={(e) => setManagerName(e.target.value)} />
        </div>
        <div>
          <FieldLabel>نوع المشروع</FieldLabel>
          <select
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans box-border bg-white"
          >
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>الموقع</FieldLabel>
          <TextInput value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <FieldLabel>رابط الخريطة</FieldLabel>
          <TextInput value={mapLink} onChange={(e) => setMapLink(e.target.value)} placeholder="https://maps.google.com/..." />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>المساحة (م²)</FieldLabel>
          <TextInput value={area} onChange={(e) => setArea(e.target.value)} inputMode="numeric" />
        </div>
        <div>
          <FieldLabel>عدد الوحدات</FieldLabel>
          <TextInput value={unitsCount} onChange={(e) => setUnitsCount(e.target.value)} inputMode="numeric" />
        </div>
      </div>

      <div>
        <FieldLabel>لون المشروع</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {THEME_COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setThemeColor(c)}
              className={clsx(
                "w-8 h-8 rounded-full border-2 cursor-pointer",
                themeColor === c ? "border-ink" : "border-transparent"
              )}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>أيقونة المشروع</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {THEME_ICON_PRESETS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => setThemeIcon(icon)}
              className={clsx(
                "w-9 h-9 rounded-lg border text-lg flex items-center justify-center cursor-pointer",
                themeIcon === icon ? "border-primary bg-primary-bg" : "border-line bg-transparent"
              )}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>توقيع مدير المشروع (اختياري)</FieldLabel>
        <SignaturePad
          value={initial?.managerSignatureUrl ?? null}
          onChange={(dataUrl) => {
            setSignatureDataUrl(dataUrl);
            setSignatureChanged(true);
          }}
        />
      </div>

      <ErrorText>{error}</ErrorText>
      {!canSubmit && <p className="text-xs text-warn">اكتب اسم المشروع لتفعيل زر الحفظ</p>}

      <div className="flex gap-2 pt-3 pb-1 sticky bottom-0 bg-panel border-t border-line/60 -mx-1 px-1 mt-2">
        <SecondaryButton type="button" onClick={onCancel} className="flex-1">
          إلغاء
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={!canSubmit || uploading || saving} className="flex-1">
          {uploading || saving ? "جارٍ الحفظ..." : "حفظ"}
        </PrimaryButton>
      </div>
    </form>
  );
}
