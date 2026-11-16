import { useSyncExternalStore } from 'react';

export const interfaceColors = [
  { id: 'orange', name: 'برتقالي برق', color: '#c05327', soft: '#fdebe0' },
  { id: 'teal', name: 'زمردي', color: '#137465', soft: '#e4f3ee' },
  { id: 'blue', name: 'أزرق', color: '#315dcc', soft: '#e8efff' },
  { id: 'violet', name: 'بنفسجي', color: '#7750b2', soft: '#f1eafb' },
] as const;
export type InterfacePreferences = { mode: 'light' | 'dark'; accent: typeof interfaceColors[number]['id'] };
const defaults: InterfacePreferences = { mode: 'light', accent: 'orange' };
const temporary = new Map<string, string>();
const eventName = 'baraq-interface-preferences';
const keyFor = (userId: string) => `baraq-interface-v1:${userId}`;

export function parseInterfacePreferences(raw: string | null): InterfacePreferences {
  try {
    const parsed: unknown = JSON.parse(raw || 'null');
    if (!parsed || typeof parsed !== 'object') return defaults;
    const value = parsed as Record<string, unknown>;
    return { mode: value.mode === 'dark' ? 'dark' : 'light', accent: interfaceColors.some(c => c.id === value.accent) ? value.accent as InterfacePreferences['accent'] : 'orange' };
  } catch { return defaults; }
}

function read(userId: string | null) {
  if (!userId) return null;
  const key = keyFor(userId);
  if (temporary.has(key)) return temporary.get(key)!;
  try { return localStorage.getItem(key); } catch { return null; }
}

export function saveInterfacePreferences(userId: string, value: InterfacePreferences): boolean {
  const key = keyFor(userId), raw = JSON.stringify(value);
  let persisted = false;
  try { localStorage.setItem(key, raw); temporary.delete(key); persisted = true; } catch { temporary.set(key, raw); }
  window.dispatchEvent(new Event(eventName));
  return persisted;
}

function subscribe(listener: () => void) {
  window.addEventListener(eventName, listener);
  window.addEventListener('storage', listener);
  return () => { window.removeEventListener(eventName, listener); window.removeEventListener('storage', listener); };
}

export function useInterfacePreferences(userId: string | null) {
  const raw = useSyncExternalStore(subscribe, () => read(userId), () => null);
  return parseInterfacePreferences(raw);
}
