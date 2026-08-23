import { supabase } from "@/lib/supabase/client";

export type Bucket = "company-logos" | "signatures" | "checklist-photos" | "documents";

const SIGNED_URL_TTL_SECONDS = 10 * 60;

/** التوقيعات والمستندات (عقود/طلبات/ملفات) تحمل قيمة مالية أو قانونية فتُخزَّن كمسار
 * فقط مع رابط قصير الأجل يُولَّد وقت العرض. الشعارات وصور التشيك ليست أقل حساسية
 * (لا تحمل قيمة مالية) فتبقى بنفس السلوك القديم (رابط طويل الأمد) لتفادي توسيع
 * نطاق التغيير لكل شاشة تعرضها — يمكن تحويلها لاحقاً بنفس الأسلوب إن لزم. */
const SHORT_LIVED_BUCKETS: Bucket[] = ["signatures", "documents"];

/** يرفع ملفاً إلى bucket خاص. لـ signatures/documents يعيد مسار التخزين فقط (الرابط
 * الفعلي يُولَّد وقت العرض بصلاحية قصيرة عبر getFileUrl/getFileUrls). لباقي الـ
 * buckets يعيد رابطاً موقّعاً طويل الأمد كالسابق تماماً. */
export async function uploadFile(bucket: Bucket, path: string, file: File | Blob): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;

  if (SHORT_LIVED_BUCKETS.includes(bucket)) return path;

  const { data, error: signError } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signError) throw signError;
  return data.signedUrl;
}

/** سجلات أُنشئت قبل هذا الإصلاح تخزّن رابطاً موقّعاً كاملاً بدل مسار مباشر —
 * نستخرج المسار منها للتوافق العكسي دون الحاجة لأي migration على البيانات القديمة. */
function extractPath(bucket: Bucket, stored: string): string {
  const marker = `/object/sign/${bucket}/`;
  const idx = stored.indexOf(marker);
  if (idx === -1) return stored;
  return decodeURIComponent(stored.slice(idx + marker.length).split("?")[0]);
}

/** رابط موقّع قصير الأجل (10 دقائق) لملف واحد — يُستدعى وقت العرض الفعلي فقط. */
export async function getFileUrl(bucket: Bucket, stored: string | null): Promise<string | null> {
  if (!stored) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(extractPath(bucket, stored), SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}

/** نفس getFileUrl لعدة ملفات دفعة واحدة (استدعاء تخزين واحد بدل واحد لكل صف) —
 * يعيد Map من القيمة المخزّنة الأصلية إلى الرابط الموقّع الجديد. */
export async function getFileUrls(bucket: Bucket, stored: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(stored.filter((s): s is string => !!s))];
  const result = new Map<string, string>();
  if (unique.length === 0) return result;

  const paths = unique.map((s) => extractPath(bucket, s));
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
