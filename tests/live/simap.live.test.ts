/**
 * Live smoke tests: every tool, once, against the real simap API.
 *
 * simap changes its responses without notice (new enum values, new fields).
 * The unit tests run on captured payloads, so they stay green when that
 * happens and users find out first. These run on a schedule
 * (`.github/workflows/live-smoke.yml`) and with `npm run test:live`, and fail
 * as soon as a tool can no longer read what simap returns.
 *
 * They are not part of `npm test`: they need the network and depend on a
 * third party. They only assert the shape of the output, never its content.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@prefecthq/fastmcp-ts/client";
import { createServer } from "../../src/server.js";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

let client: Client;

/** Calls a tool and returns its text; fails the test on an error result. */
async function call(tool: string, args: Record<string, unknown> = {}): Promise<string> {
  const result = await client.callToolRaw(tool, args);
  const [block] = result.content;
  if (block?.type !== "text") throw new Error(`${tool}: expected a text content block`);
  expect(result.isError, `${tool} returned an error:\n${block.text}`).not.toBe(true);
  return block.text;
}

/** `YYYY-MM-DD`, `days` days before today. */
function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

beforeAll(async () => {
  client = await Client.connect(createServer());
});

afterAll(async () => {
  await client.close();
});

describe("reference data", () => {
  it("list_cantons", async () => {
    expect(await call("list_cantons")).toContain("| ZH |");
  });

  it("list_institutions", async () => {
    expect(await call("list_institutions")).toMatch(/\S/);
  });

  it("search_proc_offices", async () => {
    expect(await call("search_proc_offices", { search: "Zürich" })).toMatch(/\S/);
  });
});

describe.each(["cpv", "bkp", "npk", "oag"])("%s codes", (key) => {
  it(`search_${key}_codes`, async () => {
    const text = await call(`search_${key}_codes`, { query: "bau", lang: "de" });
    expect(text).toMatch(/\d+ result\(s\) found|No [A-Z]+ codes found/);
  });

  it(`browse_${key}_tree`, async () => {
    const text = await call(`browse_${key}_tree`);
    expect(text).toMatch(/\d+ category\(ies\) found/);
  });
});

describe("tenders", () => {
  let projectId: string | undefined;
  let publicationId: string | undefined;

  it("search_tenders", async () => {
    const text = await call("search_tenders", { publicationFrom: daysAgo(14) });
    expect(text).toMatch(/\d+ result\(s\)/);
    projectId = /\*\*Project ID:\*\* (\S+)/.exec(text)?.[1];
    publicationId = /\*\*Publication ID:\*\* (\S+)/.exec(text)?.[1];
    expect(projectId, "no project in the last 14 days").toMatch(UUID);
    expect(publicationId).toMatch(UUID);
  });

  it("get_tender_details", async ({ skip }) => {
    if (!projectId) skip();
    expect(await call("get_tender_details", { projectId })).toContain("simap Link");
  });

  it("get_publication_history", async ({ skip }) => {
    if (!publicationId) skip();
    expect(await call("get_publication_history", { publicationId })).toMatch(/\S/);
  });
});
