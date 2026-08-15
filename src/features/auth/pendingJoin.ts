const PENDING_JOIN_CODE_KEY = "baraq_pending_join_code";

export function setPendingJoinCode(code: string): void {
  try {
    localStorage.setItem(PENDING_JOIN_CODE_KEY, code.trim().toUpperCase());
  } catch {
    // تجاهل
  }
}

export function getPendingJoinCode(): string | null {
  try {
    return localStorage.getItem(PENDING_JOIN_CODE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingJoinCode(): void {
  try {
    localStorage.removeItem(PENDING_JOIN_CODE_KEY);
  } catch {
    // تجاهل
  }
}
