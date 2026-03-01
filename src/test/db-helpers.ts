/**
 * Shared Dexie test helpers.
 *
 * Eliminates duplicated cleanup boilerplate across test files.
 * Use `clearAllTables()` in `beforeEach` and `deleteDatabase()` in `afterAll`.
 */

import { db } from '@/lib/db'

/** Clear all Dexie tables (conversations, messages, settings). */
export async function clearAllTables(): Promise<void> {
  await db.conversations.clear()
  await db.messages.clear()
  await db.settings.clear()
}

/** Delete the entire Dexie database (use in afterAll for clean teardown). */
export async function deleteDatabase(): Promise<void> {
  await db.delete()
}
