import { afterEach, describe, expect, it, vi } from "vitest";
import { onlineManager } from "@tanstack/react-query";
import { createSessionQueryClient } from "./sessionQueryClient";

afterEach(() => onlineManager.setOnline(true));
describe("session query cache", () => {
  it("invalidates company totals after a successful write", async () => {
    const client = createSessionQueryClient();
    client.setQueryData(["overview", "company"], { actual: 100 });
    const mutation = client.getMutationCache().build(client, { mutationFn: async () => true });
    await mutation.execute(undefined);
    expect(client.getQueryState(["overview", "company"])?.isInvalidated).toBe(true);
  });
  it("does not expose another identity's cached company data", () => {
    const previous = createSessionQueryClient();
    previous.setQueryData(["activities", "shared-project"], [{ private: "old-user" }]);
    const next = createSessionQueryClient();
    expect(next.getQueryData(["activities", "shared-project"])).toBeUndefined();
    previous.clear();
    expect(previous.getQueryCache().getAll()).toHaveLength(0);
  });
  it("does not retry a write after an ambiguous network failure", async () => {
    const client = createSessionQueryClient();
    const write = vi.fn().mockRejectedValue(new Error("network"));
    const mutation = client.getMutationCache().build(client, { mutationFn: write });
    await expect(mutation.execute(undefined)).rejects.toThrow("network");
    expect(write).toHaveBeenCalledTimes(1);
  });
  it("rejects offline writes without queuing or calling the API", async () => {
    onlineManager.setOnline(false);
    const client = createSessionQueryClient();
    const write = vi.fn();
    const mutation = client.getMutationCache().build(client, { mutationFn: write });
    await expect(mutation.execute(undefined)).rejects.toThrow("لا يوجد اتصال");
    expect(write).not.toHaveBeenCalled();
    onlineManager.setOnline(true);
    await client.resumePausedMutations();
    expect(write).not.toHaveBeenCalled();
  });
});
