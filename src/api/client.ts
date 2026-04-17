/**
 * HTTP client for SIMAP API.
 */

import { type ZodType } from "zod";
import { SIMAP_API_BASE } from "./endpoints.js";
import { SimapApiError } from "../types/api.js";
import { SlidingWindowRateLimiter } from "./rate-limiter.js";

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
 * Request options for the SIMAP client.
 */
export interface RequestOptions<T = unknown> {
  params?: Record<string, string | string[] | undefined>;
  timeout?: number;
  schema?: ZodType<T>;
}

/**
 * SIMAP API client.
 */
export class SimapClient {
  private readonly baseUrl: string;
  private readonly rateLimiter: SlidingWindowRateLimiter;

  constructor(
    baseUrl: string = SIMAP_API_BASE,
    rateLimiter: SlidingWindowRateLimiter = new SlidingWindowRateLimiter()
  ) {
    this.baseUrl = baseUrl;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Performs a GET request to the SIMAP API.
   */
  async get<T>(endpoint: string, options: RequestOptions<T> = {}): Promise<T> {
    await this.rateLimiter.acquire();

    const url = buildUrl(this.baseUrl, endpoint, options.params);
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
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new SimapApiError(
          `API Error: ${response.status} ${response.statusText}`,
          response.status,
          endpoint
        );
      }

      let json: unknown;
      if (debug) {
        const text = await response.text();
        const ms = Date.now() - startedAt;
        console.error(
          `  ← ${response.status} ${response.statusText} · ${text.length} bytes · ${ms}ms`
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
 * Default SIMAP client instance.
 */
export const simap = new SimapClient();
