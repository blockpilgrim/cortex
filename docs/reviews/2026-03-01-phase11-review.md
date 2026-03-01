# Code Review — 2026-03-01 (Phase 11: Export)

## Summary

Phase 11 implements conversation export as JSON and Markdown files. The implementation follows the project's established conventions well: pure functions for data transformation in `src/lib/export.ts`, a thin download utility in `src/lib/download.ts`, and an `ExportMenu` component that orchestrates lazy-loaded exports. The code is clean, well-documented, and correctly avoids any delete/write operations on local data (critical safety requirement). Test coverage for the pure functions is thorough. There are a few warnings around error UX, stale closures, memory safety for very large exports, and a missing component-level test file, but no critical blockers.

## Files Reviewed
- `src/lib/export.ts` — Pure export serialization functions
- `src/lib/download.ts` — Browser download trigger utility
- `src/components/ExportMenu.tsx` — Dropdown menu UI and orchestration
- `src/components/ui/dropdown-menu.tsx` — shadcn/ui DropdownMenu primitive
- `src/components/TopBar.tsx` — ExportMenu integration
- `src/lib/export.test.ts` — Tests for export serialization
- `src/lib/download.test.ts` — Tests for download utility
- `CONVENTIONS.md` — New patterns added
- `docs/IMPLEMENTATION-PLAN.md` — Phase 11 marked complete

## Critical (Must Fix)

No critical issues found.

## Warnings (Should Fix)

- [ ] **Stale closure risk on `activeConversationId` in `handleExport`** — `src/components/ExportMenu.tsx:78-108` — The `handleExport` callback captures `activeConversationId` in its closure (line 108: `[activeConversationId]`). Because `performExport` is async and involves dynamic imports + Dexie reads, the user could theoretically switch conversations between clicking the menu item and the export completing. The project's own convention ("Zustand `getState()` in Event Handlers to Avoid Stale Closures" in CONVENTIONS.md) recommends using `useAppStore.getState().activeConversationId` for exactly this scenario. Suggested fix: read `activeConversationId` from `useAppStore.getState()` at the top of the handler instead of from the closure.

- [ ] **Silent failure on export errors** — `src/components/ExportMenu.tsx:102-103` — When an export fails (Dexie error, dynamic import failure, etc.), the error is only logged to the console. The user receives no visual feedback that the export failed. Since the `isExporting` state resets in `finally`, the button returns to normal as if nothing happened. Suggested fix: Add an error state (`const [error, setError] = useState<string | null>(null)`) and display it briefly, or integrate a toast/notification system if one exists. At minimum, consider adding a comment that this is a known limitation to be addressed in Phase 12 (Polish).

- [ ] **`toLocaleString()` produces non-portable Markdown output** — `src/lib/export.ts:136,156,157,190` — `new Date(msg.timestamp).toLocaleString()` produces locale-dependent output. The same export on different machines (or the same machine with different locale settings) will render timestamps differently. For a data export feature, deterministic output is preferable. Suggested fix: Use `toISOString()` for consistency, or provide a fixed format like `new Date(timestamp).toISOString().replace('T', ' ').slice(0, 19)`.

- [ ] **No component test for `ExportMenu`** — The `ExportMenu` component has no test file. While the pure functions are well-tested, the orchestration logic in `handleExport` (conditional paths for current vs. all, the lazy import, the `isExporting` state toggle, error handling) has no test coverage. The `download.test.ts` tests the download utility in isolation, and `export.test.ts` tests serialization, but the integration of these pieces in the component is untested. Suggested fix: Add `src/components/ExportMenu.test.tsx` with at least: (1) renders the export button, (2) shows "Current Conversation" section when an active conversation exists, (3) hides it when no active conversation, (4) calls the correct export functions on click (mocking `@/lib/db` and dynamic imports).

## Suggestions (Consider)

- [ ] **Memory concern for very large "Export All" operations** — `src/components/ExportMenu.tsx:94-99` — The "Export All" path loads every conversation and all their messages into memory simultaneously via `Promise.all`. For a user with hundreds of conversations containing thousands of messages, this could create a very large in-memory object. This is unlikely to be an issue for the stated single-user use case, but worth documenting as a known limitation. Consider adding a comment noting this, or in a future iteration, streaming the export or batching conversations.

- [ ] **Filename truncation could split a multi-byte boundary** — `src/lib/export.ts:59` — `sanitizeFilename` uses `.slice(0, 50)` after stripping non-ASCII characters, so this is currently safe since only `[a-z0-9\s-]` characters survive. However, if the regex is ever updated to allow Unicode characters (e.g., for internationalization), the slice could split a multi-byte character. Worth a brief comment noting the assumption.

- [ ] **Consider `aria-busy` on the trigger button during export** — `src/components/ExportMenu.tsx:116-122` — The button is `disabled` during export, which is good. Adding `aria-busy={isExporting}` would provide additional context to screen readers that an operation is in progress.

- [ ] **Duplicate provider tag in interleaved timeline for assistant messages** — `src/lib/export.ts:187-191` — For assistant messages in the interleaved timeline, the output renders both the provider name as the bold label AND a `[ProviderName]` bracket tag. For example: `**Claude** [Claude] _timestamp_`. This is redundant. In the per-provider sections (line 132), the assistant label correctly uses just the provider name. Consider removing the `providerTag` for assistant messages in the timeline section since the bold label already identifies the provider, or alternatively, use "Assistant" as the bold label and keep the bracket tag for disambiguation.

- [ ] **Early return in `handleExport` skips `finally` block's `setIsExporting(false)`** — `src/components/ExportMenu.tsx:83,86` — The early returns at lines 83 and 86 (inside the `try` block) will still execute the `finally` block, so `setIsExporting(false)` does run. However, note that `setIsExporting(true)` is called at line 80 before the early return checks. This means a brief flash of the disabled state even when there is nothing to export. Consider moving `setIsExporting(true)` after the validation checks, or moving the validation before the `try` block.

## Convention Compliance

**Compliant areas:**
- Pure functions for data transformation (matches `crossfeed.ts`, `pricing.ts` pattern) -- correctly documented in CONVENTIONS.md
- Lazy-loaded feature modules via dynamic import (new pattern correctly added to CONVENTIONS.md)
- Import aliases (`@/`) used consistently throughout
- `src/components/ui/dropdown-menu.tsx` is standard shadcn/ui generated code, not hand-edited
- Files placed in correct directories per project structure convention
- Test files co-located with source code
- Semantic Tailwind tokens used (no raw colors)
- Zustand accessed with granular selectors

**Minor non-compliance:**
- The stale closure pattern for `activeConversationId` in `handleExport` does not follow the established `getState()` convention (see Warning above)
- No component test file for `ExportMenu` (testing conventions require test coverage)

## Patterns to Document

No new patterns need to be added -- the two relevant patterns ("Lazy-Loaded Feature Modules via Dynamic Import" and "Pure Functions for Data Transformation") were already added to CONVENTIONS.md as part of this phase. Both are well-written and include clear examples.
