/** يقترح ترميزاً هرمياً افتراضياً (01، 01-01، ...) بناءً على ترميز الأب وعدد الأشقاء
 * الحاليين — مجرد اقتراح أولي قابل للتعديل الكامل من المستخدم، وليس مفروضاً. */
export function suggestActivityCode(parentCode: string | null, existingSiblingCount: number): string {
  const nextIndex = (existingSiblingCount + 1).toString().padStart(2, "0");
  return parentCode ? `${parentCode}-${nextIndex}` : nextIndex;
}
