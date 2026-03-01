/**
 * Shared Dexie test helpers.
 *
 * Eliminates duplicated cleanup boilerplate across test files.
 * Use `clearAllTables()` in `beforeEach` and `deleteDatabase()` in `afterAll`.
 */

import { db } from '@/lib/db'

/** Clear all Dexie tables. Iterates db.tables so new tables are covered automatically. */
export async function clearAllTables(): Promise<void> {
  await Promise.all(db.tables.map((t) => t.clear()))
}

/** Delete the entire Dexie database (use in afterAll for clean teardown). */
export async function deleteDatabase(): Promise<void> {
  await db.delete()
}
