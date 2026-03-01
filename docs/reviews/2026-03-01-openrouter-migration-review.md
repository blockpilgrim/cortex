# Code Review — 2026-03-01 (OpenRouter Migration)

## Summary

This review covers commit `c6319be` ("Route all providers through OpenRouter with single API key"), which replaces the direct-API-per-provider pattern with a unified OpenRouter routing strategy. The change touches 11 files across the proxy, client hook, model mapping, settings UI, data types, pricing, and tests. Overall quality is solid: the core routing change is correct, test coverage for the changed code is thorough (all 402 tests pass), and the Settings UI simplification is a clear UX improvement. However, there are several stale references to the old per-provider API key pattern that were missed -- most critically in `InputBar.tsx`, which still checks the old individual provider keys to determine if the input should be disabled.

## Files Reviewed

- `functions/api/chat.ts` (proxy)
- `functions/api/chat.test.ts` (proxy tests)
- `src/hooks/useProviderChat.ts` (client hook)
- `src/lib/models.ts` (model mapping)
- `src/components/SettingsDialog.tsx` (settings UI)
- `src/components/SettingsDialog.test.tsx` (settings tests)
- `src/lib/db/types.ts` (data types)
- `src/lib/db/settings.ts` (settings defaults)
- `src/lib/db/settings.test.ts` (settings tests)
- `src/lib/pricing.ts` (pricing table)
- `src/lib/pricing.test.ts` (pricing tests)
- `src/components/InputBar.tsx` (not changed -- stale reference found)
- `src/components/InputBar.test.tsx` (not changed -- stale reference found)
- `CONVENTIONS.md` (not updated)
- `CLAUDE.md` (not updated)

## Critical (Must Fix)

- [ ] **`InputBar.tsx` still checks per-provider API keys to gate the send button** -- `src/components/InputBar.tsx:40-45` -- The `hasApiKeys` boolean checks `settings.apiKeys.claude`, `settings.apiKeys.chatgpt`, and `settings.apiKeys.gemini` to decide whether to disable the input. Since only `settings.apiKeys.openrouter` is populated now, this means the input bar is **always disabled** for users who only have an OpenRouter key configured (which is all users after this change). This is a functional bug.

  **Suggested fix**: Change to `settings.apiKeys.openrouter !== ''`.

  ```tsx
  const hasApiKeys =
    settings !== undefined &&
    settings !== null &&
    settings.apiKeys.openrouter !== ''
  ```

- [ ] **`InputBar.test.tsx` uses per-provider keys in all test setup** -- `src/components/InputBar.test.tsx:46,56,73,...` (approximately 16 occurrences) -- Every test that calls `updateSettings({ apiKeys: { claude: 'sk-test-key-123' } })` to enable the input bar is masking the bug above. These should be changed to `updateSettings({ apiKeys: { openrouter: 'sk-test-key-123' } })`.

- [ ] **`App.test.tsx` uses per-provider key** -- `src/App.test.tsx:83` -- Uses `updateSettings({ apiKeys: { claude: 'sk-test' } })`. Same issue: this should use the `openrouter` key.

## Warnings (Should Fix)

- [ ] **Stale module doc comment in proxy** -- `functions/api/chat.ts:5` -- The file header still reads "Stateless proxy that forwards chat requests to AI providers (Anthropic, OpenAI, OpenRouter for Gemini)". This should reflect that all providers now route through OpenRouter.

  **Suggested fix**: Update to "Stateless proxy that forwards chat requests to AI providers via OpenRouter."

- [ ] **`void createAnthropic` / `void createOpenAI` is dead code dressed up as intent** -- `functions/api/chat.ts:270-273` -- Using `void` statements to prevent tree-shaking of unused imports is an anti-pattern. If these adapters are needed for a future feature, the code should simply not be changed until that feature exists. As-is, these imports add unnecessary bundle size to the Cloudflare Worker and a `void` statement is confusing to future readers. If the intent is to keep the packages installed, that is a `package.json` concern, not a source code concern.

  **Suggested fix**: Remove the `createAnthropic` and `createOpenAI` imports and `void` statements. Re-add them when the per-provider routing feature is implemented.

- [ ] **`CONVENTIONS.md` not updated for OpenRouter migration** -- Multiple sections reference the old per-provider pattern:
  - Line 367: `Use createAnthropic(), createOpenAI(), createOpenRouter() with { apiKey } for BYOK pattern`
  - Lines 376-387: Example code shows `createAnthropic` with per-provider API key
  - Lines 394-413: `PROVIDER_OPTIONS` table shows `anthropic`, `openai`, and `openrouter` SDK keys, but now all use `openrouter`
  - Lines 609-613: Settings dual-write example shows per-provider API key handling

  **Suggested fix**: Update these sections to reflect the unified OpenRouter routing.

- [ ] **`CLAUDE.md` tech stack line references direct provider adapters** -- `CLAUDE.md:13` lists `@ai-sdk/anthropic`, `@ai-sdk/openai` as active provider adapters. This should note that `@openrouter/ai-sdk-provider` is the primary adapter, with the others retained for potential future use.

- [ ] **Duplicated pricing entries are a maintenance burden** -- `src/lib/pricing.ts:27-43` -- The pricing table now has 9 entries (5 direct + 4 OpenRouter aliases). Every time a price changes, two entries must be updated. This is fragile and will lead to drift.

  **Suggested fix**: Define pricing once per model, then programmatically generate OpenRouter aliases:

  ```ts
  const BASE_PRICING: Record<string, ModelPricing> = {
    'claude-sonnet-4-6': { inputPer1M: 3, outputPer1M: 15 },
    // ...
  }

  export const MODEL_PRICING: Record<string, ModelPricing> = {
    ...BASE_PRICING,
    ...Object.fromEntries(
      Object.entries(OPENROUTER_MODEL_MAP)
        .filter(([k, v]) => k !== v) // skip identity mappings
        .map(([, orId]) => {
          const baseId = Object.entries(OPENROUTER_MODEL_MAP).find(([, v]) => v === orId)?.[0]
          return [orId, BASE_PRICING[baseId!]]
        })
        .filter(([, v]) => v != null)
    ),
  }
  ```

- [ ] **`_provider` parameter in `createModel` is unused but still accepted** -- `functions/api/chat.ts:265` -- The function signature `createModel(_provider: Provider, model: string, apiKey: string)` still accepts a `provider` argument (prefixed with `_` to suppress the unused warning). Since all providers route identically, the parameter is noise. However, this is minor since `PROVIDER_OPTIONS` still uses the provider to determine thinking config, and the function is only called once.

- [ ] **No unit tests for `toOpenRouterModelId` or `OPENROUTER_MODEL_MAP`** -- `src/lib/models.test.ts` -- The existing test file covers `MODEL_OPTIONS`, `MODEL_DISPLAY_NAMES`, `getModelDisplayName`, and `PROVIDER_LABELS`, but the new `toOpenRouterModelId()` function and `OPENROUTER_MODEL_MAP` constant have zero test coverage. They are exercised indirectly through the proxy tests, but edge cases (unknown model IDs, identity mappings) are not tested.

  **Suggested fix**: Add a `describe('toOpenRouterModelId')` block:

  ```ts
  describe('toOpenRouterModelId', () => {
    it('maps direct Claude model IDs to OpenRouter format', () => {
      expect(toOpenRouterModelId('claude-sonnet-4-6')).toBe('anthropic/claude-sonnet-4-6')
    })
    it('maps direct OpenAI model IDs to OpenRouter format', () => {
      expect(toOpenRouterModelId('gpt-5.2')).toBe('openai/gpt-5.2')
    })
    it('passes through Gemini IDs unchanged', () => {
      expect(toOpenRouterModelId('google/gemini-3.1-pro-preview')).toBe('google/gemini-3.1-pro-preview')
    })
    it('returns unknown model IDs unchanged (fallback)', () => {
      expect(toOpenRouterModelId('some-future-model')).toBe('some-future-model')
    })
  })
  ```

## Suggestions (Consider)

- [ ] **Consider whether `OPENROUTER_MODEL_MAP` should be derived from `MODEL_OPTIONS`** -- Currently `OPENROUTER_MODEL_MAP` is a hand-maintained parallel map. If a new model is added to `MODEL_OPTIONS` but not to `OPENROUTER_MODEL_MAP`, it will silently pass through unmapped (which may or may not work with OpenRouter). A pattern that derives the map from `MODEL_OPTIONS` or validates at build time that every model has a mapping would prevent this class of bug.

- [ ] **Consider removing per-provider `apiKeys.claude`, `apiKeys.chatgpt`, `apiKeys.gemini` from the data model** -- `src/lib/db/types.ts:117-120` -- These fields are now vestigial. They still exist in `ApiKeys`, `DEFAULT_SETTINGS`, and tests, but nothing reads them at runtime. Keeping them increases surface area for confusion. A Dexie schema migration could clean them up, or they could be left for the hypothetical "per-provider direct API" feature. At minimum, add a code comment marking them as deprecated.

- [ ] **Consider whether `PROVIDER_OPTIONS` passthrough works correctly with OpenRouter** -- `functions/api/chat.ts:283-299` -- The `providerOptions` map now uses the `openrouter` key for all providers. OpenRouter's AI SDK provider typically forwards these options to the downstream provider. Verify that OpenRouter correctly interprets `{ openrouter: { thinking: { type: 'adaptive' } } }` for Claude requests and `{ openrouter: { reasoningEffort: 'high' } }` for OpenAI requests. If OpenRouter expects different option keys (e.g., `anthropic` for Claude-specific options routed through OpenRouter), this could silently fail to enable thinking/reasoning. This should be verified with a live integration test.

- [ ] **Pricing may differ between direct API and OpenRouter** -- OpenRouter typically adds a markup to model pricing. The pricing table uses direct API prices, but costs are now incurred through OpenRouter. Consider noting this discrepancy or using OpenRouter's actual pricing.

## Convention Compliance

The implementation follows most conventions correctly:

- **Import aliases**: All imports use `@/` paths. Correct.
- **Testing conventions**: Test files co-located, using Vitest globals, Dexie cleanup patterns. Correct.
- **Data layer**: `updateSettings()` shallow merge for `apiKeys` used correctly. Correct.
- **Debounced input saving**: Pattern preserved in `OpenRouterKeySection`. Correct.
- **Settings dual-write**: API key only needs Dexie (read at request time), model changes need both Dexie + Zustand. Correctly maintained.
- **shadcn/ui components**: No modifications to `src/components/ui/`. Correct.
- **Tailwind tokens**: Semantic tokens used throughout. Correct.

**Violations**:
- **Compound Engineering Protocol**: `CONVENTIONS.md` was not updated after implementation, violating the mandatory update protocol. The "Cloudflare Pages Functions" and "Provider Options" sections still describe the old per-provider routing pattern. The "Settings Dual-Write Pattern" example still shows per-provider API key handling.

## Patterns to Document

The following patterns emerged from this change and should be added to `CONVENTIONS.md`:

1. **OpenRouter Unified Routing** -- All providers route through OpenRouter with a single API key. The proxy uses `createOpenRouter()` exclusively. Model IDs are mapped to OpenRouter format (`vendor/model`) on the client side before sending to the proxy.

2. **Model ID Mapping Pattern** -- `OPENROUTER_MODEL_MAP` in `src/lib/models.ts` maps internal model IDs to OpenRouter format. `toOpenRouterModelId()` resolves IDs with a passthrough fallback. This mapping happens in the client transport, not the proxy.

3. **Single API Key UX Pattern** -- Settings dialog uses a single API key input instead of per-provider inputs. The `hasApiKey` check on the settings gear icon and the InputBar send enablement should both check `settings.apiKeys.openrouter`.
