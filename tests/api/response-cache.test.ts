/**
 * Tests for ResponseCache: TTL expiry, LRU eviction, in-flight dedupe and
 * error eviction. Uses an injected clock instead of fake timers.
 */

import { describe, it, expect, vi } from "vitest";
import { ResponseCache } from "../../src/api/response-cache.js";

function clock(start = 0) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("ResponseCache", () => {
  it("loads on miss and serves the cached value on hit", async () => {
    const cache = new ResponseCache();
    const load = vi.fn(async () => "v1");

    const first = cache.getOrLoad("k", 1000, load);
    expect(first.hit).toBe(false);
    expect(await first.value).toBe("v1");

    const second = cache.getOrLoad("k", 1000, load);
    expect(second.hit).toBe(true);
    expect(await second.value).toBe("v1");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("reloads once the TTL has elapsed", async () => {
    const c = clock();
    const cache = new ResponseCache({ now: c.now });
    const load = vi.fn().mockResolvedValueOnce("old").mockResolvedValueOnce("new");

    await cache.getOrLoad("k", 1000, load).value;
    c.advance(999);
    expect(cache.getOrLoad("k", 1000, load).hit).toBe(true);

    c.advance(1);
    const reloaded = cache.getOrLoad("k", 1000, load);
    expect(reloaded.hit).toBe(false);
    expect(await reloaded.value).toBe("new");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight load between concurrent callers", async () => {
    const cache = new ResponseCache();
    let resolve: (v: string) => void = () => {};
    const load = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolve = r;
        })
    );

    const a = cache.getOrLoad("k", 1000, load);
    const b = cache.getOrLoad("k", 1000, load);
    expect(b.hit).toBe(true);
    resolve("shared");

    expect(await a.value).toBe("shared");
    expect(await b.value).toBe("shared");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures", async () => {
    const cache = new ResponseCache();
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("ok");

    await expect(cache.getOrLoad("k", 1000, load).value).rejects.toThrow("boom");
    expect(cache.size).toBe(0);

    const retry = cache.getOrLoad("k", 1000, load);
    expect(retry.hit).toBe(false);
    expect(await retry.value).toBe("ok");
  });

  it("keys entries independently", async () => {
    const cache = new ResponseCache();
    expect(await cache.getOrLoad("a", 1000, async () => 1).value).toBe(1);
    expect(await cache.getOrLoad("b", 1000, async () => 2).value).toBe(2);
    expect(cache.size).toBe(2);
  });

  it("evicts the least recently used entry when full", async () => {
    const cache = new ResponseCache({ maxEntries: 2 });
    await cache.getOrLoad("a", 1000, async () => "a").value;
    await cache.getOrLoad("b", 1000, async () => "b").value;

    // Touch "a" so "b" becomes the least recently used.
    expect(cache.getOrLoad("a", 1000, async () => "a2").hit).toBe(true);
    await cache.getOrLoad("c", 1000, async () => "c").value;

    expect(cache.size).toBe(2);
    expect(cache.getOrLoad("a", 1000, async () => "a3").hit).toBe(true);
    expect(cache.getOrLoad("b", 1000, async () => "b2").hit).toBe(false);
  });

  it("clear() drops every entry", async () => {
    const cache = new ResponseCache();
    await cache.getOrLoad("k", 1000, async () => "v").value;
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.getOrLoad("k", 1000, async () => "v").hit).toBe(false);
  });
});
