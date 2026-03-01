/**
 * Global keyboard shortcuts for the application.
 *
 * Shortcuts:
 * - Cmd/Ctrl+N: New conversation (overrides browser "new window" — intentional trade-off
 *   for a single-user power-tool where new-conversation is the primary action)
 * - Cmd/Ctrl+K: Open conversation search
 *
 * These use Cmd/Ctrl modifiers, which do not conflict with normal text entry
 * in inputs/textareas (modifier+key combos are not used for typing).
 */

import { useEffect } from 'react'

interface UseKeyboardShortcutsOptions {
  /** Handler for Cmd/Ctrl+N: create new conversation. */
  onNewConversation: () => void
  /** Handler for Cmd/Ctrl+K: open conversation search. */
  onSearchOpen: () => void
}

export function useKeyboardShortcuts({
  onNewConversation,
  onSearchOpen,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey

      if (!mod) return

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        onNewConversation()
      }

      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        onSearchOpen()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onNewConversation, onSearchOpen])
}
