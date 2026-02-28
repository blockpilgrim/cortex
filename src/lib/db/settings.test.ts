/**
 * Tests for settings data access functions.
 *
 * Uses fake-indexeddb to provide an IndexedDB implementation in the jsdom
 * test environment. The database is cleared between tests to prevent state
 * leakage.
 */

import 'fake-indexeddb/auto'

import { db } from '@/lib/db/schema'

import { getSettings, updateSettings } from './settings'

beforeEach(async () => {
  await db.conversations.clear()
  await db.messages.clear()
  await db.settings.clear()
})

afterAll(async () => {
  await db.delete()
})

describe('getSettings', () => {
  it('returns default settings on first run', async () => {
    const settings = await getSettings()

    expect(settings).toEqual({
      id: 1,
      apiKeys: {
        claude: '',
        chatgpt: '',
        gemini: '',
      },
      selectedModels: {
        claude: 'claude-sonnet-4-20250514',
        chatgpt: 'gpt-4o',
        gemini: 'gemini-2.0-flash',
      },
      theme: 'dark',
    })
  })

  it('persists defaults to the database on first run', async () => {
    // First call should auto-initialize
    await getSettings()

    // Verify the record exists in the database directly
    const record = await db.settings.get(1)
    expect(record).toBeDefined()
    expect(record!.id).toBe(1)
    expect(record!.theme).toBe('dark')
  })

  it('returns the same settings on subsequent calls', async () => {
    const first = await getSettings()
    const second = await getSettings()
    expect(first).toEqual(second)
  })

  it('returns the persisted record when one exists (not defaults)', async () => {
    // Initialize with defaults
    await getSettings()

    // Manually modify the record
    await db.settings.update(1, { theme: 'light' })

    // getSettings should return the modified record
    const settings = await getSettings()
    expect(settings.theme).toBe('light')
  })
})

describe('updateSettings', () => {
  it('updates a single API key without overwriting others', async () => {
    await getSettings() // initialize defaults

    await updateSettings({
      apiKeys: { claude: 'sk-ant-test-key' },
    })

    const settings = await getSettings()
    expect(settings.apiKeys.claude).toBe('sk-ant-test-key')
    // Other API keys should be preserved
    expect(settings.apiKeys.chatgpt).toBe('')
    expect(settings.apiKeys.gemini).toBe('')
  })

  it('updates multiple API keys at once', async () => {
    await getSettings() // initialize defaults

    await updateSettings({
      apiKeys: {
        claude: 'claude-key',
        chatgpt: 'openai-key',
      },
    })

    const settings = await getSettings()
    expect(settings.apiKeys.claude).toBe('claude-key')
    expect(settings.apiKeys.chatgpt).toBe('openai-key')
    expect(settings.apiKeys.gemini).toBe('')
  })

  it('updates a single selected model without overwriting others', async () => {
    await getSettings() // initialize defaults

    await updateSettings({
      selectedModels: { claude: 'claude-opus-4-20250514' },
    })

    const settings = await getSettings()
    expect(settings.selectedModels.claude).toBe('claude-opus-4-20250514')
    // Other models should be preserved
    expect(settings.selectedModels.chatgpt).toBe('gpt-4o')
    expect(settings.selectedModels.gemini).toBe('gemini-2.0-flash')
  })

  it('updates multiple selected models at once', async () => {
    await updateSettings({
      selectedModels: {
        chatgpt: 'gpt-4-turbo',
        gemini: 'gemini-1.5-pro',
      },
    })

    const settings = await getSettings()
    expect(settings.selectedModels.chatgpt).toBe('gpt-4-turbo')
    expect(settings.selectedModels.gemini).toBe('gemini-1.5-pro')
    expect(settings.selectedModels.claude).toBe('claude-sonnet-4-20250514')
  })

  it('updates the theme', async () => {
    await getSettings() // initialize defaults
    expect((await getSettings()).theme).toBe('dark')

    await updateSettings({ theme: 'light' })

    const settings = await getSettings()
    expect(settings.theme).toBe('light')
  })

  it('does not modify fields that are not included in the update', async () => {
    await getSettings() // initialize defaults

    // Set some initial values
    await updateSettings({
      apiKeys: { claude: 'my-key' },
      theme: 'light',
    })

    // Update only selectedModels
    await updateSettings({
      selectedModels: { chatgpt: 'gpt-4-turbo' },
    })

    // apiKeys and theme should be untouched
    const settings = await getSettings()
    expect(settings.apiKeys.claude).toBe('my-key')
    expect(settings.theme).toBe('light')
    expect(settings.selectedModels.chatgpt).toBe('gpt-4-turbo')
  })

  it('auto-initializes settings if called before getSettings', async () => {
    // updateSettings calls getSettings internally, so it should
    // auto-initialize if no record exists
    await updateSettings({ theme: 'light' })

    const settings = await getSettings()
    expect(settings.theme).toBe('light')
    // Defaults for other fields should still be there
    expect(settings.apiKeys.claude).toBe('')
    expect(settings.selectedModels.claude).toBe('claude-sonnet-4-20250514')
  })
})

describe('settings round-trip', () => {
  it('full round-trip: multiple updates then get returns correct merged values', async () => {
    // First update: set API keys
    await updateSettings({
      apiKeys: {
        claude: 'claude-key-123',
        chatgpt: 'openai-key-456',
        gemini: 'google-key-789',
      },
    })

    // Second update: change models and theme
    await updateSettings({
      selectedModels: {
        claude: 'claude-opus-4-20250514',
        chatgpt: 'gpt-4-turbo',
      },
      theme: 'light',
    })

    // Third update: change one API key and one model
    await updateSettings({
      apiKeys: { claude: 'claude-key-updated' },
      selectedModels: { gemini: 'gemini-1.5-pro' },
    })

    // Verify the final state
    const settings = await getSettings()
    expect(settings).toEqual({
      id: 1,
      apiKeys: {
        claude: 'claude-key-updated', // third update
        chatgpt: 'openai-key-456', // first update (preserved)
        gemini: 'google-key-789', // first update (preserved)
      },
      selectedModels: {
        claude: 'claude-opus-4-20250514', // second update (preserved)
        chatgpt: 'gpt-4-turbo', // second update (preserved)
        gemini: 'gemini-1.5-pro', // third update
      },
      theme: 'light', // second update (preserved)
    })
  })

  it('updating theme back and forth works correctly', async () => {
    await updateSettings({ theme: 'light' })
    expect((await getSettings()).theme).toBe('light')

    await updateSettings({ theme: 'dark' })
    expect((await getSettings()).theme).toBe('dark')

    await updateSettings({ theme: 'light' })
    expect((await getSettings()).theme).toBe('light')
  })

  it('overwriting an API key replaces the previous value', async () => {
    await updateSettings({ apiKeys: { claude: 'first-key' } })
    expect((await getSettings()).apiKeys.claude).toBe('first-key')

    await updateSettings({ apiKeys: { claude: 'second-key' } })
    expect((await getSettings()).apiKeys.claude).toBe('second-key')
  })
})
