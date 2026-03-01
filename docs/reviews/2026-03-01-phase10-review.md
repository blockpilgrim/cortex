# Code Review -- Phase 10: Token Usage & Cost Display (2026-03-01)

## Summary

Phase 10 adds a full token-usage-and-cost pipeline: the Cloudflare proxy extracts token counts via `messageMetadata` on the `finish` stream event, the client-side `useProviderChat` hook reads them from `UIMessage.metadata` in `onFinish` and persists them to Dexie, a `tokenCountMap` state holds per-message counts for display, `MessageBubble` shows per-message token counts, and a `UsageSummary` Popover aggregates usage/costs from Dexie via `useLiveQuery`. A new pure `pricing.ts` module handles the pricing table and cost calculations.

Overall quality is strong. The pipeline is well-structured with clear separation of concerns. The pricing module is a model of clean pure-function design. There are a few issues to address, the most significant being a performance concern in `UsageSummary` that loads ALL messages from IndexedDB on every render, and a correctness issue where cost calculations in `UsageSummary` use the currently-selected model rather than the model that was actually used when messages were generated.

## Files Reviewed

### New files
- `/Users/personal/work-projects/quorum/src/lib/pricing.ts`
- `/Users/personal/work-projects/quorum/src/lib/pricing.test.ts`
- `/Users/personal/work-projects/quorum/src/components/UsageSummary.tsx`
- `/Users/personal/work-projects/quorum/src/components/UsageSummary.test.tsx` (untracked)
- `/Users/personal/work-projects/quorum/src/components/ui/popover.tsx`

### Modified files
- `/Users/personal/work-projects/quorum/functions/api/chat.ts`
- `/Users/personal/work-projects/quorum/functions/api/chat.test.ts` (uncommitted)
- `/Users/personal/work-projects/quorum/src/hooks/useProviderChat.ts`
- `/Users/personal/work-projects/quorum/src/hooks/useProviderChat.test.ts` (uncommitted)
- `/Users/personal/work-projects/quorum/src/components/MessageBubble.tsx`
- `/Users/personal/work-projects/quorum/src/components/MessageBubble.test.tsx` (uncommitted)
- `/Users/personal/work-projects/quorum/src/components/ModelColumn.tsx`
- `/Users/personal/work-projects/quorum/src/components/ModelColumn.test.tsx`
- `/Users/personal/work-projects/quorum/src/components/TopBar.tsx`

## Critical (Must Fix)

- [ ] **UsageSummary cost calculation uses current model, not the model used at message time** -- `src/components/UsageSummary.tsx:75,138` -- The `UsageSection` and `ProviderUsageRow` components use `selectedModels[provider]` to look up pricing. If a user switches from Opus 4 ($15/$75 per 1M) to Haiku 3.5 ($0.80/$4 per 1M) mid-conversation, all historical costs will be recalculated at the Haiku price, dramatically understating actual spend. The `Message` type does not currently store which model generated it, so this requires either (a) storing the model ID on each `Message` record (schema change), or (b) storing the model ID on the `Conversation.modelConfig` and using that as a fallback. Option (a) is the correct long-term fix since `modelConfig` can also change mid-conversation. **Suggested fix**: Add a `model: string` field to the `Message` type and persist it in `addMessage`. Until then, document this limitation clearly in the UI (e.g., "Costs estimated using currently selected models").

- [ ] **`db.messages.toArray()` loads ALL messages into memory** -- `src/components/UsageSummary.tsx:189-194` -- The "All Conversations" query calls `db.messages.toArray()` with no filter, which loads every message ever created into a JavaScript array. This will degrade as the user accumulates conversations (hundreds or thousands of messages). This `useLiveQuery` also re-fires on every Dexie table mutation. **Suggested fix**: Aggregate in the Dexie query. Either use a `.where('role').equals('assistant')` filter to exclude user messages (which have no tokenCount), or better yet, maintain a separate `usage_summary` table that accumulates totals incrementally on each `addMessage` call, avoiding the full table scan entirely.

## Warnings (Should Fix)

- [ ] **Redundant `useLiveQuery` for conversation messages when popover is closed** -- `src/components/UsageSummary.tsx:176-186,189-194` -- Both `useLiveQuery` calls run continuously even when the Popover is closed. Since `useLiveQuery` re-subscribes to Dexie table changes, this means every message write across the entire app triggers two query re-evaluations in `UsageSummary` even when the user never opens the popover. **Suggested fix**: Gate the queries behind a `popoverOpen` state, or move the `useLiveQuery` calls into a child component that only mounts when the popover is open.

- [ ] **`tokenCountMap` state never prunes old entries** -- `src/hooks/useProviderChat.ts:225-229` -- The `setTokenCountMap` updater in `onFinish` creates a new Map that copies all previous entries and adds the new one. Over a long conversation, this map grows indefinitely within the session. While it is cleared on conversation switch (line 287), within a single long conversation it accumulates all entries. This is minor (the map values are small) but worth noting. **Suggested fix**: No immediate action needed, but if conversations grow to hundreds of messages, consider whether this map should be bounded or lazily populated.

- [ ] **Proxy test `messageMetadata` tests have significant duplication** -- `functions/api/chat.test.ts:276-406` -- The four `messageMetadata` tests each repeat the same 15-line setup block to capture `capturedMessageMetadata`. **Suggested fix**: Extract a helper function (e.g., `setupAndCaptureMessageMetadata()`) that returns the captured callback, similar to how `setupStreamTextSuccess()` is already used for other tests.

- [ ] **`formatTokenCount` edge case: 999,999 formats as "1000K" instead of "1.0M"** -- `src/lib/pricing.ts:111` and `src/lib/pricing.test.ts:177` -- The test explicitly asserts `formatTokenCount(999999)` returns `"1000K"`, which is technically correct per the implementation but produces an odd display. Users would expect to see "1.0M" for a value this close to a million. **Suggested fix**: Either adjust the threshold (`count < 999_500` to handle rounding) or accept this as an intentional design choice and add a comment explaining why.

## Suggestions (Consider)

- [ ] **Add `model` field to the `Message` schema** -- This would make cost calculations accurate regardless of when the user views them or whether they've changed models. It also enables future features like "cost per model" breakdowns. This is listed as Critical above but noted here as well since it's an architectural decision that should be recorded in `docs/DECISIONS.md`.

- [ ] **Consider lazy-loading the UsageSummary component** -- The product spec mentions lazy-loading settings and export panels. UsageSummary loads `pricing.ts` (the pricing table) and runs two Dexie queries even though most users won't open the popover frequently. A `React.lazy` wrapper on `UsageSummary` would defer this cost.

- [ ] **Negative cost handling** -- `src/lib/pricing.ts:99-102` -- The `formatCost` function does not handle negative values. While negative costs should never occur, a defensive `Math.abs()` or an early return for negative inputs would prevent displaying "-$0.05" if a bug ever produces a negative value.

- [ ] **`toLocaleString()` in title attribute may be inconsistent across locales** -- `src/components/MessageBubble.tsx:107` -- The title tooltip uses `tokenCount.input.toLocaleString()`, which produces locale-dependent formatting (e.g., "1.234" in German vs "1,234" in English). Since the rest of the app uses `formatTokenCount` from the pricing module, consider using that for consistency, or at least document this as intentional.

- [ ] **UsageSummary test file is untracked** -- `src/components/UsageSummary.test.tsx` is listed as `??` in `git status`. It should be committed with the rest of the Phase 10 test files.

- [ ] **Consider a structural test verifying MODEL_PRICING keys match MODEL_OPTIONS IDs** -- The pricing test checks that specific model IDs exist in `MODEL_PRICING`, but there is no test that verifies every model ID in `MODEL_OPTIONS` (from `models.ts`) has a corresponding pricing entry. If a new model is added to `MODEL_OPTIONS` without a pricing entry, costs will silently return `null`. **Suggested fix**: Add a cross-reference test that iterates `MODEL_OPTIONS` and asserts each model ID exists in `MODEL_PRICING`.

## Convention Compliance

The implementation follows established conventions well:

- **Import aliases**: All imports use `@/` aliases correctly.
- **Semantic tokens**: All styling uses Tailwind theme tokens (`text-foreground`, `bg-popover`, `text-muted-foreground`, etc.). No raw color values.
- **shadcn/ui**: Popover component is CLI-generated and placed correctly in `src/components/ui/popover.tsx`. Not hand-edited.
- **Testing conventions**: Tests co-locate with source files. Vitest globals used throughout. `beforeEach` properly resets Zustand store state and clears Dexie tables.
- **Zustand selectors**: `UsageSummary.tsx` uses granular selectors (`(s) => s.activeConversationId`, `(s) => s.selectedModels`).
- **useLiveQuery**: Follows the convention with dependency arrays and typed empty-array defaults (`[] as Message[]`).
- **Pure functions**: The pricing module follows the "Cross-Feed: Pure Functions" pattern -- all calculation and formatting functions are pure with no side effects, making them trivially testable.
- **React.memo**: `MessageBubble` remains wrapped in `memo`, consistent with stream isolation convention.
- **Data layer**: Token count persistence flows through `addMessage` with the `tokenCount` field, following the data access function conventions.

**Minor deviation**: The `UsageSummary` component queries `db.messages` directly (line 179, 191) rather than using data access functions from `@/lib/db`. The convention states "Prefer calling data access functions from `@/lib/db` inside the callback rather than raw Dexie queries." However, the existing data access functions (`getMessagesByThread`, `getMessagesByConversation`) filter by provider or sort by timestamp, which is not what `UsageSummary` needs. Adding a new `getAllMessages()` function would be trivially thin. This is acceptable but should be normalized if more direct `db.*` queries appear.

## Patterns to Document

1. **Token Usage Extraction Pipeline**: The pattern of using `messageMetadata` in the proxy's `toUIMessageStreamResponse` to send structured data alongside the stream, then reading it from `UIMessage.metadata` in `onFinish`, is a reusable pattern for any future metadata that needs to flow from the proxy to the client (e.g., model version, safety flags). Consider documenting this in CONVENTIONS.md.

2. **Pricing Module Pattern**: Pure pricing module with `MODEL_PRICING` table, `calculateCost`/`calculateTotalCost` pure functions, and formatting utilities is a clean pattern. If other tables of reference data emerge (e.g., rate limits, context window sizes), they should follow this same structure.

3. **Popover for Non-Critical Information**: The pattern of using a Popover (not a Dialog) for supplementary information that the user checks occasionally is worth noting. Popovers don't block interaction, don't require an overlay, and auto-dismiss on outside click -- appropriate for usage stats but not for destructive actions.
