/**
 * Tests for the SlidingWindowRateLimiter.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SlidingWindowRateLimiter } from "../../src/api/rate-limiter.js";

describe("SlidingWindowRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves immediately under the limit", async () => {
    const limiter = new SlidingWindowRateLimiter({ maxRequests: 3, windowMs: 1000 });
    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire();
    // If we got here, 3 acquires resolved synchronously-ish (no timers fired).
    expect(vi.getTimerCount()).toBe(0);
  });

  it("queues the 4th acquire past a window of 3 and releases it after the window", async () => {
    const limiter = new SlidingWindowRateLimiter({ maxRequests: 3, windowMs: 1000 });

    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire();

    let resolved = false;
    const pending = limiter.acquire().then(() => {
      resolved = true;
    });

    // Flush microtasks; resolved should still be false (we're over limit).
    await Promise.resolve();
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1000);
    await pending;
    expect(resolved).toBe(true);
  });

  it("serves queued acquires in FIFO order", async () => {
    const limiter = new SlidingWindowRateLimiter({ maxRequests: 1, windowMs: 500 });

    await limiter.acquire(); // consumes the slot

    const order: number[] = [];
    const p1 = limiter.acquire().then(() => order.push(1));
    const p2 = limiter.acquire().then(() => order.push(2));
    const p3 = limiter.acquire().then(() => order.push(3));

    await vi.advanceTimersByTimeAsync(500);
    await p1;
    await vi.advanceTimersByTimeAsync(500);
    await p2;
    await vi.advanceTimersByTimeAsync(500);
    await p3;

    expect(order).toEqual([1, 2, 3]);
  });

  it("allows new acquires after the window expires", async () => {
    const limiter = new SlidingWindowRateLimiter({ maxRequests: 2, windowMs: 1000 });

    await limiter.acquire();
    await limiter.acquire();

    // Advance past the window; the old timestamps should be pruned.
    await vi.advanceTimersByTimeAsync(1001);

    // These should resolve immediately again.
    let count = 0;
    await limiter.acquire().then(() => count++);
    await limiter.acquire().then(() => count++);
    expect(count).toBe(2);
  });

  it("uses an injected clock and survives concurrent acquires", async () => {
    let nowValue = 0;
    const limiter = new SlidingWindowRateLimiter({
      maxRequests: 2,
      windowMs: 1000,
      now: () => nowValue,
    });

    // Two immediate slots consumed at t=0.
    await limiter.acquire();
    await limiter.acquire();

    // Two more requests queue up.
    const order: string[] = [];
    const pA = limiter.acquire().then(() => order.push("A"));
    const pB = limiter.acquire().then(() => order.push("B"));

    // Advance clock past the window; fire timers.
    nowValue = 1001;
    await vi.advanceTimersByTimeAsync(1001);

    await pA;
    await pB;
    expect(order).toEqual(["A", "B"]);
  });
});
