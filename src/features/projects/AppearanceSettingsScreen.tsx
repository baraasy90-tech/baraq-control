import { useState } from "react";
import clsx from "clsx";
import { SecondaryButton, PrimaryButton, ErrorText, FieldLabel } from "@/components/ui";
import { THEME_COLOR_PRESETS, THEME_ICON_PRESETS } from "@/features/projects/projectTheme";
import type { Project } from "@/types/domain";

export function AppearanceSettingsScreen({
  project,
  onSave,
  onBack,
  saving,
}: {
  project: Project;
  onSave: (patch: { themeColor: string; themeIcon: string }) => void;
  onBack: () => void;
  saving?: boolean;
}) {
  const [themeColor, setThemeColor] = useState(project.themeColor);
  const [themeIcon, setThemeIcon] = useState(project.themeIcon);
  const [error, setError] = useState("");

  const handleSave = () => {
    setError("");
    onSave({ themeColor, themeIcon });
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-ink">مظهر المشروع</h1>
        <SecondaryButton onClick={onBack}>رجوع</SecondaryButton>
      </div>

      <div className="bg-panel border border-line/60 shadow-sm rounded-xl p-6 mb-4">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl mb-5"
          style={{ background: `${themeColor}1a` }}
        >
          {themeIcon}
        </div>

        <FieldLabel>لون المشروع</FieldLabel>
        <div className="flex flex-wrap gap-2 mb-5">
          {THEME_COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setThemeColor(c)}
              className={clsx(
                "w-9 h-9 rounded-full border-2 cursor-pointer",
                themeColor === c ? "border-ink" : "border-transparent"
              )}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>

        <FieldLabel>أيقونة المشروع</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {THEME_ICON_PRESETS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => setThemeIcon(icon)}
              className={clsx(
                "w-10 h-10 rounded-lg border text-xl flex items-center justify-center cursor-pointer",
                themeIcon === icon ? "border-primary bg-primary-bg" : "border-line bg-transparent"
              )}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <ErrorText>{error}</ErrorText>
      <PrimaryButton onClick={handleSave} disabled={saving} className="w-auto px-6">
        {saving ? "جارٍ الحفظ..." : "حفظ"}
      </PrimaryButton>
    </div>
  );
}
