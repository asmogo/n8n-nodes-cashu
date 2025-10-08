import { Manager, type Repositories } from "coco-cashu-core";
import {
  SqliteRepositories,
  type SqliteRepositoriesOptions,
} from "coco-cashu-sqlite3";

import type { Logger } from "coco-cashu-core";

import * as bip39 from "bip39";

// Simple manager cache keyed by credential id
const managerCache = new Map<string, Manager>();

export interface ManagerOptions {
  seed: string;
  /**
   * Provide a SQLite DatabaseLike implementation (e.g. from better-sqlite3/sqlite3)
   * or pass a preconstructed SqliteRepositoriesOptions. If omitted we fallback to in‑memory repositories.
   */
  sqlite?:
    | SqliteRepositoriesOptions
    | { database: SqliteRepositoriesOptions["database"] };
  wsUrl?: string;
  logger?: Logger;
}

/**
 * Parse seed as 64-byte hex or BIP39 mnemonic to 64 bytes.
 */
function parseSeed(seed: string): Promise<Uint8Array> {
  // Accept 64-byte hex or BIP39 mnemonic
  const hex = seed.replace(/^0x/, "").toLowerCase();
  if (/^[0-9a-f]{128}$/i.test(hex)) {
    const bytes = new Uint8Array(64);
    for (let i = 0; i < 64; i++)
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return Promise.resolve(bytes);
  }
  // treat as mnemonic
  if (!bip39.validateMnemonic(seed))
    throw new Error(
      "Invalid seed: must be 64-byte hex or valid BIP39 mnemonic",
    );
  const seedBuf = bip39.mnemonicToSeedSync(seed); // 64 bytes
  return Promise.resolve(new Uint8Array(seedBuf.subarray(0, 64)));
}

/**
 * Build Repositories based on provided options.
 * - If options.sqlite is provided, instantiate SqliteRepositories and init schema.
 * - Otherwise, fallback to in-memory repositories for ephemeral use.
 */
async function buildRepositories(
  options: ManagerOptions,
): Promise<Repositories> {
  if (options.sqlite) {
    const sqliteOpts: SqliteRepositoriesOptions =
      "database" in options.sqlite
        ? { database: options.sqlite.database }
        : options.sqlite;
    const repos = new SqliteRepositories(sqliteOpts);
    await repos.init(); // ensure schema
    return repos;
  }
  // Lazy import MemoryRepositories only when needed to keep sqlite-focused path light
  const { MemoryRepositories } = await import("coco-cashu-core");
  return new MemoryRepositories();
}

export async function getManager(cacheKey: string, options: ManagerOptions) {
  let mgr = managerCache.get(cacheKey);
  if (mgr) return mgr;

  const repositories = await buildRepositories(options);
  const seedGetter = () => parseSeed(options.seed);

  mgr = new Manager(repositories, seedGetter, options.logger);
  managerCache.set(cacheKey, mgr);

  // Restore wallet state for this cache key; fire and forget
  void mgr.wallet.restore(cacheKey);
  return mgr;
}
