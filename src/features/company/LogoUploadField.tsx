import { useEffect, useState } from 'react';

function PendingLogo({ file }: { file: File }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url ? <img src={url} alt="معاينة الشعار المختار" className="h-16 w-full object-contain" /> : null;
}

export function LogoUploadField({
  currentUrl,
  pendingFile,
  onSelect,
  error,
}: {
  currentUrl?: string | null;
  pendingFile?: File | null;
  onSelect: (file: File) => void;
  error?: string;
}) {
  const hasPreview = !!pendingFile || !!currentUrl;
  const preview = () => pendingFile ? <PendingLogo key={pendingFile.name + pendingFile.lastModified} file={pendingFile} /> : <img src={currentUrl!} alt="معاينة الشعار الحالي" className="h-16 w-full object-contain" />;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onSelect(file);
  };

  return (
    <div>
      <label className="flex items-center justify-center gap-2 min-h-20 p-4 rounded-xl border-2 border-dashed border-line bg-bg hover:bg-primary-bg hover:border-primary cursor-pointer transition-colors">
            <span className="text-3xl">🖼️</span>
            <span className="text-sm font-semibold text-ink-soft">{hasPreview ? 'تغيير شعار الشركة (PNG)' : 'اضغط لرفع شعار الشركة (PNG)'}</span>
        <input aria-label="رفع شعار الشركة بصيغة PNG" type="file" accept="image/png" onChange={handleChange} className="sr-only" />
      </label>
      <p className="text-xs text-ink-soft mt-2">يدعم PNG بخلفية شفافة؛ تُحفظ الشفافية كما هي دون إضافة خلفية أو قصّ الشعار. يجب أن تكون الشفافية موجودة في الملف الأصلي.</p>
      {hasPreview && <div className="grid grid-cols-2 gap-3 mt-3" aria-label="معاينة الشعار على خلفيات التصميم">
        <figure className="m-0"><div className="rounded-xl border border-line p-3" style={{ backgroundColor: '#fff' }}>{preview()}</div><figcaption className="text-xs text-ink-soft mt-1 text-center">خلفية فاتحة</figcaption></figure>
        <figure className="m-0"><div className="rounded-xl border border-line bg-navy p-3">{preview()}</div><figcaption className="text-xs text-ink-soft mt-1 text-center">خلفية كحلية</figcaption></figure>
      </div>}
      {error && <p className="text-sm text-critical mt-2">{error}</p>}
    </div>
  );
}
