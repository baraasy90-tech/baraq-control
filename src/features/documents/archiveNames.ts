export function archiveNameError(name: string): string | null {
  const value = name.trim();
  if (!value || value === "." || value === "..") return "أدخل اسماً صالحاً.";
  if (value.length > 200) return "استخدم اسماً لا يتجاوز 200 حرف.";
  if (/[\\/]/.test(value) || Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return "لا يمكن أن يحتوي الاسم على شرطة مسار أو محارف تحكم.";
  return null;
}

export function splitArchiveFileName(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 && dot < name.length - 1 ? { base: name.slice(0, dot), extension: name.slice(dot) } : { base: name, extension: "" };
}

export function renamedArchiveFile(original: string, base: string) {
  const name = base.trim() + splitArchiveFileName(original).extension;
  const error = archiveNameError(base) ?? archiveNameError(name);
  if (error) throw new Error(error);
  return name;
}
