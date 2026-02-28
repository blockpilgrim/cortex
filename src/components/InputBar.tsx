/**
 * Shared input bar pinned to the bottom of the main content area.
 *
 * Currently a placeholder — send functionality comes in Phase 5.
 * Disabled when no API keys are configured.
 */

import { SendIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db } from '@/lib/db'

export function InputBar() {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Check if any API keys are configured
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const hasApiKeys =
    settings !== undefined &&
    settings !== null &&
    (settings.apiKeys.claude !== '' ||
      settings.apiKeys.chatgpt !== '' ||
      settings.apiKeys.gemini !== '')

  const isDisabled = !hasApiKeys

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isDisabled) return

    // Placeholder — actual send logic comes in Phase 5
    setValue('')
    inputRef.current?.focus()
  }, [value, isDisabled])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  return (
    <div className="border-border bg-background shrink-0 border-t px-4 py-3">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isDisabled
              ? 'Configure API keys in settings to start...'
              : 'Ask all three models...'
          }
          disabled={isDisabled}
          className="flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={isDisabled || value.trim() === ''}
          size="icon"
          aria-label="Send message"
        >
          <SendIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
