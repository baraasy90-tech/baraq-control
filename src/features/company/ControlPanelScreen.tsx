import { useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Palette, Printer, Users, Network, Archive as ArchiveIcon, CalendarDays, ShieldCheck } from "lucide-react";
import { AuditLogSection } from "@/features/company/AuditLogSection";
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
import { useRegenerateCompanyCode } from "@/features/company/useRegenerateCompanyCode";
import { fmt } from "@/utils/dates";
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

type SectionKey = "appearance" | "print" | "team" | "structure" | "archive" | "calendars" | "audit";

const SECTIONS: { key: SectionKey; label: string; icon: typeof Palette }[] = [
  { key: "appearance", label: "المظهر", icon: Palette },
  { key: "print", label: "إعدادات الطباعة", icon: Printer },
  { key: "team", label: "الدعوات والموظفين", icon: Users },
  { key: "structure", label: "الهيكلة", icon: Network },
  { key: "archive", label: "الأرشفة", icon: ArchiveIcon },
  { key: "calendars", label: "التقاويم والمناسبات", icon: CalendarDays },
  { key: "audit", label: "سجل التدقيق", icon: ShieldCheck },
];

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-panel border border-line/60 shadow-sm rounded-xl p-6 mb-4">
      <h2 className="text-sm font-bold text-ink mb-1">{title}</h2>
      {description && <p className="text-xs text-ink-soft mb-4">{description}</p>}
      {!description && <div className="mb-4" />}
      {children}
    </div>
  );
}

export function ControlPanelScreen({ company, onBack }: { company: Company; onBack: () => void }) {
  const navigate = useNavigate();
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
  const isDeptHead = members.some((m) => m.userId === profile?.id && m.role === "head");

  const [activeSection, setActiveSection] = useState<SectionKey>("appearance");
  const [name, setName] = useState(company.name);
  const [countryCode, setCountryCode] = useState(company.countryCode);
  const [vatRate, setVatRate] = useState((company.vatRate ?? 15).toString());
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState("");
  const [folderName, setFolderName] = useState(company.archiveFolderName);
  const [storageType, setStorageType] = useState<StorageType>(company.archiveStorageType);
  const [localPath, setLocalPath] = useState(company.archiveLocalPath ?? "");
  const [print, setPrint] = useState<PrintSettingsValue>(company.print);
  const [headerColor, setHeaderColor] = useState(company.headerColor);
  const regenerateCode = useRegenerateCompanyCode();
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
        vatRate: vatRate.trim() === "" || Number.isNaN(Number(vatRate)) ? company.vatRate : Number(vatRate),
      });
      setSaved(true);
    } catch {
      setSubmitError("حدث خطأ أثناء الحفظ، حاول مجدداً");
    }
  };

  const showSaveBar = activeSection === "appearance" || activeSection === "print" || activeSection === "archive";

  if (!canManage && isDeptHead) {
    return (
      <div className="min-h-screen p-4 sm:p-5 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-ink">لوحة التحكم</h1>
          <SecondaryButton onClick={onBack}>رجوع</SecondaryButton>
        </div>
        <div className="bg-panel border border-line/60 shadow-sm rounded-xl p-6 mb-4">
          <div className="flex items-center gap-3 mb-2">
            {company.logoUrl && <img src={company.logoUrl} alt={company.name} className="h-10 object-contain" />}
            <h2 className="text-base font-bold text-ink">{company.name}</h2>
          </div>
          <p className="text-xs text-ink-soft">
            بيانات الشركة (الاسم، الشعار، الأرشفة، الطباعة) يديرها مدير الحساب أو الإدارة التنفيذية فقط. كرئيس قسم، يمكنك
            إدارة دعوات وأعضاء قسمك.
          </p>
        </div>
        <TeamSection companyId={company.id} />
      </div>
    );
  }

  if (!canManage && !isDeptHead) {
    return (
      <div className="min-h-screen p-4 sm:p-5 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-ink">لوحة التحكم</h1>
          <SecondaryButton onClick={onBack}>رجوع</SecondaryButton>
        </div>
        <div className="bg-panel border border-line/60 shadow-sm rounded-xl p-6 text-center text-sm text-ink-soft">
          لوحة التحكم متاحة لمدير الحساب، الإدارة التنفيذية، ورؤساء الأقسام فقط.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-ink">لوحة التحكم</h1>
        <SecondaryButton onClick={onBack}>رجوع</SecondaryButton>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        <nav className="flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-visible sm:w-52 shrink-0 pb-1 sm:pb-0">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = activeSection === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={clsx(
                  "flex items-center gap-2 text-sm font-semibold px-3 py-2.5 rounded-lg cursor-pointer border whitespace-nowrap shrink-0 sm:shrink text-right",
                  isActive ? "border-primary bg-primary-bg text-ink" : "border-transparent bg-panel text-ink-soft hover:bg-bg"
                )}
              >
                <Icon size={16} strokeWidth={2.25} />
                {s.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 min-w-0">
          {activeSection === "appearance" && (
            <SectionCard title="المظهر" description="اسم الشركة، الشعار، ولون الرأس العلوي بلوحة المشاريع.">
              <FieldLabel>اسم الشركة</FieldLabel>
              <TextInput value={name} onChange={(e) => setName(e.target.value)} />
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
            </SectionCard>
          )}

          {activeSection === "print" && (
            <SectionCard title="إعدادات الطباعة" description="تنسيق التقارير المطبوعة — ترويسة/تذييل، ورقة رسمية كاملة، أو بدون تنسيق.">
              <PrintSettingsFields
                value={print}
                onChange={(patch) => setPrint((prev) => ({ ...prev, ...patch }))}
                onUploadHeader={(f) => uploadPrintAsset(f, "headerUrl")}
                onUploadFooter={(f) => uploadPrintAsset(f, "footerUrl")}
                onUploadFullPage={(f) => uploadPrintAsset(f, "fullPageUrl")}
              />
            </SectionCard>
          )}

          {activeSection === "team" && (
            <>
              <SectionCard title="رمز انضمام الموظفين" description='شاركه مع أي موظف ليُنشئ حسابه بنفسه ويُضاف مباشرة لشركتك (اختر "إنشاء حساب موظف" بشاشة الدخول). ينتهي تلقائياً بعد 30 يوماً لأسباب أمنية — جدّده عند الحاجة.'>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono text-sm font-bold text-ink bg-bg border border-line/60 rounded-lg px-3 py-2 tracking-widest">
                    {company.companyCode}
                  </span>
                  <SecondaryButton
                    type="button"
                    onClick={() => navigator.clipboard.writeText(company.companyCode).catch(() => {})}
                    className="text-xs px-3 py-2"
                  >
                    نسخ
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    onClick={() => regenerateCode.mutate(company.id)}
                    className="text-xs px-3 py-2"
                  >
                    {regenerateCode.isPending ? "جارٍ التجديد..." : "تجديد الرمز"}
                  </SecondaryButton>
                </div>
                <p className="text-xs text-ink-soft">
                  {company.companyCodeExpiresAt
                    ? `صالح حتى ${fmt(company.companyCodeExpiresAt)}`
                    : "لا يوجد تاريخ انتهاء مسجّل — جدّد الرمز الآن"}
                </p>
                <ErrorText>{regenerateCode.isError ? "تعذّر تجديد الرمز" : ""}</ErrorText>
              </SectionCard>
              <TeamSection companyId={company.id} />
            </>
          )}

          {activeSection === "structure" && (
            <SectionCard title="الهيكلة" description="محرر رسم حر لهيكلة الأقسام — يفتح بصفحة منفصلة.">
              <SecondaryButton onClick={() => navigate("/structure")} className="w-auto px-4">
                فتح محرر الهيكلة
              </SecondaryButton>
            </SectionCard>
          )}

          {activeSection === "archive" && (
            <SectionCard title="الأرشفة" description="مكان حفظ مستندات المشاريع المؤرشفة.">
              <ArchiveStorageFields
                folderName={folderName}
                onFolderNameChange={setFolderName}
                storageType={storageType}
                onStorageTypeChange={setStorageType}
                localPath={localPath}
                onLocalPathChange={setLocalPath}
              />
            </SectionCard>
          )}

          {activeSection === "calendars" && (
            <>
              <SectionCard title="الدولة" description="تُستخدم لعرض تنبيهات الأعياد الرسمية الصحيحة بقسم المهام والجدول الزمني.">
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
                <div className="mt-3">
                  <PrimaryButton
                    onClick={handleSave}
                    disabled={updateCompany.isPending || uploading || !isArchiveConfigValid(folderName, storageType, localPath)}
                    className="w-auto px-4 py-2 text-xs"
                  >
                    {updateCompany.isPending || uploading ? "جارٍ الحفظ..." : "حفظ الدولة"}
                  </PrimaryButton>
                  <ErrorText>{submitError}</ErrorText>
                  {saved && <p className="text-xs text-accent mt-1">تم الحفظ بنجاح</p>}
                </div>
              </SectionCard>

              <SectionCard
                title="ضريبة القيمة المضافة"
                description="النسبة المركزية المستخدمة عند إدخال قيمة عقد جديد — تتغيّر هذه النسبة بأي وقت حسب توجهات الدولة، دون أن تؤثر على العقود المحفوظة سابقاً."
              >
                <FieldLabel>النسبة (%)</FieldLabel>
                <TextInput type="number" step="0.01" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
                <div className="mt-3">
                  <PrimaryButton onClick={handleSave} disabled={updateCompany.isPending} className="w-auto px-4 py-2 text-xs">
                    {updateCompany.isPending ? "جارٍ الحفظ..." : "حفظ النسبة"}
                  </PrimaryButton>
                  <ErrorText>{submitError}</ErrorText>
                  {saved && <p className="text-xs text-accent mt-1">تم الحفظ بنجاح</p>}
                </div>
              </SectionCard>
              <CustomCalendarsSection companyId={company.id} />
              <CompanyHolidaysSection companyId={company.id} />
            </>
          )}

          {activeSection === "audit" && (
            <SectionCard title="سجل التدقيق">
              <AuditLogSection companyId={company.id} />
            </SectionCard>
          )}

          {showSaveBar && (
            <div className="sticky bottom-0 bg-bg/95 backdrop-blur-sm pt-2 pb-1 -mx-1 px-1">
              <ErrorText>{submitError}</ErrorText>
              {saved && <p className="text-sm text-accent mb-2">تم الحفظ بنجاح</p>}
              <PrimaryButton
                onClick={handleSave}
                disabled={updateCompany.isPending || uploading || !isArchiveConfigValid(folderName, storageType, localPath)}
                className="w-auto px-6"
              >
                {updateCompany.isPending || uploading ? "جارٍ الحفظ..." : "حفظ التغييرات"}
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
