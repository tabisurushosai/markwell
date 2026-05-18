import { z } from 'zod';

import { kvGet, kvSet } from './kv.js';

export const SCHEMA_VERSION_KEY = 'markwell:schema_version';
export const CURRENT_SCHEMA_VERSION = 1;

const SchemaVersionSchema = z.number().int().nonnegative();

type MigrationStep = {
  from: number;
  to: number;
  run: () => Promise<void>;
};

/**
 * Registered migrations run in order during `runMigrations`.
 * v0→v1: no-op (establishes spec v1.0 data model baseline).
 * v1→v2+: add steps here (e.g. migrations/v1_to_v2.ts) when schema evolves.
 */
const MIGRATIONS: readonly MigrationStep[] = [
  {
    from: 0,
    to: 1,
    run: async (): Promise<void> => {
      // v1 = markwell_spec v1.0 — no structural changes on first install.
    },
  },
];

async function setSchemaVersion(version: number): Promise<void> {
  await kvSet(SCHEMA_VERSION_KEY, version, SchemaVersionSchema);
}

export async function getSchemaVersion(): Promise<number> {
  const stored = await kvGet(SCHEMA_VERSION_KEY, SchemaVersionSchema);
  return stored ?? 0;
}

export async function runMigrations(): Promise<void> {
  let version = await getSchemaVersion();

  while (version < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS.find((migration) => migration.from === version);
    if (step === undefined) {
      throw new Error(`Missing migration from schema version ${String(version)}`);
    }

    await step.run();
    version = step.to;
    await setSchemaVersion(version);
  }
}
