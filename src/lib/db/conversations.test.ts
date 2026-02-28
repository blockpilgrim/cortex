/**
 * Tests for conversation data access functions.
 *
 * Uses fake-indexeddb to provide an IndexedDB implementation in the jsdom
 * test environment. The database is cleared between tests to prevent state
 * leakage.
 */

import 'fake-indexeddb/auto'

import { db } from '@/lib/db/schema'
import type { ModelConfig } from '@/lib/db/types'

import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  updateConversation,
} from './conversations'
import { addMessage } from './messages'

/** Reusable model config for tests. */
const defaultModelConfig: ModelConfig = {
  claude: 'claude-sonnet-4-20250514',
  chatgpt: 'gpt-4o',
  gemini: 'gemini-2.0-flash',
}

beforeEach(async () => {
  // Clear all tables between tests to ensure isolation
  await db.conversations.clear()
  await db.messages.clear()
  await db.settings.clear()
})

afterAll(async () => {
  await db.delete()
})

describe('createConversation', () => {
  it('returns an auto-generated numeric id', async () => {
    const id = await createConversation({ modelConfig: defaultModelConfig })
    expect(typeof id).toBe('number')
    expect(id).toBeGreaterThan(0)
  })

  it('defaults title to "New Conversation" when not provided', async () => {
    const id = await createConversation({ modelConfig: defaultModelConfig })
    const conv = await db.conversations.get(id)
    expect(conv?.title).toBe('New Conversation')
  })

  it('uses the provided title when given', async () => {
    const id = await createConversation({
      title: 'My Custom Chat',
      modelConfig: defaultModelConfig,
    })
    const conv = await db.conversations.get(id)
    expect(conv?.title).toBe('My Custom Chat')
  })

  it('sets createdAt and updatedAt to the current time', async () => {
    const before = new Date().toISOString()
    const id = await createConversation({ modelConfig: defaultModelConfig })
    const after = new Date().toISOString()

    const conv = await db.conversations.get(id)
    expect(conv).toBeDefined()
    expect(conv!.createdAt).toBeDefined()
    expect(conv!.updatedAt).toBeDefined()
    // Timestamps should be between before and after
    expect(conv!.createdAt >= before).toBe(true)
    expect(conv!.createdAt <= after).toBe(true)
    // createdAt and updatedAt should be equal at creation
    expect(conv!.createdAt).toBe(conv!.updatedAt)
  })

  it('stores the modelConfig correctly', async () => {
    const id = await createConversation({ modelConfig: defaultModelConfig })
    const conv = await db.conversations.get(id)
    expect(conv?.modelConfig).toEqual(defaultModelConfig)
  })

  it('generates unique ids for multiple conversations', async () => {
    const id1 = await createConversation({ modelConfig: defaultModelConfig })
    const id2 = await createConversation({ modelConfig: defaultModelConfig })
    const id3 = await createConversation({ modelConfig: defaultModelConfig })
    expect(new Set([id1, id2, id3]).size).toBe(3)
  })
})

describe('getConversation', () => {
  it('retrieves a conversation by id', async () => {
    const id = await createConversation({
      title: 'Test Conversation',
      modelConfig: defaultModelConfig,
    })
    const conv = await getConversation(id)
    expect(conv).toBeDefined()
    expect(conv!.id).toBe(id)
    expect(conv!.title).toBe('Test Conversation')
    expect(conv!.modelConfig).toEqual(defaultModelConfig)
  })

  it('returns undefined for a non-existent id', async () => {
    const conv = await getConversation(99999)
    expect(conv).toBeUndefined()
  })
})

describe('listConversations', () => {
  it('returns an empty array when no conversations exist', async () => {
    const conversations = await listConversations()
    expect(conversations).toEqual([])
  })

  it('returns conversations ordered by updatedAt descending (most recent first)', async () => {
    // Create conversations with slight time gaps
    const id1 = await createConversation({
      title: 'First',
      modelConfig: defaultModelConfig,
    })
    // Ensure different updatedAt values
    await new Promise((resolve) => setTimeout(resolve, 10))
    const id2 = await createConversation({
      title: 'Second',
      modelConfig: defaultModelConfig,
    })
    await new Promise((resolve) => setTimeout(resolve, 10))
    const id3 = await createConversation({
      title: 'Third',
      modelConfig: defaultModelConfig,
    })

    const conversations = await listConversations()
    expect(conversations).toHaveLength(3)
    // Most recently created (therefore most recently updated) should be first
    expect(conversations[0].id).toBe(id3)
    expect(conversations[1].id).toBe(id2)
    expect(conversations[2].id).toBe(id1)
  })

  it('reflects updated order when a conversation is updated', async () => {
    const id1 = await createConversation({
      title: 'First',
      modelConfig: defaultModelConfig,
    })
    await new Promise((resolve) => setTimeout(resolve, 10))
    const id2 = await createConversation({
      title: 'Second',
      modelConfig: defaultModelConfig,
    })

    // Before update: id2 should be first (most recent)
    let conversations = await listConversations()
    expect(conversations[0].id).toBe(id2)

    // Update id1 — this should bump its updatedAt
    await new Promise((resolve) => setTimeout(resolve, 10))
    await updateConversation(id1, { title: 'First (Updated)' })

    // After update: id1 should now be first
    conversations = await listConversations()
    expect(conversations[0].id).toBe(id1)
    expect(conversations[0].title).toBe('First (Updated)')
  })
})

describe('updateConversation', () => {
  it('updates the title and bumps updatedAt', async () => {
    const id = await createConversation({
      title: 'Original Title',
      modelConfig: defaultModelConfig,
    })
    const original = await getConversation(id)

    await new Promise((resolve) => setTimeout(resolve, 10))
    const updated = await updateConversation(id, { title: 'Updated Title' })

    expect(updated).toBe(1) // 1 record updated

    const conv = await getConversation(id)
    expect(conv!.title).toBe('Updated Title')
    expect(conv!.updatedAt > original!.updatedAt).toBe(true)
    // createdAt should not change
    expect(conv!.createdAt).toBe(original!.createdAt)
  })

  it('updates the modelConfig', async () => {
    const id = await createConversation({ modelConfig: defaultModelConfig })

    const newConfig: ModelConfig = {
      claude: 'claude-opus-4-20250514',
      chatgpt: 'gpt-4-turbo',
      gemini: 'gemini-1.5-pro',
    }
    await updateConversation(id, { modelConfig: newConfig })

    const conv = await getConversation(id)
    expect(conv!.modelConfig).toEqual(newConfig)
  })

  it('returns 0 when updating a non-existent conversation', async () => {
    const result = await updateConversation(99999, { title: 'Ghost' })
    expect(result).toBe(0)
  })

  it('only updates the fields provided (partial update)', async () => {
    const id = await createConversation({
      title: 'Keep Me',
      modelConfig: defaultModelConfig,
    })

    // Update only title, modelConfig should remain unchanged
    await updateConversation(id, { title: 'Changed' })
    const conv = await getConversation(id)
    expect(conv!.title).toBe('Changed')
    expect(conv!.modelConfig).toEqual(defaultModelConfig)
  })
})

describe('deleteConversation', () => {
  it('removes the conversation from the database', async () => {
    const id = await createConversation({ modelConfig: defaultModelConfig })
    expect(await getConversation(id)).toBeDefined()

    await deleteConversation(id)
    expect(await getConversation(id)).toBeUndefined()
  })

  it('cascade-deletes all associated messages', async () => {
    const id = await createConversation({ modelConfig: defaultModelConfig })

    // Add messages to this conversation
    await addMessage({
      conversationId: id,
      provider: 'claude',
      role: 'user',
      content: 'Hello from user',
    })
    await addMessage({
      conversationId: id,
      provider: 'claude',
      role: 'assistant',
      content: 'Hello from Claude',
    })
    await addMessage({
      conversationId: id,
      provider: 'chatgpt',
      role: 'user',
      content: 'Hello from user',
    })

    // Verify messages exist
    const messagesBefore = await db.messages
      .where('conversationId')
      .equals(id)
      .count()
    expect(messagesBefore).toBe(3)

    // Delete the conversation
    await deleteConversation(id)

    // Verify all messages are gone
    const messagesAfter = await db.messages
      .where('conversationId')
      .equals(id)
      .count()
    expect(messagesAfter).toBe(0)
  })

  it('does not delete messages from other conversations', async () => {
    const id1 = await createConversation({ modelConfig: defaultModelConfig })
    const id2 = await createConversation({ modelConfig: defaultModelConfig })

    await addMessage({
      conversationId: id1,
      provider: 'claude',
      role: 'user',
      content: 'Conversation 1 message',
    })
    await addMessage({
      conversationId: id2,
      provider: 'claude',
      role: 'user',
      content: 'Conversation 2 message',
    })

    await deleteConversation(id1)

    // Conversation 2's messages should still exist
    const remaining = await db.messages
      .where('conversationId')
      .equals(id2)
      .count()
    expect(remaining).toBe(1)
  })

  it('does not throw when deleting a non-existent conversation', async () => {
    // Should complete without error
    await expect(deleteConversation(99999)).resolves.toBeUndefined()
  })
})
