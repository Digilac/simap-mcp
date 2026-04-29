#!/usr/bin/env node
// Sync the version from package.json into server.json (root + packages[0].version).
// changesets only knows about package.json — this script keeps the MCP Registry
// manifest in lockstep so the npm package and the registry entry never drift.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const serverPath = resolve(root, "server.json");
const server = JSON.parse(readFileSync(serverPath, "utf8"));

const target = pkg.version;
let changed = false;

if (server.version !== target) {
  server.version = target;
  changed = true;
}

const firstPkg = server.packages?.[0];
if (!firstPkg) {
  throw new Error("server.json: expected packages[0] to exist");
}
if (firstPkg.version !== target) {
  firstPkg.version = target;
  changed = true;
}

if (changed) {
  writeFileSync(serverPath, JSON.stringify(server, null, 2) + "\n");
  console.log(`server.json synced to ${target}`);
} else {
  console.log(`server.json already at ${target}`);
}
