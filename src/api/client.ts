/**
 * HTTP client for SIMAP API.
 */

import { type ZodType } from "zod";
import { SIMAP_API_BASE } from "./endpoints.js";
import { SimapApiError } from "../types/api.js";

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
  private requestTimestamps: number[] = [];
  private readonly maxRequestsPerMinute = 60;

  constructor(baseUrl: string = SIMAP_API_BASE) {
    this.baseUrl = baseUrl;
  }

  /**
   * Simple sliding window rate limiter.
   */
  private async checkRateLimit(): Promise<void> {
    let now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter((t) => now - t < 60000);
    while (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
      const waitTime = 60000 - (now - this.requestTimestamps[0]);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      now = Date.now();
      this.requestTimestamps = this.requestTimestamps.filter((t) => now - t < 60000);
    }
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Performs a GET request to the SIMAP API.
   */
  async get<T>(endpoint: string, options: RequestOptions<T> = {}): Promise<T> {
    await this.checkRateLimit();

    const url = this.buildUrl(endpoint, options.params);

    console.error(`[${new Date().toISOString()}] GET ${endpoint}`);

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

      const json = await response.json();
      if (options.schema) {
        return options.schema.parse(json);
      }
      return json as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Builds a URL with query parameters.
   */
  private buildUrl(
    endpoint: string,
    params?: Record<string, string | string[] | undefined>
  ): string {
    const url = new URL(this.baseUrl);
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
}

/**
 * Default SIMAP client instance.
 */
export const simap = new SimapClient();
