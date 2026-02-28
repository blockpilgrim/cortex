/**
 * Tests for the Zustand application store.
 *
 * Verifies default state values and all setter actions.
 * The store is reset between tests to prevent state leakage.
 */

import { useAppStore } from '@/lib/store'

/** Default state used to reset the store between tests. */
const defaultState = {
  activeConversationId: null,
  sidebarOpen: true,
  selectedModels: {
    claude: 'claude-sonnet-4-20250514',
    chatgpt: 'gpt-4o',
    gemini: 'gemini-2.0-flash',
  },
  theme: 'dark' as const,
}

beforeEach(() => {
  useAppStore.setState(defaultState)
})

describe('default state', () => {
  it('has activeConversationId set to null', () => {
    expect(useAppStore.getState().activeConversationId).toBeNull()
  })

  it('has sidebarOpen set to true', () => {
    expect(useAppStore.getState().sidebarOpen).toBe(true)
  })

  it('has correct default selected models', () => {
    const { selectedModels } = useAppStore.getState()
    expect(selectedModels).toEqual({
      claude: 'claude-sonnet-4-20250514',
      chatgpt: 'gpt-4o',
      gemini: 'gemini-2.0-flash',
    })
  })

  it('has theme set to dark', () => {
    expect(useAppStore.getState().theme).toBe('dark')
  })
})

describe('setActiveConversationId', () => {
  it('sets the active conversation to a number', () => {
    useAppStore.getState().setActiveConversationId(42)
    expect(useAppStore.getState().activeConversationId).toBe(42)
  })

  it('sets the active conversation to null', () => {
    useAppStore.getState().setActiveConversationId(42)
    useAppStore.getState().setActiveConversationId(null)
    expect(useAppStore.getState().activeConversationId).toBeNull()
  })

  it('does not affect other state', () => {
    useAppStore.getState().setActiveConversationId(5)
    expect(useAppStore.getState().sidebarOpen).toBe(true)
    expect(useAppStore.getState().theme).toBe('dark')
  })
})

describe('toggleSidebar', () => {
  it('flips sidebarOpen from true to false', () => {
    expect(useAppStore.getState().sidebarOpen).toBe(true)
    useAppStore.getState().toggleSidebar()
    expect(useAppStore.getState().sidebarOpen).toBe(false)
  })

  it('flips sidebarOpen from false to true', () => {
    useAppStore.getState().toggleSidebar() // true -> false
    useAppStore.getState().toggleSidebar() // false -> true
    expect(useAppStore.getState().sidebarOpen).toBe(true)
  })
})

describe('setSidebarOpen', () => {
  it('sets sidebarOpen to false explicitly', () => {
    useAppStore.getState().setSidebarOpen(false)
    expect(useAppStore.getState().sidebarOpen).toBe(false)
  })

  it('sets sidebarOpen to true explicitly', () => {
    useAppStore.getState().setSidebarOpen(false)
    useAppStore.getState().setSidebarOpen(true)
    expect(useAppStore.getState().sidebarOpen).toBe(true)
  })
})

describe('setSelectedModel', () => {
  it('updates a single provider model without affecting others', () => {
    useAppStore.getState().setSelectedModel('claude', 'claude-opus-4-20250514')
    const { selectedModels } = useAppStore.getState()
    expect(selectedModels.claude).toBe('claude-opus-4-20250514')
    expect(selectedModels.chatgpt).toBe('gpt-4o')
    expect(selectedModels.gemini).toBe('gemini-2.0-flash')
  })

  it('updates chatgpt model', () => {
    useAppStore.getState().setSelectedModel('chatgpt', 'gpt-4-turbo')
    expect(useAppStore.getState().selectedModels.chatgpt).toBe('gpt-4-turbo')
  })

  it('updates gemini model', () => {
    useAppStore.getState().setSelectedModel('gemini', 'gemini-1.5-pro')
    expect(useAppStore.getState().selectedModels.gemini).toBe('gemini-1.5-pro')
  })
})

describe('setSelectedModels', () => {
  it('replaces all selected models at once', () => {
    const newModels = {
      claude: 'claude-opus-4-20250514',
      chatgpt: 'gpt-4-turbo',
      gemini: 'gemini-1.5-pro',
    }
    useAppStore.getState().setSelectedModels(newModels)
    expect(useAppStore.getState().selectedModels).toEqual(newModels)
  })
})

describe('setTheme', () => {
  it('sets theme to light', () => {
    useAppStore.getState().setTheme('light')
    expect(useAppStore.getState().theme).toBe('light')
  })

  it('sets theme back to dark', () => {
    useAppStore.getState().setTheme('light')
    useAppStore.getState().setTheme('dark')
    expect(useAppStore.getState().theme).toBe('dark')
  })
})

describe('state isolation between tests', () => {
  it('modifies state in this test', () => {
    useAppStore.getState().setActiveConversationId(99)
    useAppStore.getState().setSidebarOpen(false)
    useAppStore.getState().setTheme('light')
    expect(useAppStore.getState().activeConversationId).toBe(99)
  })

  it('confirms state is reset in the next test', () => {
    // beforeEach resets to defaults
    expect(useAppStore.getState().activeConversationId).toBeNull()
    expect(useAppStore.getState().sidebarOpen).toBe(true)
    expect(useAppStore.getState().theme).toBe('dark')
  })
})
