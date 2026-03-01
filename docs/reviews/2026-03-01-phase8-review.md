# Code Review — 2026-03-01 — Phase 8: Cross-Feed

## Summary

Phase 8 implements cross-feed orchestration: sharing each model's latest assistant response with the other two models. The implementation is well-structured, with pure utility functions cleanly separated from React integration. The orchestration in `App.tsx` correctly uses `Promise.allSettled` for error isolation, and the `useLiveQuery` count query approach for availability gating is a reasonable design. Cross-feed metadata (`isCrossFeed`, `crossFeedRound`) is correctly threaded through persistence and UI rendering. Overall quality is solid, with two issues that should be addressed before merging and several suggestions for robustness.

## Files Reviewed

- `src/lib/crossfeed.ts` (new)
- `src/lib/crossfeed.test.ts` (new, untracked)
- `src/hooks/useProviderChat.ts` (modified)
- `src/components/ModelColumn.tsx` (modified)
- `src/components/MessageBubble.tsx` (modified)
- `src/components/MessageBubble.test.tsx` (modified)
- `src/components/InputBar.tsx` (modified)
- `src/components/InputBar.test.tsx` (modified)
- `src/App.tsx` (modified)

## Critical (Must Fix)

- [ ] **Race condition: `pendingCrossFeedRef` is shared across concurrent cross-feed sends** — `src/hooks/useProviderChat.ts:111` — The `pendingCrossFeedRef` is a single ref that stores the cross-feed metadata for the "current" request. However, during a cross-feed round all three providers are sent concurrently. If provider A's `onFinish` fires and clears `pendingCrossFeedRef.current = {}` (line 187) before provider B's `onFinish` fires, provider B's assistant message will be persisted without cross-feed flags. This is per-hook-instance (each column has its own `useProviderChat`), so this is actually safe — each hook instance has its own `pendingCrossFeedRef`. **Upon closer review, this is NOT critical — each hook instance is independent.** Retracting.

*(No critical issues found after full analysis.)*

## Warnings (Should Fix)

- [ ] **`useLiveQuery` count queries use `.filter()` which scans all matching index rows** — `src/App.tsx:83-93` — The current query uses the compound index `[conversationId+provider+timestamp]` to scope rows by provider, then applies a JavaScript `.filter((msg) => msg.role === 'assistant')` to count only assistant messages. The `.filter()` runs in JavaScript (not indexed), meaning it loads every message for each provider/conversation pair and checks the role in-memory. For long conversations (hundreds of messages), this is unnecessary work executed on every Dexie change. **Suggested fix**: Either (a) add a compound index that includes `role` (e.g., `[conversationId+provider+role]`) and query directly, or (b) cache the boolean and only recompute on `activeConversationId` changes by querying once per conversation switch rather than reactively. For MVP scale this is acceptable, but worth noting.

- [ ] **Cross-feed button fires `onClick={onCrossFeed}` without null guard** — `src/components/InputBar.tsx:90` — The `onCrossFeed` prop is typed as optional (`onCrossFeed?: () => void`), but the Button's `onClick` is set directly to `onCrossFeed` without checking for `undefined`. While React/DOM will silently no-op on `onClick={undefined}`, this relies on implicit behavior. If someone accidentally passes `null` instead of `undefined`, it would throw. **Suggested fix**: Use `onClick={onCrossFeed ? onCrossFeed : undefined}` or `onClick={() => onCrossFeed?.()}` to make the intent explicit, or simply make the prop required since `App.tsx` always provides it.

- [ ] **`crossFeedIds` set grows unboundedly within a session** — `src/hooks/useProviderChat.ts:204-224` — The `useEffect` that tracks cross-feed IDs only ever adds to `crossFeedIds` and never removes entries (except on conversation switch, line 239). Within a long session with many cross-feed rounds, this set accumulates all cross-feed message IDs. This is a minor memory concern, not a correctness issue, since the set is also rebuilt from Dexie on conversation re-load. However, the `prevMessageIdsRef` comparison logic is fragile — if `useChat` internally changes message IDs (e.g., on re-render after error recovery), previously cross-feed messages could lose their visual indicator until conversation reload. **Suggested fix**: Consider deriving `isCrossFeed` purely from Dexie-seeded data + the current `pendingCrossFeedRef` state, rather than maintaining a growing side-channel set.

## Suggestions (Consider)

- [ ] **Show cross-feed round number in the UI** — The `crossFeedRound` is persisted to Dexie but never displayed. The `MessageBubble` shows a generic "Cross-feed" label for all rounds. Displaying the round number (e.g., "Cross-feed #2") would help users track multi-round dialogues and is trivial to implement by passing the round number through from `useProviderChat` to `MessageBubble`.

- [ ] **Consider adding an index on `role` for the availability query** — If the `useLiveQuery` count query in `App.tsx` becomes a bottleneck, adding `role` to a compound index would eliminate the JavaScript filter. The index `[conversationId+provider+role]` would allow a direct count query: `db.messages.where({conversationId, provider: p, role: 'assistant'}).count()`.

- [ ] **Cross-feed message content could include the original prompt for context** — The current cross-feed message format says "Here are the other models' responses to the same prompt" but does not include the original prompt. For multi-turn conversations where the user has asked several questions, the model receiving the cross-feed may not know which prompt the responses are about. Consider including a brief context line like "In response to: '{original user message}'".

- [ ] **`crossfeed.ts` import uses `@/lib/crossfeed` rather than going through a barrel export** — The file is at `src/lib/crossfeed.ts` and imported directly as `@/lib/crossfeed` in `App.tsx`. This follows the project structure convention (utilities in `src/lib/`), but it is not re-exported through any barrel file. This is consistent with how `@/lib/models`, `@/lib/store`, and `@/lib/utils` work, so this is fine. No action needed.

- [ ] **Test coverage gap: no integration test for the full cross-feed orchestration in `App.tsx`** — The unit tests for `crossfeed.ts` are thorough (24 tests covering all pure functions), and `InputBar`/`MessageBubble` tests cover UI behavior well. However, there is no integration test verifying the end-to-end orchestration in `handleCrossFeed`: that messages are fetched from Dexie, cross-feed messages constructed, sent to all three providers, and correctly persisted with `isCrossFeed`/`crossFeedRound` flags. The existing `App.test.tsx` does not appear to test cross-feed. Consider adding at least one integration test that verifies the full flow.

- [ ] **Test coverage gap: no test for partial provider failure during cross-feed** — What happens when one provider fails during cross-feed (e.g., API key missing for one provider)? The code uses `Promise.allSettled` which handles this correctly at the orchestration level, but there is no test verifying that the other two providers still succeed and persist their responses. This is the exact scenario called out in the Phase 8 acceptance criteria.

- [ ] **Consider debouncing or throttling the `useLiveQuery` availability check** — The `useLiveQuery` in `App.tsx` (line 75) fires whenever any message in the Dexie `messages` table changes. During active streaming (3 concurrent streams saving assistant messages), this query will re-execute on each `addMessage` call. Since the result is just a boolean used for button enable/disable, it does not need to update at streaming frequency. A debounce or a simpler approach (check availability only when streaming completes) could reduce unnecessary work.

## Convention Compliance

The implementation follows established conventions well:

- **Import aliases**: All imports use `@/` aliases correctly.
- **Project structure**: `crossfeed.ts` is correctly placed in `src/lib/` as a shared utility module.
- **Testing conventions**: Tests are co-located (`crossfeed.test.ts` next to `crossfeed.ts`, component tests next to components). Uses Vitest globals. Follows the `makeMessage` helper pattern.
- **React.memo**: `MessageBubble` and `ModelColumn` remain wrapped in `React.memo`.
- **Zustand selectors**: Granular selectors used throughout (e.g., `s.streamingStatus`).
- **Imperative ref pattern**: `ModelColumnHandle.send()` correctly extended with `SendOptions` parameter.
- **Streaming status via Zustand**: Cross-feed does not bypass the streaming status pattern.
- **Data layer conventions**: `addMessage` correctly called with `isCrossFeed` and `crossFeedRound` optional fields, which default to `false`/`null` in the data access layer.
- **Tailwind semantic tokens**: Cross-feed indicator uses `text-muted-foreground` and `border-muted-foreground/30` rather than raw colors.
- **useLiveQuery**: Follows the convention of providing a dependency array and default value.

One minor note: The `useLiveQuery` in `App.tsx` (line 83-93) uses raw Dexie queries (`db.messages.where(...)`) rather than data access functions from `@/lib/db`, which CONVENTIONS.md recommends ("Prefer calling data access functions from `@/lib/db` inside the callback rather than raw Dexie queries"). This was likely a pragmatic choice since no existing data access function provides a count-by-provider-and-role query, but it is worth noting. Consider adding a `countAssistantMessagesByThread` function to `src/lib/db/messages.ts` if this pattern recurs.

## Patterns to Document

- **Cross-feed message construction as pure functions**: The pattern of separating pure message construction (`buildCrossFeedMessages`, `findLastAssistant`, `getNextCrossFeedRound`) from React orchestration is worth documenting. These functions are easy to test, have no side effects, and could be reused if cross-feed logic becomes more complex (e.g., selective provider cross-feed, custom prompts).

- **`SendOptions` metadata threading via ref**: The pattern of storing request-specific metadata in a ref (`pendingCrossFeedRef`) so that the `onFinish` callback can access it is a useful pattern for passing context through the AI SDK's streaming lifecycle. This avoids needing to modify the `useChat` API or thread metadata through the transport. Consider documenting this as a pattern for any future metadata that needs to travel from `send()` to `onFinish()`.
