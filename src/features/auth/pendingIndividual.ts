const PENDING_INDIVIDUAL_KEY = "baraq_pending_individual";

export function setPendingIndividual(): void {
  try {
    localStorage.setItem(PENDING_INDIVIDUAL_KEY, "1");
  } catch {
    // تجاهل
  }
}

export function getPendingIndividual(): boolean {
  try {
    return localStorage.getItem(PENDING_INDIVIDUAL_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearPendingIndividual(): void {
  try {
    localStorage.removeItem(PENDING_INDIVIDUAL_KEY);
  } catch {
    // تجاهل
  }
}
