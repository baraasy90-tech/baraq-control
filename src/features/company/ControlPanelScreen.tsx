import { useState } from "react";
import clsx from "clsx";
import { FieldLabel, TextInput, PrimaryButton, SecondaryButton, ErrorText } from "@/components/ui";
import { useUpdateCompany } from "@/features/company/useUpdateCompany";
import { ArchiveStorageFields, isArchiveConfigValid } from "@/features/company/ArchiveStorageFields";
import { PrintSettingsFields, type PrintSettingsValue } from "@/features/company/PrintSettingsFields";
import { LogoUploadField } from "@/features/company/LogoUploadField";
import { TeamSection } from "@/features/company/TeamSection";
import { CustomCalendarsSection } from "@/features/schedule/CustomCalendarsSection";
import { CompanyHolidaysSection } from "@/features/company/CompanyHolidaysSection";
import { uploadFile, uniqueFileName } from "@/lib/supabase/storage";
import { useAuth } from "@/features/auth/AuthContext";
import { useProfile } from "@/features/company/useProfile";
import { useDepartments } from "@/features/company/api/useDepartments";
import { useDepartmentMembers } from "@/features/company/api/useDepartmentMembers";
import type { Company, StorageType } from "@/types/domain";

const HEADER_COLOR_PRESETS = ["#171B26", "#E86B2C", "#2E6FE8", "#8A3FE8", "#2E9E52", "#D64545", "#0EA5A5", "#5B6472"];

const COUNTRY_OPTIONS: { code: string; label: string }[] = [
  { code: "SA", label: "السعودية" },
  { code: "AE", label: "الإمارات" },
  { code: "EG", label: "مصر" },
  { code: "JO", label: "الأردن" },
  { code: "KW", label: "الكويت" },
  { code: "QA", label: "قطر" },
  { code: "BH", label: "البحرين" },
  { code: "OM", label: "عمان" },
  { code: "IQ", label: "العراق" },
  { code: "MA", label: "المغرب" },
  { code: "TN", label: "تونس" },
  { code: "DZ", label: "الجزائر" },
  { code: "LB", label: "لبنان" },
  { code: "US", label: "الولايات المتحدة" },
  { code: "GB", label: "المملكة المتحدة" },
];

export function ControlPanelScreen({ company, onBack }: { company: Company; onBack: () => void }) {
  const { user } = useAuth();
  const profileQuery = useProfile();
  const profile = profileQuery.data?.profile;
  const departmentsQuery = useDepartments(company.id);
  const departments = departmentsQuery.data ?? [];
  const membersQuery = useDepartmentMembers(departments.map((d) => d.id));
  const members = membersQuery.data ?? [];

  const isOwner = company.createdBy === profile?.id;
  const isExecutive = members.some(
    (m) => m.userId === profile?.id && departments.find((d) => d.id === m.departmentId)?.type === "executive"
  );
  const canManage = isOwner || isExecutive;
  const [name, setName] = useState(company.name);
  const [countryCode, setCountryCode] = useState(company.countryCode);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState("");
  const [folderName, setFolderName] = useState(company.archiveFolderName);
  const [storageType, setStorageType] = useState<StorageType>(company.archiveStorageType);
  const [localPath, setLocalPath] = useState(company.archiveLocalPath ?? "");
  const [print, setPrint] = useState<PrintSettingsValue>(company.print);
  const [headerColor, setHeaderColor] = useState(company.headerColor);
  const [submitError, setSubmitError] = useState("");
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const updateCompany = useUpdateCompany();

  const handleLogoChange = (file: File) => {
    if (file.type !== "image/png") {
      setLogoError("لازم يكون الشعار بصيغة PNG تحديداً");
      return;
    }
    setLogoError("");
    setLogoFile(file);
  };

  const uploadPrintAsset = async (file: File, field: "headerUrl" | "footerUrl" | "fullPageUrl") => {
    if (!user) return;
    if (file.type !== "image/png" && file.type !== "image/jpeg") {
      setSubmitError("يجب أن تكون الصورة بصيغة PNG أو JPG");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFile("company-logos", `${user.id}/${uniqueFileName(file.name)}`, file);
      setPrint((prev) => ({ ...prev, [field]: url }));
    } catch {
      setSubmitError("تعذّر رفع الصورة، حاول مجدداً");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSubmitError("");
    setSaved(false);
    try {
      let logoUrl: string | undefined;
      if (logoFile) {
        logoUrl = await uploadFile("company-logos", `${user.id}/${uniqueFileName(logoFile.name)}`, logoFile);
      }
      await updateCompany.mutateAsync({
        id: company.id,
        name: name.trim(),
        countryCode,
        ...(logoUrl !== undefined && { logoUrl }),
        archiveFolderName: folderName.trim() || "أرشيف المشاريع",
        archiveStorageType: storageType,
        archiveLocalPath: storageType === "local" ? localPath.trim() : null,
        printMode: print.mode,
        printHeaderUrl: print.headerUrl,
        printFooterUrl: print.footerUrl,
        printFullPageUrl: print.fullPageUrl,
        printMarginTop: print.marginTop,
        printMarginBottom: print.marginBottom,
        printMarginLeft: print.marginLeft,
        printMarginRight: print.marginRight,
        headerColor,
      });
      setSaved(true);
    } catch {
      setSubmitError("حدث خطأ أثناء الحفظ، حاول مجدداً");
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-ink">لوحة التحكم</h1>
        <SecondaryButton onClick={onBack}>رجوع</SecondaryButton>
      </div>

      {canManage ? (
        <>
          <div className="bg-panel border border-line/60 shadow-sm rounded-xl p-6 mb-4">
            <h2 className="text-sm font-bold text-ink mb-4">بيانات الشركة</h2>

            <div className="bg-bg rounded-lg p-3 mb-4">
              <FieldLabel>رمز انضمام الموظفين</FieldLabel>
              <p className="text-xs text-ink-soft mb-2">
                شاركه مع أي موظف ليُنشئ حسابه بنفسه ويُضاف مباشرة لشركتك (اختر "إنشاء حساب موظف" بشاشة الدخول).
              </p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-ink bg-panel border border-line/60 rounded-lg px-3 py-2 tracking-widest">
                  {company.companyCode}
                </span>
                <SecondaryButton
                  type="button"
                  onClick={() => navigator.clipboard.writeText(company.companyCode).catch(() => {})}
                  className="text-xs px-3 py-2"
                >
                  نسخ
                </SecondaryButton>
              </div>
            </div>

            <FieldLabel>اسم الشركة</FieldLabel>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
            <div className="mb-4" />
            <FieldLabel>الدولة</FieldLabel>
            <p className="text-xs text-ink-soft mb-2">تُستخدم لعرض تنبيهات الأعياد الرسمية الصحيحة في نظرة عامة على الأقسام.</p>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink"
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="mb-4" />
            <FieldLabel>شعار الشركة</FieldLabel>
            <LogoUploadField currentUrl={company.logoUrl} pendingFile={logoFile} onSelect={handleLogoChange} error={logoError} />
            <div className="mb-4" />
            <FieldLabel>لون الرأس العلوي (لوحة المشاريع)</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {HEADER_COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setHeaderColor(c)}
                  className={clsx("w-8 h-8 rounded-full border-2 cursor-pointer", headerColor === c ? "border-ink" : "border-transparent")}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <TeamSection companyId={company.id} />

          <CustomCalendarsSection companyId={company.id} />

          <CompanyHolidaysSection companyId={company.id} />

          <div className="bg-panel border border-line/60 shadow-sm rounded-xl p-6 mb-4">
            <h2 className="text-sm font-bold text-ink mb-4">إعداد الأرشفة</h2>
            <ArchiveStorageFields
              folderName={folderName}
              onFolderNameChange={setFolderName}
              storageType={storageType}
              onStorageTypeChange={setStorageType}
              localPath={localPath}
              onLocalPathChange={setLocalPath}
            />
          </div>

          <div className="bg-panel border border-line/60 shadow-sm rounded-xl p-6 mb-4">
            <h2 className="text-sm font-bold text-ink mb-4">تنسيق الطباعة والتقارير</h2>
            <PrintSettingsFields
              value={print}
              onChange={(patch) => setPrint((prev) => ({ ...prev, ...patch }))}
              onUploadHeader={(f) => uploadPrintAsset(f, "headerUrl")}
              onUploadFooter={(f) => uploadPrintAsset(f, "footerUrl")}
              onUploadFullPage={(f) => uploadPrintAsset(f, "fullPageUrl")}
            />
          </div>

          <ErrorText>{submitError}</ErrorText>
          {saved && <p className="text-sm text-accent mb-2">تم الحفظ بنجاح</p>}
          <PrimaryButton
            onClick={handleSave}
            disabled={updateCompany.isPending || uploading || !isArchiveConfigValid(folderName, storageType, localPath)}
            className="w-auto px-6"
          >
            {updateCompany.isPending || uploading ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </PrimaryButton>
        </>
      ) : (
        <>
          <div className="bg-panel border border-line/60 shadow-sm rounded-xl p-6 mb-4">
            <div className="flex items-center gap-3 mb-2">
              {company.logoUrl && <img src={company.logoUrl} alt={company.name} className="h-10 object-contain" />}
              <h2 className="text-base font-bold text-ink">{company.name}</h2>
            </div>
            <p className="text-xs text-ink-soft">
              بيانات الشركة (الاسم، الشعار، الأرشفة، الطباعة) يديرها مدير الحساب أو الإدارة التنفيذية فقط.
            </p>
          </div>
          <TeamSection companyId={company.id} />
        </>
      )}
    </div>
  );
}
