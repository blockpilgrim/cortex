/**
 * Tests for message data access functions.
 *
 * Uses fake-indexeddb to provide an IndexedDB implementation in the jsdom
 * test environment. The database is cleared between tests to prevent state
 * leakage.
 */

import 'fake-indexeddb/auto'

import { db } from '@/lib/db/schema'
import type { ModelConfig } from '@/lib/db/types'

import { createConversation } from './conversations'
import {
  addMessage,
  getMessagesByConversation,
  getMessagesByThread,
} from './messages'

/** Reusable model config for tests. */
const defaultModelConfig: ModelConfig = {
  claude: 'claude-sonnet-4-20250514',
  chatgpt: 'gpt-4o',
  gemini: 'gemini-2.0-flash',
}

/** Helper: create a conversation and return its id. */
async function createTestConversation(): Promise<number> {
  return createConversation({ modelConfig: defaultModelConfig })
}

beforeEach(async () => {
  await db.conversations.clear()
  await db.messages.clear()
  await db.settings.clear()
})

afterAll(async () => {
  await db.delete()
})

describe('addMessage', () => {
  it('returns an auto-generated numeric id', async () => {
    const convId = await createTestConversation()
    const id = await addMessage({
      conversationId: convId,
      provider: 'claude',
      role: 'user',
      content: 'Hello',
    })
    expect(typeof id).toBe('number')
    expect(id).toBeGreaterThan(0)
  })

  it('sets defaults: tokenCount null, isCrossFeed false, crossFeedRound null', async () => {
    const convId = await createTestConversation()
    const id = await addMessage({
      conversationId: convId,
      provider: 'claude',
      role: 'user',
      content: 'Hello',
    })

    const msg = await db.messages.get(id)
    expect(msg).toBeDefined()
    expect(msg!.tokenCount).toBeNull()
    expect(msg!.isCrossFeed).toBe(false)
    expect(msg!.crossFeedRound).toBeNull()
  })

  it('sets timestamp to the current time', async () => {
    const convId = await createTestConversation()
    const before = new Date().toISOString()
    const id = await addMessage({
      conversationId: convId,
      provider: 'chatgpt',
      role: 'assistant',
      content: 'Hi there',
    })
    const after = new Date().toISOString()

    const msg = await db.messages.get(id)
    expect(msg!.timestamp >= before).toBe(true)
    expect(msg!.timestamp <= after).toBe(true)
  })

  it('stores all provided fields correctly', async () => {
    const convId = await createTestConversation()
    const id = await addMessage({
      conversationId: convId,
      provider: 'gemini',
      role: 'assistant',
      content: 'Cross-feed response',
      tokenCount: { input: 150, output: 200 },
      isCrossFeed: true,
      crossFeedRound: 2,
    })

    const msg = await db.messages.get(id)
    expect(msg!.conversationId).toBe(convId)
    expect(msg!.provider).toBe('gemini')
    expect(msg!.role).toBe('assistant')
    expect(msg!.content).toBe('Cross-feed response')
    expect(msg!.tokenCount).toEqual({ input: 150, output: 200 })
    expect(msg!.isCrossFeed).toBe(true)
    expect(msg!.crossFeedRound).toBe(2)
  })

  it('generates unique ids for multiple messages', async () => {
    const convId = await createTestConversation()
    const id1 = await addMessage({
      conversationId: convId,
      provider: 'claude',
      role: 'user',
      content: 'First',
    })
    const id2 = await addMessage({
      conversationId: convId,
      provider: 'claude',
      role: 'assistant',
      content: 'Second',
    })
    expect(id1).not.toBe(id2)
  })
})

describe('getMessagesByThread', () => {
  it('returns only messages for the specified conversation + provider', async () => {
    const convId = await createTestConversation()

    await addMessage({
      conversationId: convId,
      provider: 'claude',
      role: 'user',
      content: 'Claude message',
    })
    await addMessage({
      conversationId: convId,
      provider: 'chatgpt',
      role: 'user',
      content: 'ChatGPT message',
    })
    await addMessage({
      conversationId: convId,
      provider: 'gemini',
      role: 'user',
      content: 'Gemini message',
    })

    const claudeMessages = await getMessagesByThread(convId, 'claude')
    expect(claudeMessages).toHaveLength(1)
    expect(claudeMessages[0].content).toBe('Claude message')
    expect(claudeMessages[0].provider).toBe('claude')

    const chatgptMessages = await getMessagesByThread(convId, 'chatgpt')
    expect(chatgptMessages).toHaveLength(1)
    expect(chatgptMessages[0].content).toBe('ChatGPT message')
  })

  it('returns messages ordered by timestamp ascending', async () => {
    const convId = await createTestConversation()

    await addMessage({
      conversationId: convId,
      provider: 'claude',
      role: 'user',
      content: 'First',
    })
    await new Promise((resolve) => setTimeout(resolve, 10))
    await addMessage({
      conversationId: convId,
      provider: 'claude',
      role: 'assistant',
      content: 'Second',
    })
    await new Promise((resolve) => setTimeout(resolve, 10))
    await addMessage({
      conversationId: convId,
      provider: 'claude',
      role: 'user',
      content: 'Third',
    })

    const messages = await getMessagesByThread(convId, 'claude')
    expect(messages).toHaveLength(3)
    expect(messages[0].content).toBe('First')
    expect(messages[1].content).toBe('Second')
    expect(messages[2].content).toBe('Third')

    // Verify timestamps are in ascending order
    for (let i = 1; i < messages.length; i++) {
      expect(messages[i].timestamp >= messages[i - 1].timestamp).toBe(true)
    }
  })

  it('returns an empty array when no messages exist for the thread', async () => {
    const convId = await createTestConversation()
    const messages = await getMessagesByThread(convId, 'claude')
    expect(messages).toEqual([])
  })

  it('does not return messages from other conversations', async () => {
    const convId1 = await createTestConversation()
    const convId2 = await createTestConversation()

    await addMessage({
      conversationId: convId1,
      provider: 'claude',
      role: 'user',
      content: 'Conversation 1',
    })
    await addMessage({
      conversationId: convId2,
      provider: 'claude',
      role: 'user',
      content: 'Conversation 2',
    })

    const messages = await getMessagesByThread(convId1, 'claude')
    expect(messages).toHaveLength(1)
    expect(messages[0].content).toBe('Conversation 1')
  })
})

describe('getMessagesByConversation', () => {
  it('returns all messages across all providers for a conversation', async () => {
    const convId = await createTestConversation()

    await addMessage({
      conversationId: convId,
      provider: 'claude',
      role: 'user',
      content: 'Claude',
    })
    await addMessage({
      conversationId: convId,
      provider: 'chatgpt',
      role: 'user',
      content: 'ChatGPT',
    })
    await addMessage({
      conversationId: convId,
      provider: 'gemini',
      role: 'user',
      content: 'Gemini',
    })

    const messages = await getMessagesByConversation(convId)
    expect(messages).toHaveLength(3)

    const providers = messages.map((m) => m.provider)
    expect(providers).toContain('claude')
    expect(providers).toContain('chatgpt')
    expect(providers).toContain('gemini')
  })

  it('returns messages ordered by timestamp ascending', async () => {
    const convId = await createTestConversation()

    await addMessage({
      conversationId: convId,
      provider: 'claude',
      role: 'user',
      content: 'First (claude)',
    })
    await new Promise((resolve) => setTimeout(resolve, 10))
    await addMessage({
      conversationId: convId,
      provider: 'chatgpt',
      role: 'user',
      content: 'Second (chatgpt)',
    })
    await new Promise((resolve) => setTimeout(resolve, 10))
    await addMessage({
      conversationId: convId,
      provider: 'gemini',
      role: 'user',
      content: 'Third (gemini)',
    })

    const messages = await getMessagesByConversation(convId)
    expect(messages).toHaveLength(3)
    expect(messages[0].content).toBe('First (claude)')
    expect(messages[1].content).toBe('Second (chatgpt)')
    expect(messages[2].content).toBe('Third (gemini)')

    // Verify timestamps are in ascending order
    for (let i = 1; i < messages.length; i++) {
      expect(messages[i].timestamp >= messages[i - 1].timestamp).toBe(true)
    }
  })

  it('returns an empty array when no messages exist for the conversation', async () => {
    const convId = await createTestConversation()
    const messages = await getMessagesByConversation(convId)
    expect(messages).toEqual([])
  })

  it('does not return messages from other conversations', async () => {
    const convId1 = await createTestConversation()
    const convId2 = await createTestConversation()

    await addMessage({
      conversationId: convId1,
      provider: 'claude',
      role: 'user',
      content: 'Belongs to conv 1',
    })
    await addMessage({
      conversationId: convId2,
      provider: 'claude',
      role: 'user',
      content: 'Belongs to conv 2',
    })

    const messages1 = await getMessagesByConversation(convId1)
    expect(messages1).toHaveLength(1)
    expect(messages1[0].content).toBe('Belongs to conv 1')

    const messages2 = await getMessagesByConversation(convId2)
    expect(messages2).toHaveLength(1)
    expect(messages2[0].content).toBe('Belongs to conv 2')
  })

  it('includes cross-feed and non-cross-feed messages', async () => {
    const convId = await createTestConversation()

    await addMessage({
      conversationId: convId,
      provider: 'claude',
      role: 'user',
      content: 'Normal message',
    })
    await new Promise((resolve) => setTimeout(resolve, 10))
    await addMessage({
      conversationId: convId,
      provider: 'claude',
      role: 'assistant',
      content: 'Cross-feed reply',
      isCrossFeed: true,
      crossFeedRound: 1,
    })

    const messages = await getMessagesByConversation(convId)
    expect(messages).toHaveLength(2)
    expect(messages[0].isCrossFeed).toBe(false)
    expect(messages[1].isCrossFeed).toBe(true)
    expect(messages[1].crossFeedRound).toBe(1)
  })
})
