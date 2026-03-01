/**
 * Unit tests for cross-feed message construction utilities.
 *
 * Covers:
 * - buildCrossFeedMessages: each provider receives the other two providers' responses
 * - findLastAssistant: finding the last assistant message in an array
 * - getNextCrossFeedRound: computing the next round number across message arrays
 */

import type { Message } from '@/lib/db/types'
import {
  buildCrossFeedMessages,
  findLastAssistant,
  getNextCrossFeedRound,
} from '@/lib/crossfeed'

/** Helper to create a minimal Message for testing. */
function makeMessage(
  overrides: Partial<Message> & { role: Message['role'] },
): Message {
  return {
    conversationId: 1,
    provider: 'claude',
    role: overrides.role,
    content: overrides.content ?? 'Test content',
    timestamp: overrides.timestamp ?? '2026-03-01T12:00:00.000Z',
    tokenCount: overrides.tokenCount ?? null,
    isCrossFeed: overrides.isCrossFeed ?? false,
    crossFeedRound: overrides.crossFeedRound ?? null,
    ...overrides,
  }
}

describe('buildCrossFeedMessages', () => {
  const input = {
    claude: 'Claude says hello',
    chatgpt: 'ChatGPT says hi',
    gemini: 'Gemini says greetings',
  }

  it('returns messages for all three providers', () => {
    const result = buildCrossFeedMessages(input)
    expect(result).toHaveProperty('claude')
    expect(result).toHaveProperty('chatgpt')
    expect(result).toHaveProperty('gemini')
  })

  it('gives Claude a message containing ChatGPT and Gemini responses, not its own', () => {
    const result = buildCrossFeedMessages(input)
    expect(result.claude).toContain('ChatGPT says hi')
    expect(result.claude).toContain('Gemini says greetings')
    expect(result.claude).not.toContain('Claude says hello')
  })

  it('gives ChatGPT a message containing Claude and Gemini responses, not its own', () => {
    const result = buildCrossFeedMessages(input)
    expect(result.chatgpt).toContain('Claude says hello')
    expect(result.chatgpt).toContain('Gemini says greetings')
    expect(result.chatgpt).not.toContain('ChatGPT says hi')
  })

  it('gives Gemini a message containing Claude and ChatGPT responses, not its own', () => {
    const result = buildCrossFeedMessages(input)
    expect(result.gemini).toContain('Claude says hello')
    expect(result.gemini).toContain('ChatGPT says hi')
    expect(result.gemini).not.toContain('Gemini says greetings')
  })

  it('includes provider labels in bold formatting', () => {
    const result = buildCrossFeedMessages(input)
    // Claude's message should label the other providers
    expect(result.claude).toContain("**ChatGPT's response:**")
    expect(result.claude).toContain("**Gemini's response:**")

    // ChatGPT's message should label the other providers
    expect(result.chatgpt).toContain("**Claude's response:**")
    expect(result.chatgpt).toContain("**Gemini's response:**")

    // Gemini's message should label the other providers
    expect(result.gemini).toContain("**Claude's response:**")
    expect(result.gemini).toContain("**ChatGPT's response:**")
  })

  it('includes the review prompt at the end of each message', () => {
    const result = buildCrossFeedMessages(input)
    const reviewPrompt =
      'Please review these responses and share your perspective.'
    expect(result.claude).toContain(reviewPrompt)
    expect(result.chatgpt).toContain(reviewPrompt)
    expect(result.gemini).toContain(reviewPrompt)
  })

  it('includes the leading context line about other models', () => {
    const result = buildCrossFeedMessages(input)
    const contextLine =
      "Here are the other models' responses to the same prompt:"
    expect(result.claude).toContain(contextLine)
    expect(result.chatgpt).toContain(contextLine)
    expect(result.gemini).toContain(contextLine)
  })

  it('handles empty string responses without error', () => {
    const emptyInput = { claude: '', chatgpt: '', gemini: '' }
    const result = buildCrossFeedMessages(emptyInput)
    expect(result.claude).toBeDefined()
    expect(result.chatgpt).toBeDefined()
    expect(result.gemini).toBeDefined()
  })

  it('handles responses containing special characters', () => {
    const specialInput = {
      claude: 'Contains **markdown** and `code`',
      chatgpt: 'Has <html> tags & "quotes"',
      gemini: 'Unicode: \u00e9\u00e0\u00fc and emojis',
    }
    const result = buildCrossFeedMessages(specialInput)
    expect(result.chatgpt).toContain('Contains **markdown** and `code`')
    expect(result.claude).toContain('Has <html> tags & "quotes"')
    expect(result.claude).toContain('Unicode: \u00e9\u00e0\u00fc and emojis')
  })
})

describe('findLastAssistant', () => {
  it('returns null for an empty array', () => {
    expect(findLastAssistant([])).toBeNull()
  })

  it('returns null when no assistant messages exist', () => {
    const messages = [
      makeMessage({ role: 'user', content: 'Question 1' }),
      makeMessage({ role: 'user', content: 'Question 2' }),
    ]
    expect(findLastAssistant(messages)).toBeNull()
  })

  it('returns the only assistant message when there is one', () => {
    const assistantMsg = makeMessage({
      role: 'assistant',
      content: 'The answer',
    })
    const messages = [
      makeMessage({ role: 'user', content: 'Question' }),
      assistantMsg,
    ]
    expect(findLastAssistant(messages)).toBe(assistantMsg)
  })

  it('returns the last assistant message when multiple exist', () => {
    const first = makeMessage({ role: 'assistant', content: 'First response' })
    const second = makeMessage({
      role: 'assistant',
      content: 'Second response',
    })
    const third = makeMessage({ role: 'assistant', content: 'Third response' })
    const messages = [
      makeMessage({ role: 'user', content: 'Q1' }),
      first,
      makeMessage({ role: 'user', content: 'Q2' }),
      second,
      makeMessage({ role: 'user', content: 'Q3' }),
      third,
    ]
    expect(findLastAssistant(messages)).toBe(third)
  })

  it('returns the last assistant even if followed by user messages', () => {
    const assistant = makeMessage({
      role: 'assistant',
      content: 'A response',
    })
    const messages = [
      makeMessage({ role: 'user', content: 'Q1' }),
      assistant,
      makeMessage({ role: 'user', content: 'Q2' }),
      makeMessage({ role: 'user', content: 'Q3' }),
    ]
    expect(findLastAssistant(messages)).toBe(assistant)
  })

  it('handles an array of only assistant messages', () => {
    const last = makeMessage({
      role: 'assistant',
      content: 'Last of many',
    })
    const messages = [
      makeMessage({ role: 'assistant', content: 'First' }),
      makeMessage({ role: 'assistant', content: 'Second' }),
      last,
    ]
    expect(findLastAssistant(messages)).toBe(last)
  })
})

describe('getNextCrossFeedRound', () => {
  it('returns 1 when no messages have crossFeedRound set', () => {
    const messages = [
      makeMessage({ role: 'user', crossFeedRound: null }),
      makeMessage({ role: 'assistant', crossFeedRound: null }),
    ]
    expect(getNextCrossFeedRound(messages)).toBe(1)
  })

  it('returns 1 for empty arrays', () => {
    expect(getNextCrossFeedRound([])).toBe(1)
  })

  it('returns 1 when called with no arguments', () => {
    expect(getNextCrossFeedRound()).toBe(1)
  })

  it('returns max + 1 for a single array with crossFeedRound values', () => {
    const messages = [
      makeMessage({ role: 'user', crossFeedRound: 1, isCrossFeed: true }),
      makeMessage({ role: 'assistant', crossFeedRound: 1, isCrossFeed: true }),
      makeMessage({ role: 'user', crossFeedRound: 2, isCrossFeed: true }),
      makeMessage({ role: 'assistant', crossFeedRound: 2, isCrossFeed: true }),
    ]
    expect(getNextCrossFeedRound(messages)).toBe(3)
  })

  it('returns max + 1 across multiple arrays', () => {
    const claudeMessages = [
      makeMessage({
        role: 'user',
        crossFeedRound: 1,
        provider: 'claude',
        isCrossFeed: true,
      }),
    ]
    const chatgptMessages = [
      makeMessage({
        role: 'user',
        crossFeedRound: 3,
        provider: 'chatgpt',
        isCrossFeed: true,
      }),
    ]
    const geminiMessages = [
      makeMessage({
        role: 'user',
        crossFeedRound: 2,
        provider: 'gemini',
        isCrossFeed: true,
      }),
    ]
    expect(
      getNextCrossFeedRound(claudeMessages, chatgptMessages, geminiMessages),
    ).toBe(4)
  })

  it('ignores messages with null crossFeedRound', () => {
    const messages = [
      makeMessage({ role: 'user', crossFeedRound: null }),
      makeMessage({ role: 'assistant', crossFeedRound: null }),
      makeMessage({ role: 'user', crossFeedRound: 2, isCrossFeed: true }),
      makeMessage({ role: 'assistant', crossFeedRound: null }),
    ]
    expect(getNextCrossFeedRound(messages)).toBe(3)
  })

  it('handles multiple empty arrays', () => {
    expect(getNextCrossFeedRound([], [], [])).toBe(1)
  })

  it('handles mix of empty and populated arrays', () => {
    const populated = [
      makeMessage({ role: 'user', crossFeedRound: 5, isCrossFeed: true }),
    ]
    expect(getNextCrossFeedRound([], populated, [])).toBe(6)
  })

  it('handles arrays where all crossFeedRound values are null', () => {
    const arr1 = [makeMessage({ role: 'user', crossFeedRound: null })]
    const arr2 = [makeMessage({ role: 'assistant', crossFeedRound: null })]
    expect(getNextCrossFeedRound(arr1, arr2)).toBe(1)
  })
})
