/**
 * HTTP client for simap API.
 */

import { type ZodType } from "zod";
import { SIMAP_API_BASE } from "./endpoints.js";
import { SimapApiError } from "../types/api.js";
import { SlidingWindowRateLimiter } from "./rate-limiter.js";
import { ResponseCache } from "./response-cache.js";

/**
 * TTL for reference data (cantons, institutions, CPV/BKP/NPK/OAG codes),
 * which changes rarely. Passed as `cacheTtlMs` by the tools that read it.
 */
export const REFERENCE_DATA_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * When SIMAP_MCP_DEBUG=1 (or "true") is set, the client emits extra info
 * (full URL, response status, size, duration) to stderr. Off by default so
 * user-supplied search terms are not written to logs in production.
 */
function isDebugEnabled(): boolean {
  const v = process.env.SIMAP_MCP_DEBUG;
  return v === "1" || v === "true";
}

/**
 * Request options for the simap client.
 */
export interface RequestOptions<T = unknown> {
  params?: Record<string, string | string[] | undefined>;
  timeout?: number;
  schema?: ZodType<T>;
  /**
   * When set, the validated response is cached in memory for this many
   * milliseconds, keyed by the full URL. Cache hits skip the rate limiter
   * and the network. Errors are never cached. Leave unset for live data.
   */
  cacheTtlMs?: number;
}

/**
 * Retry policy for transient failures (HTTP 408 / 429 / 5xx and network
 * errors raised by `fetch` itself). Only GET requests are issued, so every
 * request is idempotent and safe to replay.
 */
export interface RetryOptions {
  /** Extra attempts after the first one. 0 disables retries. Default: 2. */
  retries: number;
  /** Delay before the first retry; doubles on each subsequent retry. Default: 500 ms. */
  baseDelayMs: number;
  /** Upper bound for a single delay, including a server `Retry-After`. Default: 5000 ms. */
  maxDelayMs: number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  retries: 2,
  baseDelayMs: 500,
  maxDelayMs: 5000,
};

/** HTTP statuses worth retrying: request timeout, too many requests, server errors. */
export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status < 600);
}

/**
 * Exponential backoff with "equal jitter": half of the exponential delay is
 * fixed, the other half random, so concurrent retries don't fire in lockstep.
 * `retryIndex` is 0 for the first retry.
 */
export function computeBackoffDelay(
  retryIndex: number,
  options: Pick<RetryOptions, "baseDelayMs" | "maxDelayMs">,
  random: () => number = Math.random
): number {
  const exp = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** retryIndex);
  return Math.round(exp / 2 + random() * (exp / 2));
}

/**
 * Parses a `Retry-After` header (delta-seconds or HTTP date) into
 * milliseconds. Returns undefined when absent or unparseable.
 */
export function parseRetryAfter(
  header: string | null,
  now: number = Date.now()
): number | undefined {
  if (header === null) return undefined;
  const trimmed = header.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - now);
}

/**
 * Error raised by `fetch` itself (DNS, connection refused/reset, TLS…), as
 * opposed to an HTTP error status or our own timeout. Internal marker used to
 * decide whether to retry; the original error is rethrown to callers.
 */
class TransientNetworkError extends Error {
  constructor(public readonly original: unknown) {
    super("transient network error");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * simap API client.
 */
export class SimapClient {
  private readonly baseUrl: string;
  private readonly rateLimiter: SlidingWindowRateLimiter;
  private readonly retry: RetryOptions;
  private readonly cache: ResponseCache;

  constructor(
    baseUrl: string = SIMAP_API_BASE,
    rateLimiter: SlidingWindowRateLimiter = new SlidingWindowRateLimiter(),
    retry: Partial<RetryOptions> = {},
    cache: ResponseCache = new ResponseCache()
  ) {
    this.baseUrl = baseUrl;
    this.rateLimiter = rateLimiter;
    this.retry = { ...DEFAULT_RETRY_OPTIONS, ...retry };
    this.cache = cache;
  }

  /**
   * Performs a GET request to the simap API. When `cacheTtlMs` is set, a
   * cached response is returned without touching the rate limiter or the
   * network; otherwise (and on a cache miss) the request goes through
   * `getWithRetry()`, and only its final successful result is cached.
   */
  async get<T>(endpoint: string, options: RequestOptions<T> = {}): Promise<T> {
    const url = buildUrl(this.baseUrl, endpoint, options.params);

    if (options.cacheTtlMs === undefined || options.cacheTtlMs <= 0) {
      return this.getWithRetry(endpoint, url, options);
    }

    const { value, hit } = this.cache.getOrLoad(url, options.cacheTtlMs, () =>
      this.getWithRetry(endpoint, url, options)
    );
    if (hit) {
      if (isDebugEnabled()) {
        console.error(
          `[${new Date().toISOString()}] GET ${endpoint} → ${url} (cache hit)`
        );
      } else {
        console.error(`[${new Date().toISOString()}] GET ${endpoint} (cache hit)`);
      }
    }
    return value;
  }

  /**
   * Retries transient failures (HTTP 408 / 429 / 5xx, network errors) with
   * exponential backoff. Our own timeout is not retried, so a hung upstream
   * can't stall a tool call for several timeout periods. Each attempt goes
   * through the rate limiter.
   */
  private async getWithRetry<T>(
    endpoint: string,
    url: string,
    options: RequestOptions<T>
  ): Promise<T> {
    const maxAttempts = this.retry.retries + 1;

    for (let attempt = 1; ; attempt++) {
      try {
        return await this.attempt(endpoint, url, options);
      } catch (err) {
        const original = err instanceof TransientNetworkError ? err.original : err;
        const delay = this.retryDelay(err, attempt - 1);
        if (attempt >= maxAttempts || delay === undefined) {
          throw original;
        }
        const reason =
          err instanceof SimapApiError ? `HTTP ${err.statusCode}` : "network error";
        console.error(
          `  ↻ retrying GET ${endpoint} in ${delay}ms after ${reason} (attempt ${attempt + 1}/${maxAttempts})`
        );
        await sleep(delay);
      }
    }
  }

  /**
   * Returns the delay before the next retry, or undefined if `err` is not
   * retryable. A server-provided `Retry-After` wins over the computed backoff
   * (both capped at `maxDelayMs`).
   */
  private retryDelay(err: unknown, retryIndex: number): number | undefined {
    if (err instanceof TransientNetworkError) {
      return computeBackoffDelay(retryIndex, this.retry);
    }
    if (err instanceof SimapApiError && isRetryableStatus(err.statusCode)) {
      const retryAfter = err.retryAfterMs;
      if (retryAfter !== undefined) return Math.min(retryAfter, this.retry.maxDelayMs);
      return computeBackoffDelay(retryIndex, this.retry);
    }
    return undefined;
  }

  /**
   * One HTTP round-trip: rate-limit, fetch, map errors, parse and validate.
   */
  private async attempt<T>(
    endpoint: string,
    url: string,
    options: RequestOptions<T>
  ): Promise<T> {
    await this.rateLimiter.acquire();

    const debug = isDebugEnabled();
    const startedAt = Date.now();

    if (debug) {
      console.error(`[${new Date().toISOString()}] GET ${endpoint} → ${url}`);
    } else {
      console.error(`[${new Date().toISOString()}] GET ${endpoint}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? 30000);

    try {
      let response: Response;
      try {
        response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });
      } catch (err) {
        // Our own timeout fired: not retried (see get()).
        if (controller.signal.aborted) throw err;
        throw new TransientNetworkError(err);
      }

      if (!response.ok) {
        // Release the connection before a possible retry.
        await response.body?.cancel().catch(() => {});
        throw new SimapApiError(
          `API Error: ${response.status} ${response.statusText}`,
          response.status,
          endpoint,
          parseRetryAfter(response.headers.get("retry-after"))
        );
      }

      let json: unknown;
      if (debug) {
        const text = await response.text();
        const ms = Date.now() - startedAt;
        const bytes = Buffer.byteLength(text, "utf8");
        console.error(
          `  ← ${response.status} ${response.statusText} · ${bytes} bytes · ${ms}ms`
        );
        json = JSON.parse(text);
      } else {
        json = await response.json();
      }

      if (options.schema) {
        return options.schema.parse(json);
      }
      return json as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Builds a URL with query parameters. Array values are emitted as repeated
 * `?key=v1&key=v2` pairs; undefined values are skipped.
 *
 * Exported (not a private method) so it can be unit-tested directly.
 */
export function buildUrl(
  baseUrl: string,
  endpoint: string,
  params?: Record<string, string | string[] | undefined>
): string {
  const url = new URL(baseUrl);
  url.pathname = url.pathname.replace(/\/$/, "") + endpoint;

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) {
          url.searchParams.append(key, v);
        }
      } else {
        url.searchParams.append(key, value);
      }
    }
  }

  return url.toString();
}

/**
 * Default simap client instance.
 */
export const simap = new SimapClient();
