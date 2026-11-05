/**
 * In-memory TTL cache for simap responses.
 *
 * Stores the pending promise rather than the resolved value so concurrent
 * callers for the same key share a single upstream request. Rejected
 * promises are evicted, so failures are never cached.
 *
 * Bounded by `maxEntries`: when full, the least recently used entry is
 * evicted (Map insertion order, refreshed on every hit).
 */

export interface ResponseCacheOptions {
  /** Maximum number of entries kept in memory. Default: 500. */
  maxEntries?: number;
  /** Clock used for expiry. Injectable for tests. Default: Date.now. */
  now?: () => number;
}

interface CacheEntry {
  value: Promise<unknown>;
  expiresAt: number;
}

export class ResponseCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(options: ResponseCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 500;
    this.now = options.now ?? Date.now;
  }

  /** Number of entries currently held (expired ones included until touched). */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Returns the cached promise for `key`, or calls `load()` and caches its
   * result for `ttlMs`. `hit` reports whether the cache served the value.
   */
  getOrLoad<T>(
    key: string,
    ttlMs: number,
    load: () => Promise<T>
  ): { value: Promise<T>; hit: boolean } {
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt > this.now()) {
      // Refresh recency for LRU eviction.
      this.entries.delete(key);
      this.entries.set(key, entry);
      return { value: entry.value as Promise<T>, hit: true };
    }
    if (entry) {
      this.entries.delete(key);
    }

    const value = load();
    const newEntry: CacheEntry = { value, expiresAt: this.now() + ttlMs };
    this.entries.set(key, newEntry);
    this.evictOverflow();

    value.catch(() => {
      // Only evict our own entry: a newer load may have replaced it.
      if (this.entries.get(key) === newEntry) {
        this.entries.delete(key);
      }
    });

    return { value, hit: false };
  }

  /** Drops every entry. */
  clear(): void {
    this.entries.clear();
  }

  private evictOverflow(): void {
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) return;
      this.entries.delete(oldest);
    }
  }
}
