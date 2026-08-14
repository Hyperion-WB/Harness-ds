import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { DshGatewayClient } from "./dshGatewayClient";

describe("DshGatewayClient", () => {
  let client: DshGatewayClient;

  beforeEach(() => {
    client = new DshGatewayClient("http://127.0.0.1:3080");
  });

  afterEach(() => {
    client.disconnect();
  });

  it("formats base URL without trailing slash", () => {
    const c = new DshGatewayClient("http://127.0.0.1:3080///");
    expect(c.getUrl()).toBe("http://127.0.0.1:3080");
  });

  it("calls RPC with correct client-request envelope", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: "server-response",
        rpcId: "test-id",
        result: { ok: true, value: { items: [{ sessionId: "s1", title: "Test Session" }] } },
      }),
    });
    globalThis.fetch = mockFetch;

    const res = await client.listSessions();
    expect(res.items).toHaveLength(1);
    expect(res.items[0].sessionId).toBe("s1");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://127.0.0.1:3080/api",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("throws descriptive error when RPC returns business failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: "server-response",
        rpcId: "test-id",
        result: {
          ok: false,
          error: { code: "session-not-found", message: "Session does not exist" },
        },
      }),
    });

    await expect(client.getSessionHistory("non-existent")).rejects.toThrow(
      "Session does not exist",
    );
  });
});
