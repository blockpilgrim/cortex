# Code Review -- Phase 12: Polish & PWA (2026-03-01)

## Summary

Phase 12 adds PWA support (manifest, service worker, icons), global keyboard shortcuts (Cmd/Ctrl+N, Cmd/Ctrl+K), a conversation search dialog, skeleton loading states, responsive touch targets, a fade-in transition, request deduplication, and accessibility improvements across many components. Overall quality is solid: the PWA configuration properly excludes API routes, the search dialog implements correct listbox/option ARIA patterns, skeleton loaders follow the established `useLiveQuery` loading convention, and touch targets consistently use the 44px mobile minimum. There are a few issues worth addressing -- most notably a misleading JSDoc comment and a missing reduced-motion consideration for the new animation.

## Files Reviewed

- `vite.config.ts` (PWA plugin configuration)
- `index.html` (PWA meta tags)
- `package.json` (new dependency)
- `public/icon-192.svg`, `public/icon-512.svg`, `public/apple-touch-icon.svg` (PWA icons)
- `src/hooks/useKeyboardShortcuts.ts` (new)
- `src/hooks/useKeyboardShortcuts.test.ts` (new)
- `src/components/ConversationSearch.tsx` (new)
- `src/components/ConversationSearch.test.tsx` (new)
- `src/components/ui/skeleton.tsx` (new)
- `src/App.tsx` (wired shortcuts, search, skip-to-content, request dedup)
- `src/components/InputBar.tsx` (textarea conversion)
- `src/components/InputBar.test.tsx` (new textarea tests)
- `src/components/ConversationSidebar.tsx` (skeleton loaders, touch targets)
- `src/components/TopBar.tsx` (search button, touch targets)
- `src/components/ModelColumn.tsx` (semantic HTML, ARIA, fade-in)
- `src/components/ModelColumn.test.tsx` (updated ARIA label)
- `src/components/MessageBubble.tsx` (keyboard-accessible copy)
- `src/components/ExportMenu.tsx` (touch targets)
- `src/components/UsageSummary.tsx` (touch targets)
- `src/components/SettingsDialog.tsx` (touch targets)
- `src/index.css` (fade-in animation)
- `src/lib/export.ts` (formatting only)
- `src/lib/export.test.ts` (formatting only)

## Critical (Must Fix)

- [ ] **JSDoc comment claims input/textarea guard that does not exist** -- `src/hooks/useKeyboardShortcuts.ts:8-9` -- The module docstring says "Shortcuts are disabled when the active element is an input, textarea, or contenteditable to avoid interfering with text entry" but no such check exists in the `handleKeyDown` function. Either remove the misleading comment or implement the guard. Since these shortcuts use Cmd/Ctrl modifiers (which are generally not used for text input), removing the comment is likely the correct fix. If you keep the guard claim, implement it:
  ```ts
  const el = document.activeElement
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement)?.isContentEditable) return
  ```

## Warnings (Should Fix)

- [ ] **Cmd+N overrides browser "new window" shortcut** -- `src/hooks/useKeyboardShortcuts.ts:31-33` -- `Cmd+N` (or `Ctrl+N` on Windows/Linux) is the standard browser shortcut for opening a new window. Calling `e.preventDefault()` hijacks this system-level shortcut, which can frustrate users who rely on it. Consider using `Cmd+Shift+N` or `Cmd+O` instead, or document this trade-off explicitly in a comment so future developers understand it was intentional.

- [ ] **Missing `prefers-reduced-motion` for fade-in animation** -- `src/index.css:61-75` -- The `conversation-fade-in` animation (200ms ease-out with `translateY`) does not respect the user's motion preferences. Users who have enabled "reduce motion" in their OS settings will still see the animation. Add a media query:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .conversation-fade-in {
      animation: none;
    }
  }
  ```

- [ ] **`handleKeyDown` in `ConversationSearch` has `filtered` in its dependency array** -- `src/components/ConversationSearch.tsx:87-103` -- The `handleKeyDown` callback depends on `filtered` (the array of filtered conversations) and `selectedIndex`, which means it is recreated on every keystroke. Since `useCallback` is used purely for memoization here and the handler is on a lightweight `<div>`, this is not a functional bug, but the dependency on `filtered` (a new array reference each render) means the `useCallback` never actually memoizes. Consider either (a) removing `useCallback` entirely since it provides no benefit here, or (b) using a ref for `filtered` if stable identity matters.

- [ ] **ConversationSearch listbox missing `aria-activedescendant`** -- `src/components/ConversationSearch.tsx:125-153` -- The search results use `role="listbox"` with `role="option"` items, and keyboard navigation updates `aria-selected`. However, since focus stays on the input and the user navigates via ArrowUp/ArrowDown, the input should have `aria-activedescendant` pointing to the currently selected option's `id` attribute. Without this, screen readers will not announce which item is highlighted. Each option button needs a stable `id` (e.g., `search-result-${conv.id}`), and the input needs `aria-activedescendant={filteredItems[selectedIndex] ? \`search-result-${filteredItems[selectedIndex].id}\` : undefined}`.

- [ ] **TopBar search shortcut hint says "Ctrl+K" but should say "Cmd+K" on macOS** -- `src/components/TopBar.tsx:50` -- The `title` attribute hardcodes `"Search conversations (Ctrl+K)"`. On macOS, users expect to see `Cmd+K`. Consider detecting the platform or using a generic symbol like `"Search conversations (\u2318K / Ctrl+K)"`.

## Suggestions (Consider)

- [ ] **Apple touch icon uses SVG, but Safari expects PNG** -- `public/apple-touch-icon.svg` and `index.html:4` -- While `<link rel="apple-touch-icon">` technically accepts SVGs in modern WebKit, older iOS versions (prior to ~iOS 16.4) and some PWA contexts require a PNG. Consider providing a 180x180 PNG version for maximum compatibility.

- [ ] **PWA manifest icon `purpose: "any maskable"` should be split** -- `vite.config.ts:36-37` -- The 512x512 icon declares `purpose: "any maskable"`. The Lighthouse PWA audit and web.dev guidance recommend separate icons for `any` and `maskable` purposes, since maskable icons need safe-zone padding that looks odd as a standard icon. With the current SVG (text "C" centered), the icon may be acceptable as both, but this is worth validating.

- [ ] **Textarea auto-resize effect runs on every `value` change including programmatic clear** -- `src/components/InputBar.tsx:57-62` -- The auto-resize `useEffect` correctly resets `height` to `auto` then measures `scrollHeight`. This works fine but fires an unnecessary layout measurement when `value` is cleared to `''` after sending. A minor optimization would be to skip measurement when value is empty: `if (!textarea.value) { textarea.style.height = 'auto'; return; }`.

- [ ] **`ConversationSearch` loads all conversations client-side** -- `src/components/ConversationSearch.tsx:55-58` -- The search dialog fetches all conversations and filters in JavaScript. This is fine for the expected data volume (single-user tool), but for users with hundreds of conversations, consider adding a `limit()` to the Dexie query or implementing cursor-based pagination. This is a minor future-proofing concern, not urgent.

- [ ] **Request dedup guard in `handleSend` could benefit from a comment about race conditions** -- `src/App.tsx:194-195` -- The deduplication reads `streamingStatus` via `getState()` at call time, which is correct. However, there is a small window between this check and when the send actually starts streaming where a rapid double-click could still get through (since `streamingStatus` updates via `useEffect` on status change, not synchronously on send). The current approach is pragmatic and the UI disable makes this extremely unlikely, but a brief comment acknowledging this would help future developers.

- [ ] **Skeleton component is standard shadcn/ui** -- `src/components/ui/skeleton.tsx` -- This is the stock shadcn/ui Skeleton component, which is correct. No concerns.

## Convention Compliance

**Positive observations:**
- Import aliases (`@/`) used consistently across all new files
- Semantic theme tokens used everywhere (no hardcoded colors in components)
- `vite-plugin-pwa` correctly placed in `devDependencies`
- New test files co-located with source (`Component.test.tsx` next to `Component.tsx`)
- `Skeleton` component correctly placed in `src/components/ui/`
- Zustand selectors are granular (one field per selector)
- `useAppStore.getState()` correctly used in the `handleSend` event handler to avoid stale closures
- `useLiveQuery` in ConversationSearch follows the established pattern (ordered query, handles undefined/empty)

**Minor deviations:**
- The `useKeyboardShortcuts` hook does not follow any existing pattern in CONVENTIONS.md, but it is a reasonable new pattern. Consider documenting it.

## Patterns to Document

1. **Global Keyboard Shortcuts Pattern**: The `useKeyboardShortcuts` hook registers document-level keyboard listeners. Future shortcuts should be added here rather than scattered across components. Document the hook's interface and the convention of using `Cmd/Ctrl+` prefixed shortcuts.

2. **Touch Target Sizing Convention**: The `h-10 w-10 sm:h-8 sm:w-8` pattern (44px on mobile, 32px on desktop) is now used consistently across TopBar buttons and sidebar action buttons. This should be documented as the standard approach for interactive elements.

3. **Skip-to-Content Link Pattern**: The visually hidden skip link in `App.tsx` that becomes visible on focus is a standard a11y pattern. Document it so it is maintained across layout changes.

4. **Conversation Fade-in via `key` Prop**: The `key={activeConversationId ?? 'none'}` pattern on the message container forces React to remount the element on conversation switch, triggering the CSS fade-in animation. This is an elegant approach that should be documented.
