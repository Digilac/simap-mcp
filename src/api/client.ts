/**
 * HTTP client for SIMAP API.
 */

import { SIMAP_API_BASE } from "./endpoints.js";
import { SimapApiError } from "../types/api.js";

/**
 * Request options for the SIMAP client.
 */
export interface RequestOptions {
  params?: Record<string, string | string[] | undefined>;
  timeout?: number;
}

/**
 * SIMAP API client.
 */
export class SimapClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = SIMAP_API_BASE) {
    this.baseUrl = baseUrl;
  }

  /**
   * Performs a GET request to the SIMAP API.
   */
  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(endpoint, options.params);

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

      return (await response.json()) as T;
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
    // Concatenate baseUrl and endpoint properly
    // (new URL with absolute path would replace the entire path)
    const fullUrl = this.baseUrl.replace(/\/$/, "") + endpoint;
    const url = new URL(fullUrl);

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
