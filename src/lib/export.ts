/**
 * Export serialization utilities.
 *
 * Pure functions for converting conversations and messages into JSON and
 * Markdown formats. These functions only transform data — they never read
 * from or write to IndexedDB, and they never delete anything.
 */

import type { Conversation, Message, Provider } from '@/lib/db/types'
import { PROVIDER_LABELS, PROVIDERS } from '@/lib/models'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A conversation with its messages, ready for export. */
export interface ExportableConversation {
  conversation: Conversation
  messages: Message[]
}

/** JSON export format for a single conversation. */
export interface ConversationExportJson {
  id: number
  title: string
  createdAt: string
  updatedAt: string
  modelConfig: Conversation['modelConfig']
  messages: MessageExportJson[]
}

/** JSON export format for a single message. */
export interface MessageExportJson {
  id: number | undefined
  provider: Provider
  role: string
  content: string
  timestamp: string
  tokenCount: { input: number; output: number } | null
  isCrossFeed: boolean
  crossFeedRound: number | null
}

// ---------------------------------------------------------------------------
// Filename Utilities
// ---------------------------------------------------------------------------

/**
 * Sanitize a string for use in a filename.
 * Removes special characters, replaces spaces with hyphens, and lowercases.
 */
export function sanitizeFilename(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

/**
 * Build a filename for an export.
 *
 * Pattern: `quorum-{title}-{YYYY-MM-DD}.{ext}`
 */
export function buildExportFilename(
  title: string,
  extension: 'json' | 'md',
): string {
  const sanitized = sanitizeFilename(title)
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const name = sanitized ? `quorum-${sanitized}-${date}` : `quorum-${date}`
  return `${name}.${extension}`
}

// ---------------------------------------------------------------------------
// JSON Export
// ---------------------------------------------------------------------------

/** Convert a single conversation + messages to the JSON export structure. */
function toConversationJson(
  data: ExportableConversation,
): ConversationExportJson {
  return {
    id: data.conversation.id!,
    title: data.conversation.title,
    createdAt: data.conversation.createdAt,
    updatedAt: data.conversation.updatedAt,
    modelConfig: data.conversation.modelConfig,
    messages: data.messages.map((m) => ({
      id: m.id,
      provider: m.provider,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      tokenCount: m.tokenCount,
      isCrossFeed: m.isCrossFeed,
      crossFeedRound: m.crossFeedRound,
    })),
  }
}

/**
 * Serialize a single conversation to a JSON string.
 */
export function exportConversationToJson(data: ExportableConversation): string {
  const json = toConversationJson(data)
  return JSON.stringify(json, null, 2)
}

/**
 * Serialize multiple conversations to a JSON string.
 */
export function exportAllConversationsToJson(
  data: ExportableConversation[],
): string {
  const jsonArray = data.map(toConversationJson)
  return JSON.stringify(jsonArray, null, 2)
}

// ---------------------------------------------------------------------------
// Markdown Export
// ---------------------------------------------------------------------------

/**
 * Format a single message as Markdown.
 */
function formatMessageMarkdown(msg: Message): string {
  const roleLabel = msg.role === 'user' ? 'User' : PROVIDER_LABELS[msg.provider]
  const crossFeedTag = msg.isCrossFeed ? ' [Cross-feed]' : ''
  const roundTag =
    msg.crossFeedRound !== null ? ` (Round ${msg.crossFeedRound})` : ''
  const timestamp = new Date(msg.timestamp)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19)

  return `**${roleLabel}**${crossFeedTag}${roundTag} _${timestamp}_\n\n${msg.content}`
}

/**
 * Serialize a single conversation to Markdown.
 *
 * Organizes messages into per-provider sections, then includes an
 * interleaved timeline section at the end.
 */
export function exportConversationToMarkdown(
  data: ExportableConversation,
): string {
  const { conversation, messages } = data
  const lines: string[] = []

  // Header
  lines.push(`# ${conversation.title}`)
  lines.push('')
  lines.push(
    `Created: ${new Date(conversation.createdAt).toISOString().replace('T', ' ').slice(0, 19)}  `,
  )
  lines.push(
    `Updated: ${new Date(conversation.updatedAt).toISOString().replace('T', ' ').slice(0, 19)}`,
  )
  lines.push('')

  // Per-provider sections
  for (const provider of PROVIDERS) {
    const providerMessages = messages.filter((m) => m.provider === provider)
    if (providerMessages.length === 0) continue

    lines.push(`## ${PROVIDER_LABELS[provider]} Thread`)
    lines.push('')

    for (const msg of providerMessages) {
      lines.push(formatMessageMarkdown(msg))
      lines.push('')
      lines.push('---')
      lines.push('')
    }
  }

  // Interleaved timeline
  if (messages.length > 0) {
    const sorted = [...messages].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )

    lines.push(`## Interleaved Timeline`)
    lines.push('')

    for (const msg of sorted) {
      const roleLabel =
        msg.role === 'user' ? 'User' : PROVIDER_LABELS[msg.provider]
      const crossFeedTag = msg.isCrossFeed ? ' [Cross-feed]' : ''
      const roundTag =
        msg.crossFeedRound !== null ? ` (Round ${msg.crossFeedRound})` : ''
      const ts = new Date(msg.timestamp)
        .toISOString()
        .replace('T', ' ')
        .slice(0, 19)
      lines.push(`**${roleLabel}**${crossFeedTag}${roundTag} _${ts}_`)
      lines.push('')
      lines.push(msg.content)
      lines.push('')
      lines.push('---')
      lines.push('')
    }
  }

  return lines.join('\n')
}

/**
 * Serialize multiple conversations to Markdown.
 *
 * Each conversation gets its own top-level heading, separated by horizontal rules.
 */
export function exportAllConversationsToMarkdown(
  data: ExportableConversation[],
): string {
  const sections = data.map((d) => exportConversationToMarkdown(d))
  return sections.join('\n\n---\n\n')
}
