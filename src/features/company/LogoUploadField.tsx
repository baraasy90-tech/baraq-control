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
  const preview = pendingFile ? URL.createObjectURL(pendingFile) : currentUrl;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onSelect(file);
  };

  return (
    <div>
      <label className="flex flex-col items-center justify-center gap-2 h-32 sm:h-36 rounded-xl border-2 border-dashed border-line bg-bg hover:bg-primary-bg hover:border-primary cursor-pointer transition-colors overflow-hidden">
        {preview ? (
          <img src={preview} alt="شعار الشركة" className="h-full w-full object-contain p-3" />
        ) : (
          <>
            <span className="text-3xl">🖼️</span>
            <span className="text-sm font-semibold text-ink-soft">اضغط لرفع شعار الشركة (PNG)</span>
          </>
        )}
        <input type="file" accept="image/png" onChange={handleChange} className="hidden" />
      </label>
      {error && <p className="text-sm text-critical mt-2">{error}</p>}
    </div>
  );
}
