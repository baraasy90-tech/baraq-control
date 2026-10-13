import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, addByCalendar, startOfWeek, todayISO, fmt } from "./dates";
afterEach(() => vi.useRealTimers());
describe("calendar dates", () => {
  it("formats date-only values without moving them to the previous calendar day", () => {
    const date = "2026-03-08";
    expect(fmt(date)).toBe(new Date(date).toLocaleDateString("ar-SA", { day: "2-digit", month: "short", timeZone: "UTC" }));
    expect(fmt(null)).toBe("—");
  });
  it("uses the user's local calendar day after midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 11, 0, 15));
    expect(todayISO()).toBe("2026-10-11");
  });
  it("date-only arithmetic does not shift at daylight-saving boundaries", () => {
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
    expect(startOfWeek("2026-03-09")).toBe("2026-03-08");
  });
  it("skips Friday and honors custom weekdays", () => {
    expect(addByCalendar("2026-10-08", 1, "workdays")).toBe("2026-10-10");
    expect(addByCalendar("2026-10-08", 1, "calendar", [0, 1, 2, 3, 4])).toBe("2026-10-11");
  });
});
