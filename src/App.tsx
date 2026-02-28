/**
 * App shell -- the root layout component for Cortex.
 *
 * Layout structure:
 * - TopBar (fixed height)
 * - Content area (fills remaining height):
 *   - ConversationSidebar (desktop: inline, mobile: Sheet overlay)
 *   - Main area:
 *     - Three model columns (flex-row on desktop, flex-col stacked on mobile)
 *     - InputBar pinned to bottom
 *
 * Orchestrates sending messages to all providers concurrently.
 * On first message, auto-creates a conversation in Dexie.
 */

import { useCallback, useRef } from 'react'
import { TopBar } from '@/components/TopBar'
import { ConversationSidebar } from '@/components/ConversationSidebar'
import { ModelColumn } from '@/components/ModelColumn'
import type { ModelColumnHandle } from '@/components/ModelColumn'
import { InputBar } from '@/components/InputBar'
import { useAppStore } from '@/lib/store'
import { createConversation, updateConversation } from '@/lib/db'

function App() {
  const activeConversationId = useAppStore((s) => s.activeConversationId)
  const setActiveConversationId = useAppStore((s) => s.setActiveConversationId)
  const selectedModels = useAppStore((s) => s.selectedModels)
  const streamingStatus = useAppStore((s) => s.streamingStatus)

  // Derived streaming state from the Zustand store (safe to read during render)
  const isAnyStreaming =
    streamingStatus.claude || streamingStatus.chatgpt || streamingStatus.gemini

  // Refs to each model column's imperative handle (only accessed in callbacks)
  const claudeRef = useRef<ModelColumnHandle>(null)
  const chatgptRef = useRef<ModelColumnHandle>(null)
  const geminiRef = useRef<ModelColumnHandle>(null)

  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null)
  }, [setActiveConversationId])

  const handleSend = useCallback(
    async (text: string) => {
      let conversationId = activeConversationId

      // Auto-create a conversation if none is active
      if (conversationId === null) {
        conversationId = await createConversation({
          title: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
          modelConfig: { ...selectedModels },
        })
        setActiveConversationId(conversationId)

        // Allow the state update and useProviderChat seeding effect to settle.
        // The seeding effect runs on conversationId change; without this delay,
        // send() fires before the hook sees the new ID. This is a known
        // timing-based workaround — may be replaced with a ref-based queue or
        // callback pattern if it proves flaky on slower devices.
        await new Promise((resolve) => setTimeout(resolve, 50))
      } else {
        // Update the conversation's updatedAt timestamp
        await updateConversation(conversationId, {})
      }

      // Send to all three providers concurrently via imperative handles.
      // Each send() is independent -- Promise.allSettled ensures one provider
      // failing does not block or affect the others.
      const sendPromises: Promise<boolean>[] = []
      if (claudeRef.current) {
        sendPromises.push(claudeRef.current.send(text))
      }
      if (chatgptRef.current) {
        sendPromises.push(chatgptRef.current.send(text))
      }
      if (geminiRef.current) {
        sendPromises.push(geminiRef.current.send(text))
      }

      await Promise.allSettled(sendPromises)
    },
    [activeConversationId, setActiveConversationId, selectedModels],
  )

  return (
    <div className="bg-background flex h-dvh flex-col">
      <TopBar onNewConversation={handleNewConversation} />

      <div className="flex min-h-0 flex-1">
        <ConversationSidebar onNewConversation={handleNewConversation} />

        {/* Main content area */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Model columns: 3-column grid on desktop, stacked on mobile */}
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <ModelColumn ref={claudeRef} provider="claude" label="Claude" />
            <ModelColumn ref={chatgptRef} provider="chatgpt" label="ChatGPT" />
            <ModelColumn ref={geminiRef} provider="gemini" label="Gemini" />
          </div>

          <InputBar onSend={handleSend} isStreaming={isAnyStreaming} />
        </main>
      </div>
    </div>
  )
}

export default App
