import { supabase } from "@/lib/supabase/client";
import {validateUpload} from "./uploadPolicy";
import {type Bucket, storedFilePath} from "./storagePath";

export type {Bucket} from "./storagePath";

const SIGNED_URL_TTL_SECONDS = 10 * 60;

/** All private buckets store paths; links are signed at display time. */
export async function uploadFile(bucket: Bucket, path: string, file: File | Blob): Promise<string> {
  const contentType=validateUpload(bucket,file);
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true,contentType });
  if (error) throw error;

  return path;
}

/** سجلات أُنشئت قبل هذا الإصلاح تخزّن رابطاً موقّعاً كاملاً بدل مسار مباشر —
 * نستخرج المسار منها للتوافق العكسي دون الحاجة لأي migration على البيانات القديمة. */
/** رابط موقّع قصير الأجل (10 دقائق) لملف واحد — يُستدعى وقت العرض الفعلي فقط. */
export async function getFileUrl(bucket: Bucket, stored: string | null): Promise<string | null> {
  if (!stored) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storedFilePath(bucket, stored), SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}

/** نفس getFileUrl لعدة ملفات دفعة واحدة (استدعاء تخزين واحد بدل واحد لكل صف) —
 * يعيد Map من القيمة المخزّنة الأصلية إلى الرابط الموقّع الجديد. */
export async function getFileUrls(bucket: Bucket, stored: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(stored.filter((s): s is string => !!s))];
  const result = new Map<string, string>();
  if (unique.length === 0) return result;

  const paths = unique.map((s) => storedFilePath(bucket, s));
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return result;

  data.forEach((entry, i) => {
    if (entry.signedUrl) result.set(unique[i], entry.signedUrl);
  });
  return result;
}

export function uniqueFileName(originalName: string): string {
  const ext = originalName.includes(".") ? originalName.split(".").pop() : "bin";
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
