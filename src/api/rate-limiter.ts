/**
 * Sliding-window rate limiter with FIFO queue.
 *
 * Replaces the previous busy-wait loop which, under concurrent calls,
 * could pile up setTimeout handles and serve callers out of order.
 *
 * Guarantees:
 *   - At most `maxRequests` acquires resolve within any `windowMs` period.
 *   - Callers are served strictly in FIFO order.
 *   - At most one scheduled timer is outstanding at any time.
 */

export interface RateLimiterOptions {
  /** Max number of acquires per sliding window. */
  maxRequests: number;
  /** Window size in ms. */
  windowMs: number;
  /** Injectable clock (for tests). */
  now?: () => number;
}

const DEFAULT_OPTIONS: Required<Pick<RateLimiterOptions, "maxRequests" | "windowMs">> = {
  maxRequests: 60,
  windowMs: 60_000,
};

export class SlidingWindowRateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private timestamps: number[] = [];
  private queue: Array<() => void> = [];
  private scheduled = false;

  constructor(opts: Partial<RateLimiterOptions> = {}) {
    this.maxRequests = opts.maxRequests ?? DEFAULT_OPTIONS.maxRequests;
    this.windowMs = opts.windowMs ?? DEFAULT_OPTIONS.windowMs;
    this.now = opts.now ?? (() => Date.now());

    if (!Number.isFinite(this.maxRequests) || this.maxRequests <= 0) {
      throw new Error(
        `SlidingWindowRateLimiter: maxRequests must be a positive finite number (got ${this.maxRequests})`
      );
    }
    if (!Number.isFinite(this.windowMs) || this.windowMs <= 0) {
      throw new Error(
        `SlidingWindowRateLimiter: windowMs must be a positive finite number (got ${this.windowMs})`
      );
    }
  }

  /**
   * Waits until a slot is available, then records it and resolves.
   * Concurrent callers are served FIFO.
   */
  acquire(): Promise<void> {
    this.prune();
    if (this.queue.length === 0 && this.timestamps.length < this.maxRequests) {
      this.timestamps.push(this.now());
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
      this.scheduleDrain();
    });
  }

  /** Drops timestamps older than the window. */
  private prune(): void {
    const cutoff = this.now() - this.windowMs;
    // Timestamps are pushed in chronological order, so shift from the front.
    while (this.timestamps.length > 0 && this.timestamps[0] <= cutoff) {
      this.timestamps.shift();
    }
  }

  /**
   * Ensures exactly one timer is outstanding. On fire, drains as many
   * queued callers as free slots allow, then reschedules if needed.
   */
  private scheduleDrain(): void {
    if (this.scheduled || this.queue.length === 0) return;

    this.prune();
    const delay =
      this.timestamps.length < this.maxRequests
        ? 0
        : Math.max(0, this.timestamps[0] + this.windowMs - this.now());

    this.scheduled = true;
    const timer = setTimeout(() => {
      this.scheduled = false;
      this.drain();
    }, delay);
    // Don't keep the Node event loop alive just for a pending rate-limit timer.
    timer.unref?.();
  }

  private drain(): void {
    this.prune();
    while (this.timestamps.length < this.maxRequests && this.queue.length > 0) {
      const resolve = this.queue.shift()!;
      this.timestamps.push(this.now());
      resolve();
    }
    if (this.queue.length > 0) {
      this.scheduleDrain();
    }
  }
}
