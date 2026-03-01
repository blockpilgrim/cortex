/**
 * Tests for useKeyboardShortcuts hook.
 *
 * Covers:
 * - Cmd/Ctrl+N triggers onNewConversation callback
 * - Cmd/Ctrl+K triggers onSearchOpen callback
 * - preventDefault is called on matched shortcuts
 * - No callback fires without modifier key
 * - No callback fires for unregistered keys with modifier
 * - Listener is cleaned up on unmount
 */

import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

const onNewConversation = vi.fn()
const onSearchOpen = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

/** Dispatch a keyboard event on `document` and return the event for assertion. */
function press(
  key: string,
  modifiers: { metaKey?: boolean; ctrlKey?: boolean } = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  })
  // Spy on preventDefault so we can assert it was called
  vi.spyOn(event, 'preventDefault')
  document.dispatchEvent(event)
  return event
}

describe('useKeyboardShortcuts', () => {
  describe('Cmd/Ctrl+N (new conversation)', () => {
    it('fires onNewConversation on Meta+N', () => {
      renderHook(() =>
        useKeyboardShortcuts({ onNewConversation, onSearchOpen }),
      )

      press('n', { metaKey: true })
      expect(onNewConversation).toHaveBeenCalledTimes(1)
    })

    it('fires onNewConversation on Ctrl+N', () => {
      renderHook(() =>
        useKeyboardShortcuts({ onNewConversation, onSearchOpen }),
      )

      press('n', { ctrlKey: true })
      expect(onNewConversation).toHaveBeenCalledTimes(1)
    })

    it('fires onNewConversation on Meta+Shift+N (uppercase N)', () => {
      renderHook(() =>
        useKeyboardShortcuts({ onNewConversation, onSearchOpen }),
      )

      press('N', { metaKey: true })
      expect(onNewConversation).toHaveBeenCalledTimes(1)
    })

    it('calls preventDefault on Meta+N', () => {
      renderHook(() =>
        useKeyboardShortcuts({ onNewConversation, onSearchOpen }),
      )

      const event = press('n', { metaKey: true })
      expect(event.preventDefault).toHaveBeenCalled()
    })
  })

  describe('Cmd/Ctrl+K (search open)', () => {
    it('fires onSearchOpen on Meta+K', () => {
      renderHook(() =>
        useKeyboardShortcuts({ onNewConversation, onSearchOpen }),
      )

      press('k', { metaKey: true })
      expect(onSearchOpen).toHaveBeenCalledTimes(1)
    })

    it('fires onSearchOpen on Ctrl+K', () => {
      renderHook(() =>
        useKeyboardShortcuts({ onNewConversation, onSearchOpen }),
      )

      press('k', { ctrlKey: true })
      expect(onSearchOpen).toHaveBeenCalledTimes(1)
    })

    it('fires onSearchOpen on Meta+Shift+K (uppercase K)', () => {
      renderHook(() =>
        useKeyboardShortcuts({ onNewConversation, onSearchOpen }),
      )

      press('K', { metaKey: true })
      expect(onSearchOpen).toHaveBeenCalledTimes(1)
    })

    it('calls preventDefault on Meta+K', () => {
      renderHook(() =>
        useKeyboardShortcuts({ onNewConversation, onSearchOpen }),
      )

      const event = press('k', { metaKey: true })
      expect(event.preventDefault).toHaveBeenCalled()
    })
  })

  describe('no modifier key', () => {
    it('does not fire any callback when N is pressed without modifier', () => {
      renderHook(() =>
        useKeyboardShortcuts({ onNewConversation, onSearchOpen }),
      )

      press('n')
      expect(onNewConversation).not.toHaveBeenCalled()
      expect(onSearchOpen).not.toHaveBeenCalled()
    })

    it('does not fire any callback when K is pressed without modifier', () => {
      renderHook(() =>
        useKeyboardShortcuts({ onNewConversation, onSearchOpen }),
      )

      press('k')
      expect(onNewConversation).not.toHaveBeenCalled()
      expect(onSearchOpen).not.toHaveBeenCalled()
    })
  })

  describe('unregistered keys', () => {
    it('does not fire any callback for Cmd+other keys', () => {
      renderHook(() =>
        useKeyboardShortcuts({ onNewConversation, onSearchOpen }),
      )

      press('a', { metaKey: true })
      press('z', { metaKey: true })
      press('Enter', { metaKey: true })
      expect(onNewConversation).not.toHaveBeenCalled()
      expect(onSearchOpen).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('removes the event listener on unmount', () => {
      const { unmount } = renderHook(() =>
        useKeyboardShortcuts({ onNewConversation, onSearchOpen }),
      )

      unmount()

      press('n', { metaKey: true })
      press('k', { metaKey: true })
      expect(onNewConversation).not.toHaveBeenCalled()
      expect(onSearchOpen).not.toHaveBeenCalled()
    })
  })

  describe('callback updates', () => {
    it('uses the latest callback references after re-render', () => {
      const firstNew = vi.fn()
      const secondNew = vi.fn()

      const { rerender } = renderHook(
        ({ onNew }) =>
          useKeyboardShortcuts({
            onNewConversation: onNew,
            onSearchOpen,
          }),
        { initialProps: { onNew: firstNew } },
      )

      // Re-render with a new callback
      rerender({ onNew: secondNew })

      press('n', { metaKey: true })
      expect(firstNew).not.toHaveBeenCalled()
      expect(secondNew).toHaveBeenCalledTimes(1)
    })
  })
})
