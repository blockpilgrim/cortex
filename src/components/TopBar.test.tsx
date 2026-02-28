/**
 * Tests for the TopBar component.
 *
 * Verifies rendering of title, sidebar toggle, and new conversation button,
 * as well as their click interactions with Zustand state.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TopBar } from '@/components/TopBar'
import { useAppStore } from '@/lib/store'

beforeEach(() => {
  useAppStore.setState({
    activeConversationId: null,
    sidebarOpen: false,
  })
})

function renderTopBar(onNewConversation = vi.fn()) {
  const user = userEvent.setup()
  const result = render(<TopBar onNewConversation={onNewConversation} />)
  return { ...result, user, onNewConversation }
}

describe('TopBar', () => {
  it('renders the "Cortex" title', () => {
    renderTopBar()
    expect(screen.getByText('Cortex')).toBeInTheDocument()
  })

  it('renders the title as an h1 element', () => {
    renderTopBar()
    const heading = screen.getByText('Cortex')
    expect(heading.tagName).toBe('H1')
  })

  it('renders a sidebar toggle button with proper aria-label', () => {
    renderTopBar()
    const button = screen.getByRole('button', { name: 'Toggle sidebar' })
    expect(button).toBeInTheDocument()
  })

  it('renders a new conversation button with proper aria-label', () => {
    renderTopBar()
    const button = screen.getByRole('button', { name: 'New conversation' })
    expect(button).toBeInTheDocument()
  })

  it('toggles sidebarOpen in Zustand when sidebar toggle is clicked', async () => {
    const { user } = renderTopBar()

    expect(useAppStore.getState().sidebarOpen).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Toggle sidebar' }))
    expect(useAppStore.getState().sidebarOpen).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Toggle sidebar' }))
    expect(useAppStore.getState().sidebarOpen).toBe(false)
  })

  it('calls onNewConversation when new conversation button is clicked', async () => {
    const onNewConversation = vi.fn()
    const { user } = renderTopBar(onNewConversation)

    await user.click(screen.getByRole('button', { name: 'New conversation' }))
    expect(onNewConversation).toHaveBeenCalledTimes(1)
  })

  it('renders as a header element', () => {
    renderTopBar()
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })
})
