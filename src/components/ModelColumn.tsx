/**
 * Model column — displays messages for a single AI provider.
 *
 * Wrapped in React.memo for stream isolation (Phase 6+).
 * Currently renders messages from Dexie for the active conversation,
 * or an empty state placeholder.
 */

import { memo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getMessagesByThread } from '@/lib/db'
import type { Message, Provider } from '@/lib/db/types'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'

interface ModelColumnProps {
  provider: Provider
  label: string
}

/** Provider-specific accent colors for column headers. */
const PROVIDER_COLORS: Record<Provider, string> = {
  claude: 'bg-chart-1',
  chatgpt: 'bg-chart-2',
  gemini: 'bg-chart-3',
}

export const ModelColumn = memo(function ModelColumn({
  provider,
  label,
}: ModelColumnProps) {
  const activeConversationId = useAppStore((s) => s.activeConversationId)

  const messages = useLiveQuery(() => {
    if (activeConversationId === null) return [] as Message[]
    return getMessagesByThread(activeConversationId, provider)
  }, [activeConversationId, provider])

  return (
    <div className="border-border flex min-h-0 flex-1 flex-col border-r last:border-r-0 md:border-r">
      {/* Column header */}
      <div className="border-border flex items-center gap-2 border-b px-3 py-2">
        <div
          className={cn('h-2 w-2 rounded-full', PROVIDER_COLORS[provider])}
        />
        <span className="text-foreground text-sm font-medium">{label}</span>
      </div>

      {/* Message area */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-3">
          {messages === undefined ? (
            <EmptyState text="Loading..." />
          ) : messages.length === 0 ? (
            <EmptyState
              text={
                activeConversationId === null
                  ? `Start a conversation to see ${label} responses`
                  : `No messages from ${label} yet`
              }
            />
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm',
                  msg.role === 'user'
                    ? 'bg-muted text-muted-foreground self-end'
                    : 'bg-card text-card-foreground self-start',
                )}
              >
                {msg.content}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
})

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-muted-foreground flex flex-1 items-center justify-center py-12 text-center text-sm">
      {text}
    </div>
  )
}
