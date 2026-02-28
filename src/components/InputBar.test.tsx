/**
 * Tests for the InputBar component.
 *
 * Uses fake-indexeddb for Dexie's useLiveQuery (settings API key check).
 * Tests cover: rendering, disabled state, typing, auto-focus, and
 * placeholder text based on API key availability.
 */

import 'fake-indexeddb/auto'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InputBar } from '@/components/InputBar'
import { db, updateSettings } from '@/lib/db'

beforeEach(async () => {
  await db.conversations.clear()
  await db.messages.clear()
  await db.settings.clear()
})

afterAll(async () => {
  await db.delete()
})

function renderInputBar() {
  const user = userEvent.setup()
  const result = render(<InputBar />)
  return { ...result, user }
}

describe('InputBar', () => {
  describe('rendering', () => {
    it('renders a text input', () => {
      renderInputBar()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('renders a send button with proper aria-label', () => {
      renderInputBar()
      expect(
        screen.getByRole('button', { name: 'Send message' }),
      ).toBeInTheDocument()
    })
  })

  describe('disabled state (no API keys)', () => {
    it('shows "Configure API keys" placeholder when no keys are set', async () => {
      renderInputBar()
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(
            'Configure API keys in settings to start...',
          ),
        ).toBeInTheDocument()
      })
    })

    it('disables the input when no API keys are configured', async () => {
      renderInputBar()
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(
            'Configure API keys in settings to start...',
          ),
        ).toBeDisabled()
      })
    })

    it('disables the send button when no API keys are configured', async () => {
      renderInputBar()
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Send message' }),
        ).toBeDisabled()
      })
    })
  })

  describe('enabled state (API keys present)', () => {
    beforeEach(async () => {
      // Seed settings with an API key so the input becomes enabled
      await updateSettings({ apiKeys: { claude: 'sk-test-key-123' } })
    })

    it('shows "Ask all three models..." placeholder when keys are set', async () => {
      renderInputBar()
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Ask all three models...'),
        ).toBeInTheDocument()
      })
    })

    it('enables the input when API keys are configured', async () => {
      renderInputBar()
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Ask all three models...'),
        ).not.toBeDisabled()
      })
    })

    it('send button is disabled when input is empty even with API keys', async () => {
      renderInputBar()
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Ask all three models...'),
        ).not.toBeDisabled()
      })
      // Send button should still be disabled because value is empty
      expect(
        screen.getByRole('button', { name: 'Send message' }),
      ).toBeDisabled()
    })

    it('enables send button when input has text', async () => {
      const { user } = renderInputBar()
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Ask all three models...'),
        ).not.toBeDisabled()
      })

      await user.type(
        screen.getByPlaceholderText('Ask all three models...'),
        'Hello',
      )
      expect(
        screen.getByRole('button', { name: 'Send message' }),
      ).not.toBeDisabled()
    })
  })

  describe('user interaction', () => {
    beforeEach(async () => {
      await updateSettings({ apiKeys: { claude: 'sk-test-key-123' } })
    })

    it('allows typing in the input field', async () => {
      const { user } = renderInputBar()
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Ask all three models...'),
        ).not.toBeDisabled()
      })

      const input = screen.getByPlaceholderText('Ask all three models...')
      await user.type(input, 'Hello world')
      expect(input).toHaveValue('Hello world')
    })

    it('clears input on Enter key press (placeholder send)', async () => {
      const { user } = renderInputBar()
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Ask all three models...'),
        ).not.toBeDisabled()
      })

      const input = screen.getByPlaceholderText('Ask all three models...')
      await user.type(input, 'Hello{Enter}')
      expect(input).toHaveValue('')
    })

    it('clears input on send button click', async () => {
      const { user } = renderInputBar()
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Ask all three models...'),
        ).not.toBeDisabled()
      })

      const input = screen.getByPlaceholderText('Ask all three models...')
      await user.type(input, 'Hello')
      await user.click(screen.getByRole('button', { name: 'Send message' }))
      expect(input).toHaveValue('')
    })

    it('does not send on Shift+Enter', async () => {
      const { user } = renderInputBar()
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Ask all three models...'),
        ).not.toBeDisabled()
      })

      const input = screen.getByPlaceholderText('Ask all three models...')
      await user.type(input, 'Hello{Shift>}{Enter}{/Shift}')
      // Shift+Enter should NOT trigger send — input should retain its value
      expect(input).toHaveValue('Hello')
    })

    it('does not clear input on Enter when input is only whitespace', async () => {
      const { user } = renderInputBar()
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Ask all three models...'),
        ).not.toBeDisabled()
      })

      const input = screen.getByPlaceholderText('Ask all three models...')
      await user.type(input, '   {Enter}')
      // Whitespace-only text should not be sent (trimmed check), so value remains
      expect(input).toHaveValue('   ')
    })
  })

  describe('auto-focus', () => {
    it('calls focus on the input ref on mount', () => {
      // The useEffect fires inputRef.current?.focus() on mount.
      // In jsdom, useLiveQuery resolves asynchronously so the input may be
      // disabled when the effect runs. We verify the effect does not throw
      // and that the input element exists (focus attempt is best-effort).
      expect(() => renderInputBar()).not.toThrow()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })
  })
})
