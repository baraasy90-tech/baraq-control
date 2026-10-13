import { describe, expect, it } from "vitest";
import { supportRequest } from "./supportRequest";

describe("support conversation bounds", () => {
  it("keeps recent messages when the conversation exceeds its character budget", () => {
    const messages = Array.from({ length: 12 }, (_, index) => ({ role: "assistant" as const, content: String(index).padEnd(4000, "x") }));
    const body = supportRequest("x".repeat(4000), messages);
    expect(body.history).toHaveLength(3);
    expect(body.history[2].content).toBe(messages[11].content);
  });
  it("respects UTF-8 body limits for multibyte messages", () => {
    const body = supportRequest("界".repeat(4000), Array.from({ length: 10 }, () => ({ role: "user" as const, content: "界".repeat(4000) })));
    expect(new TextEncoder().encode(JSON.stringify(body)).byteLength).toBeLessThanOrEqual(32768);
    expect(body.history).toHaveLength(1);
  });
  it("bounds provider replies and omits empty history entries", () => {
    const body = supportRequest("سؤال", [{ role: "assistant", content: "x".repeat(5000) }, { role: "user", content: " " }]);
    expect(body.history).toHaveLength(1);
    expect(body.history[0].content).toHaveLength(4000);
  });
});
