/**
 * Tests for the simap HTTP client (URL building, error mapping, timeout,
 * schema parsing, debug logging). Network is mocked via vi.stubGlobal.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import {
  SimapClient,
  buildUrl,
  computeBackoffDelay,
  isRetryableStatus,
  parseRetryAfter,
  type RetryOptions,
} from "../../src/api/client.js";
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

function errorResponse(
  status: number,
  statusText: string,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify({ error: statusText }), {
    status,
    statusText,
    headers: { "content-type": "application/json", ...headers },
  });
}

function newClient(retry: Partial<RetryOptions> = {}): SimapClient {
  // Use a rate limiter with a huge window so it never blocks test runs, and
  // zero backoff so retries don't slow the suite down.
  return new SimapClient(
    BASE,
    new SlidingWindowRateLimiter({ maxRequests: 1000, windowMs: 60_000 }),
    { baseDelayMs: 0, maxDelayMs: 0, ...retry }
  );
}

function networkError(): TypeError {
  return new TypeError("fetch failed", { cause: new Error("ECONNRESET") });
}

describe("isRetryableStatus", () => {
  it.each([408, 429, 500, 502, 503, 504, 599])("retries HTTP %i", (status) => {
    expect(isRetryableStatus(status)).toBe(true);
  });

  it.each([200, 400, 401, 403, 404, 422, 600])("does not retry HTTP %i", (status) => {
    expect(isRetryableStatus(status)).toBe(false);
  });
});

describe("computeBackoffDelay", () => {
  const opts = { baseDelayMs: 500, maxDelayMs: 5000 };

  it("doubles the delay on each retry", () => {
    // random() = 1 → upper bound of the jitter range = full exponential delay
    expect(computeBackoffDelay(0, opts, () => 1)).toBe(500);
    expect(computeBackoffDelay(1, opts, () => 1)).toBe(1000);
    expect(computeBackoffDelay(2, opts, () => 1)).toBe(2000);
  });

  it("keeps at least half of the exponential delay (equal jitter)", () => {
    expect(computeBackoffDelay(0, opts, () => 0)).toBe(250);
    expect(computeBackoffDelay(1, opts, () => 0)).toBe(500);
  });

  it("caps the delay at maxDelayMs", () => {
    expect(computeBackoffDelay(10, opts, () => 1)).toBe(5000);
  });
});

describe("parseRetryAfter", () => {
  it("returns undefined when the header is absent", () => {
    expect(parseRetryAfter(null)).toBeUndefined();
  });

  it("parses delta-seconds", () => {
    expect(parseRetryAfter("3")).toBe(3000);
    expect(parseRetryAfter(" 0 ")).toBe(0);
  });

  it("parses an HTTP date relative to now", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(parseRetryAfter("Thu, 01 Jan 2026 00:00:02 GMT", now)).toBe(2000);
  });

  it("clamps a past HTTP date to 0", () => {
    const now = Date.parse("2026-01-01T00:00:10Z");
    expect(parseRetryAfter("Thu, 01 Jan 2026 00:00:00 GMT", now)).toBe(0);
  });

  it("returns undefined for garbage", () => {
    expect(parseRetryAfter("soon")).toBeUndefined();
  });
});

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

  it("throws SimapApiError with status code on 500 once retries are exhausted", async () => {
    const fetchMock = vi.fn(async () => errorResponse(500, "Server Error"));
    vi.stubGlobal("fetch", fetchMock);
    const client = newClient();
    await expect(client.get("/boom")).rejects.toMatchObject({
      name: "SimapApiError",
      statusCode: 500,
    });
    // 1 initial attempt + 2 default retries
    expect(fetchMock).toHaveBeenCalledTimes(3);
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

describe("SimapClient.get retries", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each([502, 503, 504, 408, 429])(
    "retries HTTP %i and returns the eventual success",
    async (status) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(errorResponse(status, "Transient"))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));
      vi.stubGlobal("fetch", fetchMock);

      const data = await newClient().get("/flaky");
      expect(data).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    }
  );

  it("retries network errors raised by fetch", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(newClient().get("/flaky")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("rethrows the original network error once retries are exhausted", async () => {
    const fetchMock = vi.fn().mockRejectedValue(networkError());
    vi.stubGlobal("fetch", fetchMock);

    await expect(newClient().get("/down")).rejects.toMatchObject({
      name: "TypeError",
      message: "fetch failed",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([400, 401, 403, 404, 422])("does not retry HTTP %i", async (status) => {
    const fetchMock = vi.fn(async () => errorResponse(status, "Client Error"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(newClient().get("/bad")).rejects.toMatchObject({ statusCode: status });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry a response that fails schema validation", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ n: "nope" }));
    vi.stubGlobal("fetch", fetchMock);

    const schema = z.object({ n: z.number() });
    await expect(newClient().get("/x", { schema })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry its own timeout", async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(newClient().get("/slow", { timeout: 20 })).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry when retries is 0", async () => {
    const fetchMock = vi.fn(async () => errorResponse(503, "Unavailable"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(newClient({ retries: 0 }).get("/x")).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("goes through the rate limiter on every attempt", async () => {
    const limiter = new SlidingWindowRateLimiter({ maxRequests: 1000, windowMs: 60_000 });
    const acquire = vi.spyOn(limiter, "acquire");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(errorResponse(503, "Unavailable"))
        .mockResolvedValueOnce(jsonResponse({ ok: true }))
    );

    const client = new SimapClient(BASE, limiter, { baseDelayMs: 0, maxDelayMs: 0 });
    await client.get("/x");
    expect(acquire).toHaveBeenCalledTimes(2);
  });

  it("waits with exponential backoff between attempts", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(1);
    const fetchMock = vi.fn(async () => errorResponse(503, "Unavailable"));
    vi.stubGlobal("fetch", fetchMock);

    const client = newClient({ baseDelayMs: 100, maxDelayMs: 10_000 });
    const result = client.get("/x").catch((e: unknown) => e);

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(99);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(199);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    expect(await result).toBeInstanceOf(SimapApiError);
  });

  it("honours Retry-After, capped at maxDelayMs", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        errorResponse(429, "Too Many Requests", { "retry-after": "60" })
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const client = newClient({ baseDelayMs: 10, maxDelayMs: 2000 });
    const result = client.get("/x");

    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await expect(result).resolves.toEqual({ ok: true });
  });

  it("logs each retry to stderr", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(errorResponse(503, "Unavailable"))
        .mockResolvedValueOnce(jsonResponse({ ok: true }))
    );

    await newClient().get("/x");
    const logged = spy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain("retrying GET /x");
    expect(logged).toContain("HTTP 503");
    expect(logged).toContain("attempt 2/3");
  });
});
