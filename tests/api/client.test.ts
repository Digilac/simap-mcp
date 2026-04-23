/**
 * Tests for the simap HTTP client (URL building, error mapping, timeout,
 * schema parsing, debug logging). Network is mocked via vi.stubGlobal.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { SimapClient, buildUrl } from "../../src/api/client.js";
import { SimapApiError } from "../../src/types/api.js";
import { SlidingWindowRateLimiter } from "../../src/api/rate-limiter.js";

const BASE = "https://example.test/api";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function errorResponse(status: number, statusText: string): Response {
  return new Response(JSON.stringify({ error: statusText }), {
    status,
    statusText,
    headers: { "content-type": "application/json" },
  });
}

function newClient(): SimapClient {
  // Use a rate limiter with a huge window so it never blocks test runs.
  return new SimapClient(
    BASE,
    new SlidingWindowRateLimiter({ maxRequests: 1000, windowMs: 60_000 })
  );
}

describe("buildUrl", () => {
  it("joins baseUrl and endpoint", () => {
    const url = buildUrl(BASE, "/v1/things");
    expect(url).toBe("https://example.test/api/v1/things");
  });

  it("emits array values as repeated keys", () => {
    const url = buildUrl(BASE, "/search", { cantons: ["VD", "GE"] });
    expect(url).toContain("cantons=VD");
    expect(url).toContain("cantons=GE");
    expect(url.match(/cantons=/g)?.length).toBe(2);
  });

  it("skips undefined values", () => {
    const url = buildUrl(BASE, "/search", { a: "1", b: undefined });
    expect(url).toContain("a=1");
    expect(url).not.toContain("b=");
  });

  it("emits a single scalar value", () => {
    const url = buildUrl(BASE, "/search", { q: "hello" });
    expect(url).toContain("q=hello");
  });

  it("normalizes a trailing slash on baseUrl", () => {
    const url = buildUrl("https://example.test/api/", "/v1/x");
    expect(url).toBe("https://example.test/api/v1/x");
  });
});

describe("SimapClient.get", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.SIMAP_MCP_DEBUG;
  });

  it("returns parsed JSON on 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ok: true }))
    );
    const client = newClient();
    const data = await client.get<{ ok: boolean }>("/ping");
    expect(data).toEqual({ ok: true });
  });

  it("validates the response against a Zod schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ n: 42 }))
    );
    const client = newClient();
    const schema = z.object({ n: z.number() });
    const data = await client.get("/x", { schema });
    expect(data).toEqual({ n: 42 });
  });

  it("throws a ZodError when the response shape is wrong", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ n: "not-a-number" }))
    );
    const client = newClient();
    const schema = z.object({ n: z.number() });
    await expect(client.get("/x", { schema })).rejects.toThrow();
  });

  it("throws SimapApiError with status code on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => errorResponse(404, "Not Found"))
    );
    const client = newClient();
    try {
      await client.get("/missing");
      expect.fail("expected SimapApiError");
    } catch (err) {
      expect(err).toBeInstanceOf(SimapApiError);
      const e = err as SimapApiError;
      expect(e.statusCode).toBe(404);
      expect(e.endpoint).toBe("/missing");
    }
  });

  it("throws SimapApiError with status code on 500", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => errorResponse(500, "Server Error"))
    );
    const client = newClient();
    await expect(client.get("/boom")).rejects.toMatchObject({
      name: "SimapApiError",
      statusCode: 500,
    });
  });

  it("aborts when the request exceeds the timeout", async () => {
    // fetch that honours the AbortSignal
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      })
    );

    const client = newClient();
    await expect(client.get("/slow", { timeout: 20 })).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("includes query params in the final URL", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const client = newClient();
    await client.get("/search", {
      params: { q: "hello", cantons: ["VD", "GE"] },
    });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("q=hello");
    expect(calledUrl).toContain("cantons=VD");
    expect(calledUrl).toContain("cantons=GE");
  });

  it("emits minimal stderr logging by default", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ok: true }))
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = newClient();
    await client.get("/x");

    const logged = spy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain("GET /x");
    // No debug marker (no "→", no "←")
    expect(logged).not.toContain("→");
    expect(logged).not.toContain("←");
  });

  it("emits verbose stderr logging when SIMAP_MCP_DEBUG=1", async () => {
    process.env.SIMAP_MCP_DEBUG = "1";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ hello: "world" }))
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = newClient();
    await client.get("/x");

    const logged = spy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain("GET /x");
    expect(logged).toContain("→"); // full URL marker
    expect(logged).toContain("←"); // response marker
    expect(logged).toContain("200");
  });
});
