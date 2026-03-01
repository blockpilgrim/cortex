# Code Review — 2026-03-01 (Refactoring)

## Summary

This review covers the refactoring commit `1ff9ba5` ("Refactor: deduplicate PROVIDERS constant, ResizeObserver stub, Dexie cleanup, and fix barrel import"), which implements four deduplication/cleanup tasks across 18 files. The changes are clean, well-scoped, and correct. All 394 tests pass, ESLint reports zero new issues, and imports have been properly cleaned up. The PROVIDERS constant derivation is sound, the test utility extractions are correctly applied, and the barrel import fix follows the established convention. There are three minor items to address: the `db-helpers` migration was not applied to the 3 data-layer test files, CONVENTIONS.md was not updated to document the new test utilities, and the PROVIDERS constant is not yet mentioned in the Model & Provider Constants convention entry.

## Files Reviewed

- `src/lib/models.ts` — new PROVIDERS export
- `src/test/setup.ts` — ResizeObserverStub addition
- `src/test/db-helpers.ts` — new Dexie test utility file
- `src/hooks/useProviderChat.ts` — barrel import fix
- `src/components/SettingsDialog.tsx` — PROVIDERS import, removed local constant
- `src/components/UsageSummary.tsx` — PROVIDERS import, removed local constant
- `src/lib/export.ts` — PROVIDERS import, removed local constant
- `src/lib/crossfeed.ts` — PROVIDERS import, removed inline array
- `src/App.tsx` — PROVIDERS import, removed inline `const providers`
- `src/lib/models.test.ts` — PROVIDERS import used in iteration tests
- `src/App.test.tsx` — db-helpers import
- `src/hooks/useProviderChat.test.ts` — db-helpers import
- `src/components/ModelColumn.test.tsx` — db-helpers import, removed `db` import
- `src/components/InputBar.test.tsx` — db-helpers import, removed `db` import
- `src/components/UsageSummary.test.tsx` — db-helpers import, removed `db` import
- `src/components/ConversationSidebar.test.tsx` — db-helpers import, removed ResizeObserverStub
- `src/components/SettingsDialog.test.tsx` — db-helpers import, removed ResizeObserverStub
- `src/components/ConversationSearch.test.tsx` — removed ResizeObserverStub only

## Critical (Must Fix)

None.

## Warnings (Should Fix)

- [ ] **Three data-layer test files still have inline Dexie cleanup** — `src/lib/db/conversations.test.ts:27-33`, `src/lib/db/messages.test.ts:29-35`, `src/lib/db/settings.test.ts:13-19` all still have manual `db.conversations.clear()` / `db.messages.clear()` / `db.settings.clear()` / `db.delete()` instead of using the new `clearAllTables()` and `deleteDatabase()` helpers from `@/test/db-helpers`. These files were presumably missed during the refactoring sweep. Applying the same pattern completes the deduplication. Note: these files import from `@/lib/db/schema` (internal path) rather than `@/lib/db` (barrel), so they may have been intentionally skipped as "data-layer internal" tests, but using the shared helpers would still be appropriate since `db-helpers.ts` imports from `@/lib/db` which re-exports the same singleton.

- [ ] **CONVENTIONS.md not updated with new test utility patterns** — The refactoring introduces two new shared test utilities (`@/test/db-helpers` and the centralized ResizeObserverStub in `setup.ts`) but CONVENTIONS.md was not updated to document them. Per the Compound Engineering Protocol, new patterns that should be replicated need to be added. Specifically:
  - The "Testing Conventions" section should mention `clearAllTables()` / `deleteDatabase()` from `@/test/db-helpers` for Dexie test cleanup
  - The "Testing with Radix Overlays" section already mentions the ResizeObserverStub pattern but should note that it now lives in `src/test/setup.ts` (globally available, no per-file polyfill needed)
  - The "Model & Provider Constants" section should mention `PROVIDERS` alongside `MODEL_OPTIONS`, `DEFAULT_MODELS`, etc.

## Suggestions (Consider)

- [ ] **PROVIDERS could use `Object.freeze()`** — `PROVIDERS` is derived via `Object.keys(MODEL_OPTIONS) as Provider[]`, which creates a mutable array. While no code currently mutates it, adding `Object.freeze()` (or using `as const` with a readonly type) would provide a compile-time and runtime guard against accidental mutation. Example: `export const PROVIDERS: readonly Provider[] = Object.freeze(Object.keys(MODEL_OPTIONS) as Provider[])`. This is a minor defensive measure and not required.

- [ ] **`clearAllTables()` could be made schema-resilient** — The current implementation manually lists all 3 tables. If a new table is added to the Dexie schema, `clearAllTables()` will silently skip it. An alternative approach would be to iterate `db.tables.forEach(t => t.clear())` to automatically cover all tables. This trades explicitness for resilience. Either approach is reasonable; documenting the manual approach's maintenance requirement is sufficient.

- [ ] **`PROVIDERS` test coverage** — The `models.test.ts` file uses `PROVIDERS` in iteration (`for (const provider of PROVIDERS)`) but does not have a dedicated test asserting `PROVIDERS` contains exactly `['claude', 'chatgpt', 'gemini']` and has length 3. The existing `PROVIDER_LABELS` test asserts "has exactly three entries" which provides indirect coverage, but a direct assertion on PROVIDERS would be clearer. This is low priority since any change to MODEL_OPTIONS would also break multiple other tests.

## Convention Compliance

- **Import aliases**: All new imports use `@/` alias correctly. The barrel import fix (`@/lib/db` instead of `@/lib/db/settings`) directly follows the "Import from `@/lib/db` for all data layer access" convention.
- **Surgical changes**: Unused imports (`db` from `@/lib/db`) were properly removed in `ModelColumn.test.tsx`, `InputBar.test.tsx`, and `UsageSummary.test.tsx`. Files that still use `db` for assertions correctly retained the import.
- **Co-located tests**: No structural changes to test file locations. The new `src/test/db-helpers.ts` correctly lives in the shared test utilities directory alongside `setup.ts`.
- **Compound Engineering Protocol**: Not fully followed -- CONVENTIONS.md was not updated with the new patterns (see Warning above).

## Patterns to Document

The following patterns should be added to CONVENTIONS.md:

1. **Dexie Test Cleanup Helpers** (`@/test/db-helpers`): Document `clearAllTables()` for `beforeEach` and `deleteDatabase()` for `afterAll` as the standard way to handle IndexedDB cleanup in tests. This replaces the previous pattern of inline `db.conversations.clear(); db.messages.clear(); db.settings.clear()`.

2. **PROVIDERS constant**: Add `PROVIDERS` to the "Model & Provider Constants" convention entry, noting it is derived from `MODEL_OPTIONS` keys and should be used instead of hardcoding `['claude', 'chatgpt', 'gemini']` arrays.

3. **ResizeObserverStub centralization**: Update the "Testing with Radix Overlays" section to note that the ResizeObserverStub polyfill is now globally applied in `src/test/setup.ts` and individual test files should NOT define their own.
