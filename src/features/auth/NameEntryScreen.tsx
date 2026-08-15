import { useState } from "react";
import { AuthCard, FieldLabel, TextInput, PrimaryButton, ErrorText } from "@/components/ui";
import { useUpdateFullName } from "@/features/company/useUpdateFullName";

export function NameEntryScreen() {
  const [name, setName] = useState("");
  const mutation = useUpdateFullName();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) mutation.mutate(trimmed);
  };

  return (
    <AuthCard eyebrow="دخول" title="أهلاً بك">
      <form onSubmit={handleSubmit}>
        <FieldLabel>اسمك</FieldLabel>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="اكتب اسمك" autoFocus />
        <div className="mb-4" />
        <PrimaryButton type="submit" disabled={!name.trim() || mutation.isPending}>
          {mutation.isPending ? "جارٍ الحفظ..." : "دخول"}
        </PrimaryButton>
        <ErrorText>{mutation.isError ? "حدث خطأ، حاول مجدداً" : null}</ErrorText>
      </form>
    </AuthCard>
  );
}
