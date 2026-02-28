/**
 * Tests for the ModelColumn component.
 *
 * Uses fake-indexeddb for Dexie's useLiveQuery to work in jsdom.
 * Tests cover: header rendering, empty states, and message display.
 */

import 'fake-indexeddb/auto'

import { render, screen, waitFor } from '@testing-library/react'
import { ModelColumn } from '@/components/ModelColumn'
import { useAppStore } from '@/lib/store'
import { db, createConversation, addMessage } from '@/lib/db'

const defaultModelConfig = {
  claude: 'claude-sonnet-4-20250514',
  chatgpt: 'gpt-4o',
  gemini: 'gemini-2.0-flash',
}

beforeEach(async () => {
  useAppStore.setState({
    activeConversationId: null,
    sidebarOpen: false,
  })
  await db.conversations.clear()
  await db.messages.clear()
  await db.settings.clear()
})

afterAll(async () => {
  await db.delete()
})

describe('ModelColumn', () => {
  describe('header rendering', () => {
    it('renders the provider label for Claude', () => {
      render(<ModelColumn provider="claude" label="Claude" />)
      expect(screen.getByText('Claude')).toBeInTheDocument()
    })

    it('renders the provider label for ChatGPT', () => {
      render(<ModelColumn provider="chatgpt" label="ChatGPT" />)
      expect(screen.getByText('ChatGPT')).toBeInTheDocument()
    })

    it('renders the provider label for Gemini', () => {
      render(<ModelColumn provider="gemini" label="Gemini" />)
      expect(screen.getByText('Gemini')).toBeInTheDocument()
    })

    it('renders a colored dot indicator in the header', () => {
      const { container } = render(
        <ModelColumn provider="claude" label="Claude" />,
      )
      // The dot is a div with a rounded-full class and a provider-specific color
      const dot = container.querySelector('.rounded-full')
      expect(dot).toBeInTheDocument()
    })
  })

  describe('empty states', () => {
    it('shows "Start a conversation" message when no conversation is active', async () => {
      useAppStore.setState({ activeConversationId: null })
      render(<ModelColumn provider="claude" label="Claude" />)

      await waitFor(() => {
        expect(
          screen.getByText('Start a conversation to see Claude responses'),
        ).toBeInTheDocument()
      })
    })

    it('shows "No messages from <label> yet" when conversation is active but has no messages', async () => {
      const convId = await createConversation({
        modelConfig: defaultModelConfig,
      })
      useAppStore.setState({ activeConversationId: convId })

      render(<ModelColumn provider="claude" label="Claude" />)

      await waitFor(() => {
        expect(
          screen.getByText('No messages from Claude yet'),
        ).toBeInTheDocument()
      })
    })

    it('shows provider-specific empty state for ChatGPT', async () => {
      useAppStore.setState({ activeConversationId: null })
      render(<ModelColumn provider="chatgpt" label="ChatGPT" />)

      await waitFor(() => {
        expect(
          screen.getByText('Start a conversation to see ChatGPT responses'),
        ).toBeInTheDocument()
      })
    })

    it('shows provider-specific empty state for Gemini', async () => {
      useAppStore.setState({ activeConversationId: null })
      render(<ModelColumn provider="gemini" label="Gemini" />)

      await waitFor(() => {
        expect(
          screen.getByText('Start a conversation to see Gemini responses'),
        ).toBeInTheDocument()
      })
    })
  })

  describe('message rendering', () => {
    it('renders messages when they exist for the active conversation', async () => {
      const convId = await createConversation({
        modelConfig: defaultModelConfig,
      })
      await addMessage({
        conversationId: convId,
        provider: 'claude',
        role: 'user',
        content: 'Hello Claude!',
      })
      await addMessage({
        conversationId: convId,
        provider: 'claude',
        role: 'assistant',
        content: 'Hello! How can I help?',
      })

      useAppStore.setState({ activeConversationId: convId })
      render(<ModelColumn provider="claude" label="Claude" />)

      await waitFor(() => {
        expect(screen.getByText('Hello Claude!')).toBeInTheDocument()
        expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument()
      })
    })

    it('only renders messages for the matching provider', async () => {
      const convId = await createConversation({
        modelConfig: defaultModelConfig,
      })
      await addMessage({
        conversationId: convId,
        provider: 'claude',
        role: 'user',
        content: 'Message for Claude',
      })
      await addMessage({
        conversationId: convId,
        provider: 'chatgpt',
        role: 'user',
        content: 'Message for ChatGPT',
      })

      useAppStore.setState({ activeConversationId: convId })
      render(<ModelColumn provider="claude" label="Claude" />)

      await waitFor(() => {
        expect(screen.getByText('Message for Claude')).toBeInTheDocument()
      })
      expect(screen.queryByText('Message for ChatGPT')).not.toBeInTheDocument()
    })

    it('applies different styles for user vs assistant messages', async () => {
      const convId = await createConversation({
        modelConfig: defaultModelConfig,
      })
      await addMessage({
        conversationId: convId,
        provider: 'claude',
        role: 'user',
        content: 'User message text',
      })
      await addMessage({
        conversationId: convId,
        provider: 'claude',
        role: 'assistant',
        content: 'Assistant message text',
      })

      useAppStore.setState({ activeConversationId: convId })
      render(<ModelColumn provider="claude" label="Claude" />)

      await waitFor(() => {
        const userMsg = screen.getByText('User message text')
        const assistantMsg = screen.getByText('Assistant message text')

        // User messages have 'self-end' class, assistant messages have 'self-start'
        expect(userMsg.closest('div')).toHaveClass('self-end')
        expect(assistantMsg.closest('div')).toHaveClass('self-start')
      })
    })

    it('does not show messages from a different conversation', async () => {
      const convId1 = await createConversation({
        modelConfig: defaultModelConfig,
      })
      const convId2 = await createConversation({
        modelConfig: defaultModelConfig,
      })
      await addMessage({
        conversationId: convId1,
        provider: 'claude',
        role: 'user',
        content: 'Conv 1 message',
      })
      await addMessage({
        conversationId: convId2,
        provider: 'claude',
        role: 'user',
        content: 'Conv 2 message',
      })

      useAppStore.setState({ activeConversationId: convId1 })
      render(<ModelColumn provider="claude" label="Claude" />)

      await waitFor(() => {
        expect(screen.getByText('Conv 1 message')).toBeInTheDocument()
      })
      expect(screen.queryByText('Conv 2 message')).not.toBeInTheDocument()
    })
  })
})
