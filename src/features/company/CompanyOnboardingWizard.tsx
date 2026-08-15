import { useState } from "react";
import { AuthCard, FieldLabel, TextInput, PrimaryButton, SecondaryButton, ErrorText } from "@/components/ui";
import { useCreateCompany } from "@/features/company/useCreateCompany";
import { ArchiveStorageFields, isArchiveConfigValid } from "@/features/company/ArchiveStorageFields";
import { LogoUploadField } from "@/features/company/LogoUploadField";
import { uploadFile, uniqueFileName } from "@/lib/supabase/storage";
import { useAuth } from "@/features/auth/AuthContext";
import type { StorageType } from "@/types/domain";

export function CompanyOnboardingWizard() {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState("");
  const [folderName, setFolderName] = useState("أرشيف المشاريع");
  const [storageType, setStorageType] = useState<StorageType>("cloud");
  const [localPath, setLocalPath] = useState("");
  const [submitError, setSubmitError] = useState("");

  const createCompany = useCreateCompany();

  const handleLogoChange = (file: File) => {
    if (file.type !== "image/png") {
      setLogoError("لازم يكون الشعار بصيغة PNG تحديداً");
      return;
    }
    setLogoError("");
    setLogoFile(file);
  };

  const canContinueStep1 = name.trim().length > 0 && !!logoFile;

  const handleFinish = async () => {
    if (!user) return;
    setSubmitError("");
    try {
      let logoUrl: string | null = null;
      if (logoFile) {
        logoUrl = await uploadFile("company-logos", `${user.id}/${uniqueFileName(logoFile.name)}`, logoFile);
      }
      await createCompany.mutateAsync({
        name: name.trim(),
        logoUrl,
        archiveFolderName: folderName.trim() || "أرشيف المشاريع",
        archiveStorageType: storageType,
        archiveLocalPath: storageType === "local" ? localPath.trim() : null,
      });
    } catch {
      setSubmitError("حدث خطأ أثناء الحفظ، حاول مجدداً");
    }
  };

  if (step === 1) {
    return (
      <AuthCard eyebrow="إعداد أولي — مرة واحدة فقط" title="بيانات الشركة">
        <p className="text-sm text-ink-soft mb-5 -mt-4">
          تظهر بالتقارير والمستندات الصادرة، وممكن تعدّلها لاحقاً بأي وقت من لوحة التحكم
        </p>
        <FieldLabel>اسم الشركة</FieldLabel>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الشركة" />
        <div className="mb-4" />
        <FieldLabel>شعار الشركة</FieldLabel>
        <LogoUploadField pendingFile={logoFile} onSelect={handleLogoChange} error={logoError} />
        <div className="mb-5" />
        <PrimaryButton disabled={!canContinueStep1} onClick={() => setStep(2)}>
          متابعة
        </PrimaryButton>
      </AuthCard>
    );
  }

  return (
    <AuthCard eyebrow="إعداد أولي — مرة واحدة فقط" title="إعداد الأرشفة">
      <p className="text-sm text-ink-soft mb-5 -mt-4">أين تريد حفظ نسخ من المستندات والتقارير الصادرة؟</p>
      <ArchiveStorageFields
        folderName={folderName}
        onFolderNameChange={setFolderName}
        storageType={storageType}
        onStorageTypeChange={setStorageType}
        localPath={localPath}
        onLocalPathChange={setLocalPath}
      />
      <ErrorText>{submitError}</ErrorText>
      <div className="flex gap-2">
        <SecondaryButton type="button" onClick={() => setStep(1)}>
          رجوع
        </SecondaryButton>
        <PrimaryButton
          className="flex-1"
          onClick={handleFinish}
          disabled={createCompany.isPending || !isArchiveConfigValid(folderName, storageType, localPath)}
        >
          {createCompany.isPending ? "جارٍ الحفظ..." : "إنهاء الإعداد"}
        </PrimaryButton>
      </div>
    </AuthCard>
  );
}
