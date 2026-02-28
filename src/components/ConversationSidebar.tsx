/**
 * Conversation sidebar — lists past conversations and allows switching.
 *
 * On desktop (md+), renders as an inline sidebar panel.
 * On mobile (<md), renders as a Sheet overlay.
 */

import { useLiveQuery } from 'dexie-react-hooks'
import { MessageSquareIcon, PlusIcon } from 'lucide-react'
import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { db } from '@/lib/db'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'

interface ConversationSidebarProps {
  onNewConversation: () => void
}

export function ConversationSidebar({
  onNewConversation,
}: ConversationSidebarProps) {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)

  const handleCloseSheet = useCallback(
    () => setSidebarOpen(false),
    [setSidebarOpen],
  )

  return (
    <>
      {/* Desktop: inline sidebar — stays open on interaction */}
      {sidebarOpen && (
        <aside
          role="navigation"
          className="border-border bg-background hidden w-64 shrink-0 border-r md:block"
        >
          <SidebarContent onNewConversation={onNewConversation} />
        </aside>
      )}

      {/* Mobile: Sheet overlay — closes on interaction */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0 md:hidden"
          aria-describedby={undefined}
        >
          <SheetHeader className="border-border border-b px-4 py-3">
            <SheetTitle>Conversations</SheetTitle>
            <SheetDescription className="sr-only">
              Browse and select conversations
            </SheetDescription>
          </SheetHeader>
          <SidebarContent
            onNewConversation={onNewConversation}
            onAfterAction={handleCloseSheet}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}

/**
 * Shared sidebar content used by both desktop and mobile variants.
 *
 * `onAfterAction` is called after selecting a conversation or creating a new one.
 * The mobile Sheet passes a close handler; the desktop variant omits it so the
 * sidebar stays open on interaction.
 */
function SidebarContent({
  onNewConversation,
  onAfterAction,
}: {
  onNewConversation: () => void
  onAfterAction?: () => void
}) {
  const activeConversationId = useAppStore((s) => s.activeConversationId)
  const setActiveConversationId = useAppStore((s) => s.setActiveConversationId)

  const conversations = useLiveQuery(
    () => db.conversations.orderBy('updatedAt').reverse().toArray(),
    [],
  )

  const handleSelect = useCallback(
    (id: number) => {
      setActiveConversationId(id)
      onAfterAction?.()
    },
    [setActiveConversationId, onAfterAction],
  )

  const handleNewConversation = useCallback(() => {
    onNewConversation()
    onAfterAction?.()
  }, [onNewConversation, onAfterAction])

  return (
    <div className="flex h-full flex-col">
      <div className="p-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleNewConversation}
        >
          <PlusIcon className="h-4 w-4" />
          New conversation
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 p-2">
          {conversations === undefined ? (
            <div className="text-muted-foreground px-2 py-4 text-center text-sm">
              Loading...
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-muted-foreground px-2 py-4 text-center text-sm">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => conv.id !== undefined && handleSelect(conv.id)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  activeConversationId === conv.id
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground',
                )}
              >
                <MessageSquareIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">{conv.title}</span>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
