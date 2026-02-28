/**
 * Tests for the ConversationSidebar component.
 *
 * Uses fake-indexeddb for Dexie's useLiveQuery to work in jsdom.
 * The sidebar is tested with sidebarOpen=true so the desktop inline sidebar
 * renders. The Sheet overlay (mobile) is NOT tested here because Radix
 * Dialog's aria-modal blocks getByRole in jsdom — see App.test.tsx notes.
 *
 * The desktop sidebar is rendered via the `hidden md:block` CSS classes,
 * which are invisible in jsdom (CSS media queries don't apply), but the
 * DOM is still present. We test the SidebarContent rendered inside the
 * desktop aside, which contains the conversation list and "New conversation"
 * button.
 */

import 'fake-indexeddb/auto'

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConversationSidebar } from '@/components/ConversationSidebar'
import { useAppStore } from '@/lib/store'
import { db } from '@/lib/db'
import { createConversation } from '@/lib/db'

// Polyfill ResizeObserver for jsdom — used by Radix ScrollArea internally.
// Must be a class (not a function returning an object) because Radix calls `new ResizeObserver(...)`.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver

beforeEach(async () => {
  // Reset Zustand state: sidebar open (desktop inline renders)
  useAppStore.setState({
    activeConversationId: null,
    sidebarOpen: true,
  })
  // Clear Dexie tables
  await db.conversations.clear()
  await db.messages.clear()
  await db.settings.clear()
})

afterAll(async () => {
  await db.delete()
})

function renderSidebar(onNewConversation = vi.fn()) {
  // pointerEventsCheck: 0 disables the pointer-events check because in jsdom
  // the Sheet overlay (mobile) and the desktop aside both render simultaneously.
  // The Sheet backdrop intercepts pointer events on elements behind it. In real
  // browsers, CSS media queries (md:hidden / md:block) prevent this overlap.
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  const result = render(
    <ConversationSidebar onNewConversation={onNewConversation} />,
  )
  return { ...result, user, onNewConversation }
}

describe('ConversationSidebar', () => {
  it('renders "New conversation" button', async () => {
    renderSidebar()
    // The sidebar content renders twice (desktop + mobile Sheet), but
    // since sidebarOpen is true the Sheet is open too. Use getAllByRole
    // and check that at least one "New conversation" button exists.
    await waitFor(() => {
      expect(
        screen.getAllByRole('button', { name: /new conversation/i }).length,
      ).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows "No conversations yet" when database is empty', async () => {
    renderSidebar()
    await waitFor(() => {
      expect(
        screen.getAllByText('No conversations yet').length,
      ).toBeGreaterThanOrEqual(1)
    })
  })

  it('lists conversations from Dexie', async () => {
    // Seed test data
    await createConversation({
      title: 'First Chat',
      modelConfig: {
        claude: 'claude-sonnet-4-20250514',
        chatgpt: 'gpt-4o',
        gemini: 'gemini-2.0-flash',
      },
    })
    await createConversation({
      title: 'Second Chat',
      modelConfig: {
        claude: 'claude-sonnet-4-20250514',
        chatgpt: 'gpt-4o',
        gemini: 'gemini-2.0-flash',
      },
    })

    renderSidebar()

    await waitFor(() => {
      expect(screen.getAllByText('First Chat').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Second Chat').length).toBeGreaterThanOrEqual(
        1,
      )
    })
  })

  it('updates activeConversationId in Zustand when a conversation is clicked', async () => {
    const convId = await createConversation({
      title: 'Clickable Chat',
      modelConfig: {
        claude: 'claude-sonnet-4-20250514',
        chatgpt: 'gpt-4o',
        gemini: 'gemini-2.0-flash',
      },
    })

    const { container } = renderSidebar()

    await waitFor(() => {
      expect(
        screen.getAllByText('Clickable Chat').length,
      ).toBeGreaterThanOrEqual(1)
    })

    // Target the button inside the desktop aside specifically to avoid
    // the Sheet overlay intercepting or dismissing the click.
    const aside = container.querySelector('aside')!
    const button = within(aside).getByText('Clickable Chat')
    fireEvent.click(button)

    expect(useAppStore.getState().activeConversationId).toBe(convId)
  })

  it('does not close the desktop sidebar after selecting a conversation', async () => {
    await createConversation({
      title: 'Desktop Click',
      modelConfig: {
        claude: 'claude-sonnet-4-20250514',
        chatgpt: 'gpt-4o',
        gemini: 'gemini-2.0-flash',
      },
    })

    const { container } = renderSidebar()

    await waitFor(() => {
      expect(
        screen.getAllByText('Desktop Click').length,
      ).toBeGreaterThanOrEqual(1)
    })

    // Click the conversation in the desktop aside (no onAfterAction passed)
    const aside = container.querySelector('aside')!
    const button = within(aside).getByText('Desktop Click')
    fireEvent.click(button)

    // Desktop sidebar should remain open
    expect(useAppStore.getState().sidebarOpen).toBe(true)
  })

  it('calls onNewConversation when "New conversation" button is clicked', async () => {
    const onNewConversation = vi.fn()
    const { user } = renderSidebar(onNewConversation)

    await waitFor(() => {
      expect(
        screen.getAllByRole('button', { name: /new conversation/i }).length,
      ).toBeGreaterThanOrEqual(1)
    })

    const buttons = screen.getAllByRole('button', {
      name: /new conversation/i,
    })
    await user.click(buttons[0])

    expect(onNewConversation).toHaveBeenCalledTimes(1)
  })

  it('does not close the desktop sidebar when "New conversation" is clicked', async () => {
    const { container } = renderSidebar()

    await waitFor(() => {
      expect(
        screen.getAllByRole('button', { name: /new conversation/i }).length,
      ).toBeGreaterThanOrEqual(1)
    })

    // Click "New conversation" in the desktop aside
    // The aside has `hidden md:block` CSS which makes it display:none in jsdom,
    // so we need to query with {hidden: true} to find the button.
    const aside = container.querySelector('aside')!
    const button = within(aside).getByRole('button', {
      name: /new conversation/i,
      hidden: true,
    })
    fireEvent.click(button)

    // Desktop sidebar should remain open
    expect(useAppStore.getState().sidebarOpen).toBe(true)
  })

  it('does not render inline sidebar when sidebarOpen is false', () => {
    useAppStore.setState({ sidebarOpen: false })
    const { container } = renderSidebar()
    // The desktop aside element should not be in the DOM
    const aside = container.querySelector('aside')
    expect(aside).toBeNull()
  })
})
