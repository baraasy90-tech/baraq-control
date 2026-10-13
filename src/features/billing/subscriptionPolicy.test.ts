import { describe, expect, it } from "vitest";
import { previewSubscriptionPolicy as policy } from "./subscriptionPolicy";
const end = "2028-02-29T12:00:00Z";
const boundary = Date.parse(end);
describe("subscription policy preview", () => {
  it("keeps trial writable until its exact expiry", () => {
    expect(policy("trial", end, boundary - 1).stage).toBe("trial");
    expect(policy("trial", end, boundary).stage).toBe("grace");
  });
  it("uses 30 days of grace across a leap month and ends at the exact boundary", () => {
    const endOfGrace = boundary + 30 * 86400000;
    expect(policy("expired", end, endOfGrace - 1).daysRemaining).toBe(1);
    expect(policy("trial", end, endOfGrace).stage).toBe("read_only");
    expect(policy("trial", end, boundary).graceEndsAt).toBe("2028-03-30T12:00:00.000Z");
  });
  it("does not treat paid subscriptions or explicit cancellation as expired trials", () => {
    expect(policy("active", end, boundary + 100 * 86400000).stage).toBe("active");
    expect(policy("canceled", end, boundary - 1).stage).toBe("canceled");
  });
  it("reports invalid dates without inventing a grace period", () => expect(policy("trial", "bad").stage).toBe("invalid"));
});
