/**
 * App shell — the root layout component for Cortex.
 *
 * Layout structure:
 * - TopBar (fixed height)
 * - Content area (fills remaining height):
 *   - ConversationSidebar (desktop: inline, mobile: Sheet overlay)
 *   - Main area:
 *     - Three model columns (flex-row on desktop, flex-col stacked on mobile)
 *     - InputBar pinned to bottom
 */

import { useCallback } from 'react'
import { TopBar } from '@/components/TopBar'
import { ConversationSidebar } from '@/components/ConversationSidebar'
import { ModelColumn } from '@/components/ModelColumn'
import { InputBar } from '@/components/InputBar'
import { useAppStore } from '@/lib/store'

function App() {
  const setActiveConversationId = useAppStore((s) => s.setActiveConversationId)

  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null)
  }, [setActiveConversationId])

  return (
    <div className="bg-background flex h-dvh flex-col">
      <TopBar onNewConversation={handleNewConversation} />

      <div className="flex min-h-0 flex-1">
        <ConversationSidebar onNewConversation={handleNewConversation} />

        {/* Main content area */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Model columns: 3-column grid on desktop, stacked on mobile */}
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <ModelColumn provider="claude" label="Claude" />
            <ModelColumn provider="chatgpt" label="ChatGPT" />
            <ModelColumn provider="gemini" label="Gemini" />
          </div>

          <InputBar />
        </main>
      </div>
    </div>
  )
}

export default App
