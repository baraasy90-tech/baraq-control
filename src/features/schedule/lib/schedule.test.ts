import { describe, it, expect } from "vitest";
import { computeSchedule, getLatePhases, getCriticalUpcoming } from "@/features/schedule/lib/schedule";
import { makeActivity } from "@/test/factories";
import { addDays, todayISO } from "@/utils/dates";

describe("computeSchedule", () => {
  it("computes end date as start + duration for a plain calendar activity", () => {
    const a = makeActivity({ id: "a", startDate: "2026-01-01", durationDays: 5, calendarType: "calendar" });
    const schedule = computeSchedule([a]);
    expect(schedule.a).toEqual({ start: "2026-01-01", end: "2026-01-06" });
  });

  it("starts an FS-dependent activity after its predecessor ends, plus lag", () => {
    const a = makeActivity({ id: "a", startDate: "2026-01-01", durationDays: 5 });
    const b = makeActivity({ id: "b", dependsOn: "a", depType: "FS", lagDays: 2, durationDays: 3 });
    const schedule = computeSchedule([a, b]);
    // a: 2026-01-01 → 2026-01-06, b يبدأ بعد نهاية a + مهلة يومين
    expect(schedule.b.start).toBe(addDays(schedule.a.end, 2));
  });

  it("starts an SS-dependent activity alongside its predecessor's start, plus lag", () => {
    const a = makeActivity({ id: "a", startDate: "2026-01-01", durationDays: 10 });
    const b = makeActivity({ id: "b", dependsOn: "a", depType: "SS", lagDays: 1, durationDays: 2 });
    const schedule = computeSchedule([a, b]);
    expect(schedule.b.start).toBe(addDays(schedule.a.start, 1));
  });

  it("excludes activities involved in a circular dependency instead of looping forever", () => {
    const a = makeActivity({ id: "a", dependsOn: "b", depType: "FS", durationDays: 2 });
    const b = makeActivity({ id: "b", dependsOn: "a", depType: "FS", durationDays: 2 });
    const schedule = computeSchedule([a, b]);
    expect(schedule.a).toBeUndefined();
    expect(schedule.b).toBeUndefined();
  });

  it("leaves an activity with no start date and no dependency unscheduled", () => {
    const a = makeActivity({ id: "a", startDate: null, dependsOn: null });
    const schedule = computeSchedule([a]);
    expect(schedule.a).toBeUndefined();
  });
});

describe("getLatePhases", () => {
  it("flags an unfinished root phase whose end date is in the past", () => {
    const past = addDays(todayISO(), -10);
    const a = makeActivity({ id: "a", parentId: null, done: false, startDate: addDays(past, -5), durationDays: 3 });
    const schedule = computeSchedule([a]);
    const late = getLatePhases([a], schedule);
    expect(late.map((p) => p.id)).toContain("a");
  });

  it("does not flag a phase that is already marked done", () => {
    const past = addDays(todayISO(), -10);
    const a = makeActivity({ id: "a", parentId: null, done: true, startDate: addDays(past, -5), durationDays: 3 });
    const schedule = computeSchedule([a]);
    expect(getLatePhases([a], schedule)).toHaveLength(0);
  });
});

describe("getCriticalUpcoming", () => {
  it("includes a critical activity starting within its alert lead window", () => {
    const start = addDays(todayISO(), 2);
    const a = makeActivity({ id: "a", critical: true, alertLeadDays: 5, startDate: start, durationDays: 3 });
    const schedule = computeSchedule([a]);
    const upcoming = getCriticalUpcoming([a], schedule);
    expect(upcoming.map((u) => u.id)).toContain("a");
  });

  it("excludes a critical activity starting further out than its alert lead window", () => {
    const start = addDays(todayISO(), 20);
    const a = makeActivity({ id: "a", critical: true, alertLeadDays: 5, startDate: start, durationDays: 3 });
    const schedule = computeSchedule([a]);
    expect(getCriticalUpcoming([a], schedule)).toHaveLength(0);
  });

  it("excludes a non-critical activity even if it starts soon", () => {
    const start = addDays(todayISO(), 1);
    const a = makeActivity({ id: "a", critical: false, alertLeadDays: 5, startDate: start, durationDays: 3 });
    const schedule = computeSchedule([a]);
    expect(getCriticalUpcoming([a], schedule)).toHaveLength(0);
  });
});
