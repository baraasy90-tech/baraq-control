import { beforeEach, describe, expect, it, vi } from "vitest";
import { withComputedDone } from "@/features/schedule/lib/completion";
import { getPlannedAmount, getActualAmount } from "@/features/budget/lib/budget";
import { loadActivities } from "./useActivities";

const { tables, signing } = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  signing: vi.fn(async () => new Map<string, string>()),
}));
vi.mock("@/lib/supabase/storage", () => ({ getFileUrls: signing }));
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from(name: string) {
      const filters: [string, unknown[]][] = [];
      const builder = {
        select: () => builder,
        order: () => builder,
        in: (key: string, values: unknown[]) => { filters.push([key, values]); return builder; },
        range: async (from: number, to: number) => ({
          data: (tables[name] ?? []).filter(row => filters.every(([key, values]) => values.includes(row[key]))).slice(from, to + 1),
          error: null,
        }),
      };
      return builder;
    },
  },
}));

beforeEach(() => {
  for (const key of Object.keys(tables)) delete tables[key];
  signing.mockClear();
  tables.activities = [{
    id: "a", project_id: "p", parent_id: null, done: false, requires_receiving: true,
    budget_type: "lumpsum", planned_amount: 100, linked_contract_id: "c",
  }];
  tables.contracts = [{ id: "c", status: "approved", contract_name: "contract", total_value: 1000, vat_inclusive: false, vat_rate: 15 }];
  tables.submissions = [{ id: "s", activity_id: "a", decision: "approved", created_at: "2026-10-11T00:00:00Z" }];
  tables.budget_actual_entries = [
    { id: "b1", activity_id: "a", amount: 200, status: "approved" },
    { id: "b2", activity_id: "a", amount: 999, status: "draft" },
  ];
});

describe("project and overview use the same activity semantics", () => {
  it("shares contract VAT, approved actuals and receiving completion", async () => {
    const project = withComputedDone(await loadActivities(["p"]));
    const overview = withComputedDone(await loadActivities(["p"], false));
    for (const rows of [project, overview]) {
      expect(rows[0].done).toBe(true);
      expect(getPlannedAmount(rows[0])).toBe(1150);
      expect(getActualAmount(rows[0])).toBe(200);
    }
  });
  it("a later rejected receiving submission makes the item incomplete", async () => {
    tables.submissions.push({ id: "s2", activity_id: "a", decision: "rejected", created_at: "2026-10-12T00:00:00Z" });
    expect(withComputedDone(await loadActivities(["p"], false))[0].done).toBe(false);
  });
  it("overview does not sign or load attachment URLs", async () => {
    await loadActivities(["p"], false);
    expect(signing).not.toHaveBeenCalled();
  });
});
