import { useState } from "react";
import { Modal, PrimaryButton, SecondaryButton, ErrorText } from "@/components/ui";
import { SignaturePad } from "@/features/projects/SignaturePad";
import { useUpdateMySignature } from "@/features/company/api/useUpdateMySignature";
import type { Profile } from "@/types/domain";

export function MySignatureModal({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(profile.signatureUrl);
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState("");
  const updateSignature = useUpdateMySignature();

  const handleSave = async () => {
    if (!changed) {
      onClose();
      return;
    }
    setError("");
    try {
      await updateSignature.mutateAsync(signatureDataUrl);
      onClose();
    } catch {
      setError("تعذّر حفظ التوقيع، حاول مجدداً");
    }
  };

  return (
    <Modal title="توقيعي" onClose={onClose}>
      <p className="text-xs text-ink-soft mb-3">
        يُحفظ مرة واحدة ويظهر تلقائياً مع اسمك ومسمّاك الوظيفي أينما اعتمدت عقداً أو دفعة أو أي طلب آخر — لا حاجة لرسمه
        في كل مرة.
      </p>
      <SignaturePad
        value={signatureDataUrl}
        onChange={(v) => {
          setSignatureDataUrl(v);
          setChanged(true);
        }}
      />
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2 mt-4">
        <PrimaryButton onClick={handleSave} disabled={updateSignature.isPending} className="flex-1">
          {updateSignature.isPending ? "جارٍ الحفظ..." : "حفظ"}
        </PrimaryButton>
        <SecondaryButton onClick={onClose} className="flex-1">
          إلغاء
        </SecondaryButton>
      </div>
    </Modal>
  );
}
