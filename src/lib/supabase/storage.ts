import { supabase } from "@/lib/supabase/client";

export type Bucket = "company-logos" | "signatures" | "checklist-photos" | "documents";

/** يرفع ملفاً إلى bucket خاص ويعيد رابطاً موقّعاً (صالح لمدة طويلة) للعرض. */
export async function uploadFile(bucket: Bucket, path: string, file: File | Blob): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;

  const { data, error: signError } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signError) throw signError;
  return data.signedUrl;
}

export function uniqueFileName(originalName: string): string {
  const ext = originalName.includes(".") ? originalName.split(".").pop() : "bin";
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
