/**
 * Tests for MessageBubble component.
 *
 * Covers:
 * - User vs assistant message rendering and styling
 * - Markdown rendering for assistant messages
 * - Copy-to-clipboard button (present for assistant, absent for user)
 * - Streaming cursor indicator
 * - Timestamp display
 * - formatTime edge cases
 * - Cross-feed indicator (isCrossFeed prop)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MessageBubble } from '@/components/MessageBubble'

// Mock react-markdown since it relies on ESM internals that jsdom cannot handle.
// We verify the content is passed through rather than testing markdown parsing itself.
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown">{children}</div>
  ),
}))

vi.mock('remark-gfm', () => ({
  default: {},
}))

describe('MessageBubble', () => {
  describe('user messages', () => {
    it('renders user message content as plain text', () => {
      render(<MessageBubble role="user" content="Hello, world!" />)
      expect(screen.getByText('Hello, world!')).toBeInTheDocument()
    })

    it('renders with self-end alignment class for right-aligned bubble', () => {
      const { container } = render(<MessageBubble role="user" content="Test" />)
      const bubble = container.firstElementChild as HTMLElement
      expect(bubble.className).toContain('self-end')
    })

    it('renders user content in a <p> tag (not markdown)', () => {
      render(<MessageBubble role="user" content="Plain text message" />)
      // User messages are rendered in a <p>, not through the markdown component
      expect(screen.queryByTestId('markdown')).not.toBeInTheDocument()
      expect(screen.getByText('Plain text message').tagName).toBe('P')
    })

    it('does not show a copy button on user messages', () => {
      render(<MessageBubble role="user" content="My message" />)
      expect(
        screen.queryByRole('button', { name: /copy/i }),
      ).not.toBeInTheDocument()
    })
  })

  describe('assistant messages', () => {
    it('renders assistant message content through markdown', () => {
      render(<MessageBubble role="assistant" content="**Bold** text" />)
      expect(screen.getByTestId('markdown')).toBeInTheDocument()
      expect(screen.getByTestId('markdown')).toHaveTextContent('**Bold** text')
    })

    it('renders with self-start alignment class for left-aligned bubble', () => {
      const { container } = render(
        <MessageBubble role="assistant" content="Response" />,
      )
      const bubble = container.firstElementChild as HTMLElement
      expect(bubble.className).toContain('self-start')
    })

    it('shows a copy button on assistant messages', () => {
      render(<MessageBubble role="assistant" content="Copy me" />)
      expect(
        screen.getByRole('button', { name: 'Copy message' }),
      ).toBeInTheDocument()
    })

    it('copies content to clipboard when copy button is clicked', async () => {
      // Mock the clipboard API
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, {
        clipboard: { writeText },
      })

      render(<MessageBubble role="assistant" content="Content to copy" />)

      fireEvent.click(screen.getByRole('button', { name: 'Copy message' }))

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith('Content to copy')
      })

      // After copying, the aria-label should change to "Copied"
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Copied' }),
        ).toBeInTheDocument()
      })
    })
  })

  describe('streaming cursor', () => {
    it('does not show streaming cursor by default', () => {
      render(<MessageBubble role="assistant" content="Done response" />)
      expect(screen.queryByLabelText('Streaming')).not.toBeInTheDocument()
    })

    it('shows streaming cursor when isStreaming is true', () => {
      render(
        <MessageBubble
          role="assistant"
          content="Partial response..."
          isStreaming
        />,
      )
      expect(screen.getByLabelText('Streaming')).toBeInTheDocument()
    })

    it('does not show streaming cursor on user messages even if isStreaming is passed', () => {
      render(<MessageBubble role="user" content="User message" isStreaming />)
      // User messages are rendered as <p>, not the markdown+cursor path
      expect(screen.queryByLabelText('Streaming')).not.toBeInTheDocument()
    })
  })

  describe('timestamp', () => {
    it('displays formatted time when timestamp is provided', () => {
      // Use a known ISO date
      render(
        <MessageBubble
          role="user"
          content="Hello"
          timestamp="2026-02-28T14:30:00.000Z"
        />,
      )
      // There should be a <time> element with the ISO string as dateTime
      const timeEl = screen.getByRole('time')
      expect(timeEl).toBeInTheDocument()
      expect(timeEl).toHaveAttribute('datetime', '2026-02-28T14:30:00.000Z')
      // The displayed text should be a formatted time (locale-dependent, but non-empty)
      expect(timeEl.textContent).not.toBe('')
    })

    it('does not render time element when timestamp is not provided', () => {
      render(<MessageBubble role="user" content="Hello" />)
      expect(screen.queryByRole('time')).not.toBeInTheDocument()
    })

    it('handles invalid timestamp gracefully without crashing', () => {
      // formatTime wraps Date parsing in a try/catch. For an invalid date,
      // new Date('not-a-date') produces "Invalid Date" which toLocaleTimeString
      // may return as "Invalid Date" rather than throwing. Either way, the
      // component should render without errors.
      render(
        <MessageBubble
          role="assistant"
          content="Test"
          timestamp="not-a-date"
        />,
      )
      const timeEl = screen.getByRole('time')
      expect(timeEl).toBeInTheDocument()
      // The dateTime attribute should still be set to the raw value
      expect(timeEl).toHaveAttribute('datetime', 'not-a-date')
    })
  })

  describe('styling differences', () => {
    it('applies primary background to user messages', () => {
      const { container } = render(<MessageBubble role="user" content="User" />)
      const bubble = container.firstElementChild as HTMLElement
      expect(bubble.className).toContain('bg-primary')
    })

    it('applies card background to assistant messages', () => {
      const { container } = render(
        <MessageBubble role="assistant" content="Assistant" />,
      )
      const bubble = container.firstElementChild as HTMLElement
      expect(bubble.className).toContain('bg-card')
    })
  })

  describe('cross-feed indicator', () => {
    it('renders "Cross-feed" label when isCrossFeed is true', () => {
      render(
        <MessageBubble
          role="assistant"
          content="Cross-feed response"
          isCrossFeed
        />,
      )
      expect(screen.getByText('Cross-feed')).toBeInTheDocument()
    })

    it('renders dashed border class when isCrossFeed is true', () => {
      const { container } = render(
        <MessageBubble role="assistant" content="CF message" isCrossFeed />,
      )
      const bubble = container.firstElementChild as HTMLElement
      expect(bubble.className).toContain('border-dashed')
    })

    it('does not render cross-feed indicator when isCrossFeed is false', () => {
      render(
        <MessageBubble
          role="assistant"
          content="Normal message"
          isCrossFeed={false}
        />,
      )
      expect(screen.queryByText('Cross-feed')).not.toBeInTheDocument()
    })

    it('does not render cross-feed indicator when isCrossFeed is omitted', () => {
      render(<MessageBubble role="assistant" content="Default message" />)
      expect(screen.queryByText('Cross-feed')).not.toBeInTheDocument()
    })

    it('does not apply dashed border when isCrossFeed is false', () => {
      const { container } = render(
        <MessageBubble role="assistant" content="No border" />,
      )
      const bubble = container.firstElementChild as HTMLElement
      expect(bubble.className).not.toContain('border-dashed')
    })

    it('renders cross-feed indicator on user messages', () => {
      render(
        <MessageBubble role="user" content="Cross-feed user msg" isCrossFeed />,
      )
      expect(screen.getByText('Cross-feed')).toBeInTheDocument()
    })

    it('renders dashed border on user messages when isCrossFeed is true', () => {
      const { container } = render(
        <MessageBubble role="user" content="CF user msg" isCrossFeed />,
      )
      const bubble = container.firstElementChild as HTMLElement
      expect(bubble.className).toContain('border-dashed')
    })
  })

  describe('token count display', () => {
    it('shows token count on assistant messages when tokenCount is provided', () => {
      render(
        <MessageBubble
          role="assistant"
          content="Response"
          tokenCount={{ input: 100, output: 200 }}
        />,
      )
      // Total: 300 tokens, formatted as "300 tokens"
      expect(screen.getByText('300 tokens')).toBeInTheDocument()
    })

    it('does not show token count on assistant messages when tokenCount is null', () => {
      render(
        <MessageBubble
          role="assistant"
          content="Response"
          tokenCount={null}
        />,
      )
      expect(screen.queryByText(/tokens/)).not.toBeInTheDocument()
    })

    it('does not show token count on assistant messages when tokenCount is undefined', () => {
      render(<MessageBubble role="assistant" content="Response" />)
      expect(screen.queryByText(/tokens/)).not.toBeInTheDocument()
    })

    it('does not show token count on user messages even if tokenCount is provided', () => {
      render(
        <MessageBubble
          role="user"
          content="User message"
          tokenCount={{ input: 500, output: 1000 }}
        />,
      )
      expect(screen.queryByText(/tokens/)).not.toBeInTheDocument()
    })

    it('shows title attribute with input/output breakdown', () => {
      render(
        <MessageBubble
          role="assistant"
          content="Response"
          tokenCount={{ input: 1234, output: 5678 }}
        />,
      )
      const tokenSpan = screen.getByText(/tokens/)
      expect(tokenSpan).toHaveAttribute(
        'title',
        'Input: 1,234 | Output: 5,678',
      )
    })

    it('formats large token counts correctly', () => {
      render(
        <MessageBubble
          role="assistant"
          content="Response"
          tokenCount={{ input: 5000, output: 10000 }}
        />,
      )
      // Total: 15000, formatTokenCount(15000) = "15K"
      expect(screen.getByText('15K tokens')).toBeInTheDocument()
    })

    it('formats small token counts without abbreviation', () => {
      render(
        <MessageBubble
          role="assistant"
          content="Response"
          tokenCount={{ input: 50, output: 30 }}
        />,
      )
      // Total: 80
      expect(screen.getByText('80 tokens')).toBeInTheDocument()
    })

    it('shows token count alongside timestamp when both are present', () => {
      render(
        <MessageBubble
          role="assistant"
          content="Response"
          timestamp="2026-02-28T14:30:00.000Z"
          tokenCount={{ input: 100, output: 200 }}
        />,
      )
      expect(screen.getByRole('time')).toBeInTheDocument()
      expect(screen.getByText('300 tokens')).toBeInTheDocument()
    })
  })
})
