# Code Review — 2026-02-28 — Phase 3: App Shell & Layout

## Summary

Phase 3 implements the Zustand store, app shell layout (TopBar, ConversationSidebar, ModelColumn, InputBar), and wires them together in App.tsx. Overall quality is **good** — the code is clean, well-structured, follows CONVENTIONS.md closely, uses semantic Tailwind tokens, proper `import type` syntax, and has solid test coverage (66 new tests across 6 files, all passing). The build succeeds at 121 KB gzipped (well under the 200 KB target) and all 140 tests pass. There are a few issues to address, mostly around uncommitted test files, a desktop sidebar visibility bug, potential XSS in message rendering (future concern), and missing accessibility attributes.

## Files Reviewed

### New Files
- `src/lib/store.ts` — Zustand store for ephemeral UI state
- `src/components/TopBar.tsx` — Top bar with title, sidebar toggle, new conversation button
- `src/components/ConversationSidebar.tsx` — Sidebar with desktop inline + mobile Sheet variants
- `src/components/ModelColumn.tsx` — Memo-wrapped model column with message display
- `src/components/InputBar.tsx` — Shared input bar with API key gating

### Modified Files
- `src/App.tsx` — Root layout wiring all components together
- `src/App.test.tsx` — Updated integration tests
- `package.json` — Added zustand and dexie-react-hooks dependencies

### Test Files (untracked)
- `src/lib/store.test.ts` (19 tests)
- `src/components/TopBar.test.tsx` (7 tests)
- `src/components/ConversationSidebar.test.tsx` (8 tests)
- `src/components/ModelColumn.test.tsx` (12 tests)
- `src/components/InputBar.test.tsx` (14 tests)

## Critical (Must Fix)

- [ ] **Test files not committed to git** — All 5 test files (`store.test.ts`, `TopBar.test.tsx`, `ConversationSidebar.test.tsx`, `ModelColumn.test.tsx`, `InputBar.test.tsx`) are untracked. They appear to have been created but never staged/committed as part of the Phase 3 commit. These must be committed so they run in CI and are preserved. — Suggested fix: `git add` and commit all test files.

- [ ] **Prettier formatting violations in 3 test files** — `ConversationSidebar.test.tsx`, `ModelColumn.test.tsx`, and `TopBar.test.tsx` fail `npm run format:check`. This would fail CI if a formatting check is enforced. — Suggested fix: Run `npm run format` before committing.

## Warnings (Should Fix)

- [ ] **Desktop sidebar closes on conversation select (unintended on desktop)** — `SidebarContent.handleSelect` calls `setSidebarOpen(false)` unconditionally. The comment says "Close sidebar on mobile after selecting," but this also closes the desktop inline sidebar. On desktop, users typically expect the sidebar to remain open after clicking a conversation. — `src/components/ConversationSidebar.tsx:74` — Suggested fix: Either check the viewport width before closing, or split the behavior so only the mobile Sheet variant auto-closes. One approach: pass an `isMobile` prop or use a media query hook, and only close when rendering in the Sheet context.

- [ ] **Desktop sidebar also closes when "New conversation" is clicked** — Same issue as above: `handleNewConversation` calls `setSidebarOpen(false)` unconditionally. On desktop, the sidebar should stay open. — `src/components/ConversationSidebar.tsx:80-81` — Suggested fix: Same approach as above — only close on mobile.

- [ ] **Sheet overlay renders on desktop when sidebar is open** — The `Sheet` component receives `open={sidebarOpen}` without any viewport guard. On desktop, when `sidebarOpen` is `true`, both the desktop `<aside>` and the mobile `<Sheet>` are mounted. The Sheet is hidden via `md:hidden` on the `SheetContent`, but the Sheet's backdrop/portal may still intercept events or affect accessibility. The test file comment at line 54-55 confirms this overlap causes pointer-event issues in testing (`pointerEventsCheck: 0` workaround). — `src/components/ConversationSidebar.tsx:43-50` — Suggested fix: Control the Sheet's `open` prop with a media query check, e.g., `open={sidebarOpen && isMobile}`, or render the Sheet component conditionally. This would also simplify the test setup.

- [ ] **ModelColumn compound index query uses string range bounds** — The query uses `''` and `'\uffff'` as range bounds for the timestamp portion of the compound index `[conversationId+provider+timestamp]`. While this works for ISO 8601 timestamps, it's a fragile pattern. If timestamp format ever changes or non-string timestamps are introduced, this silently breaks. — `src/components/ModelColumn.tsx:39-42` — Suggested fix: Use Dexie's `.where({conversationId, provider}).toArray()` or the dedicated `getMessagesByThread()` data access function from `@/lib/db` instead of duplicating query logic in the component. The data access function already exists and is tested.

- [ ] **InputBar uses `<input>` instead of `<textarea>`** — The spec mentions `Shift+Enter for newline` (Phase 12) which implies multiline input. A single-line `<input>` cannot support newlines. While this is a Phase 3 placeholder, using a `<textarea>` now would avoid a future rewrite and the `handleKeyDown` already handles Enter vs Shift+Enter. — `src/components/InputBar.tsx:57-68` — Suggested fix: Consider using a `<textarea>` (or shadcn's Textarea component) with `rows={1}` and auto-resize behavior, so multiline is supported from the start.

- [ ] **Missing `aria-describedby` on Sheet content** — Test output shows repeated warnings: `Missing Description or aria-describedby={undefined} for {DialogContent}`. This is a Radix UI accessibility warning indicating the Sheet dialog lacks a description for screen readers. — `src/components/ConversationSidebar.tsx:44-49` — Suggested fix: Add a `SheetDescription` inside the `SheetHeader`, or add `aria-describedby={undefined}` on `SheetContent` to explicitly acknowledge no description is needed (Radix accepts this as intentional suppression).

## Suggestions (Consider)

- [ ] **Use `getMessagesByThread()` from `@/lib/db` instead of inline Dexie query in ModelColumn** — The data layer already provides a `getMessagesByThread(conversationId, provider)` function that queries the same compound index. Using it in the `useLiveQuery` callback would reduce duplication and keep all query logic in the data layer. — Rationale: Follows the convention in CONVENTIONS.md ("Import from `@/lib/db` for all data layer access") and makes the component thinner.

- [ ] **Consider adding `role="navigation"` to the sidebar `<aside>`** — The desktop sidebar acts as navigation (switching between conversations). Adding `role="navigation"` or wrapping the conversation list in a `<nav>` element would improve screen reader experience. — `src/components/ConversationSidebar.tsx:37`

- [ ] **Conversation list items should use `role="option"` or be actual links** — The conversation list uses raw `<button>` elements. For a list where one item is "selected" (highlighted), consider using `aria-selected` on the active item and potentially `role="listbox"` / `role="option"` for the list. — `src/components/ConversationSidebar.tsx:109-123`

- [ ] **`handleSend` in InputBar has a stale closure risk** — `handleSend` depends on `value` and `isDisabled`, both captured via `useCallback`. The `isDisabled` variable derives from `settings` (a useLiveQuery result), which is not in the dependency array of `useCallback`. However, since `isDisabled` is computed from `hasApiKeys` which changes infrequently and `handleSend` would only be called when the button is enabled, this is low-risk in practice. — `src/components/InputBar.tsx:35-42`

- [ ] **Store default models could drift from Settings defaults** — The Zustand store has hardcoded default models (`claude-sonnet-4-20250514`, `gpt-4o`, `gemini-2.0-flash`) which must stay in sync with the Dexie settings defaults in `getSettings()`. If one is updated without the other, users would see inconsistent model selections. — Rationale: Consider importing a shared `DEFAULT_MODELS` constant from `@/lib/db/types` or a constants file.

- [ ] **Auto-focus `useEffect` in InputBar fires before settings load** — The `useEffect` on mount calls `inputRef.current?.focus()`, but at that point `useLiveQuery` hasn't resolved yet and the input is likely disabled. Focusing a disabled input is a no-op in most browsers but wastes a render cycle. — `src/components/InputBar.tsx:31-33` — Consider moving the focus call to after settings resolve, or using `autoFocus` prop on the input.

- [ ] **Test coverage gap: no test for Shift+Enter preserving newline** — The `handleKeyDown` handler specifically checks for `!e.shiftKey` before sending, but no test verifies that Shift+Enter does NOT trigger send. — `src/components/InputBar.test.tsx`

## Convention Compliance

**Positive observations:**
- All imports use `@/` aliases consistently (CONVENTIONS.md: Import Aliases)
- `import type` used correctly for type-only imports (store.ts line 12, ModelColumn.tsx line 13)
- Semantic Tailwind tokens used throughout (`bg-background`, `text-foreground`, `border-border`, `bg-muted`, `text-muted-foreground`, `bg-card`, `bg-accent`) — no hardcoded colors (CONVENTIONS.md: Tailwind CSS v4 Theme Tokens)
- shadcn/ui components used properly (`Button`, `Input`, `ScrollArea`, `Sheet`) (CONVENTIONS.md: shadcn/ui Components)
- `zustand` correctly added to `dependencies` (not devDependencies) since it's a runtime import (CONVENTIONS.md: Dependency Categorization)
- `dexie-react-hooks` correctly added to `dependencies`
- Test files are co-located with source (CONVENTIONS.md: Testing Conventions)
- No edits to `src/components/ui/` directory
- No raw CSS or inline styles

**Issues:**
- 3 test files fail Prettier formatting check (CONVENTIONS.md: ESLint + Prettier — "Run before committing")
- Test files not committed (violates general version control expectations)

## Patterns to Document

The following new patterns emerged in Phase 3 and should be considered for addition to CONVENTIONS.md:

1. **Zustand Store Pattern** — Separate `AppState` interface (data) from `AppActions` interface (setters), compose via `AppStore = AppState & AppActions`. Reset store in `beforeEach` using `useAppStore.setState(defaultState)` for test isolation.

2. **`useLiveQuery` in Components** — When components need reactive Dexie data, use `useLiveQuery` from `dexie-react-hooks`. Always handle the `undefined` return (loading state) before the empty-array state. Prefer using data access functions from `@/lib/db` inside the query callback rather than raw Dexie queries.

3. **Responsive Desktop/Mobile Pattern** — For components with different desktop vs mobile rendering (inline sidebar vs Sheet overlay), use CSS classes (`hidden md:block` / `md:hidden`) to show/hide variants. Be cautious about Radix portals rendering in both contexts simultaneously.

4. **React.memo for Model Columns** — Wrap model columns in `React.memo` for stream isolation. This pattern is established early (Phase 3) in preparation for Phase 6 tri-model streaming.

5. **ResizeObserver Polyfill in Tests** — When testing components that use Radix ScrollArea, a `ResizeObserver` polyfill class is needed for jsdom. Define as a class (not object) because Radix uses `new ResizeObserver(...)`.
