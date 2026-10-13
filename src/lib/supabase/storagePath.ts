export type Bucket = "company-logos" | "signatures" | "checklist-photos" | "documents";

/** Normalize legacy signed URLs so expiry tokens do not change a form's persistent payload. */
export function storedFilePath(bucket: Bucket, stored: string): string {
  const marker = `/object/sign/${bucket}/`;
  const index = stored.indexOf(marker);
  if (index < 0) return stored;
  try { return decodeURIComponent(stored.slice(index + marker.length).split("?")[0]); }
  catch { return stored; }
}
