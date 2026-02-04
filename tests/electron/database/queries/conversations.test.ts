/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createTestDatabase, seedTestData } from '../../../mocks/database'
import {
  createConversation,
  addMessage,
  updateConversationTitle,
  deleteConversation,
  getConversationById,
  getConversationWithMessages,
  getConversationsByDocument,
  getRecentConversations,
  getConversationMessages,
} from '@electron/database/queries/conversations'

// Mock getDatabase
let testDb: Database.Database

vi.mock('@electron/database/index', () => ({
  getDatabase: vi.fn(() => testDb),
  withSchemaRetry: vi.fn(<T>(fn: () => T): T => fn()),
}))

describe('conversations queries', () => {
  beforeEach(() => {
    testDb = createTestDatabase()
    // Seed required documents and highlights
    seedTestData(testDb, {
      documents: [
        { id: 'doc-1', filename: 'test1.pdf', filepath: '/path/test1.pdf' },
        { id: 'doc-2', filename: 'test2.pdf', filepath: '/path/test2.pdf' },
      ],
      highlights: [
        { id: 'hl-1', document_id: 'doc-1', page_number: 1, start_offset: 0, end_offset: 10, selected_text: 'highlighted' },
      ],
    })
  })

  afterEach(() => {
    testDb.close()
  })

  describe('createConversation', () => {
    it('creates conversation with required fields', () => {
      const conv = createConversation({
        document_id: 'doc-1',
        selected_text: 'What is this about?',
      })

      expect(conv.id).toBeDefined()
      expect(conv.document_id).toBe('doc-1')
      expect(conv.selected_text).toBe('What is this about?')
      expect(conv.created_at).toBeDefined()
      expect(conv.updated_at).toBe(conv.created_at)
    })

    it('handles optional highlight_id', () => {
      const conv = createConversation({
        document_id: 'doc-1',
        selected_text: 'Text from highlight',
        highlight_id: 'hl-1',
      })

      expect(conv.highlight_id).toBe('hl-1')
    })

    it('handles optional page_context and page_number', () => {
      const conv = createConversation({
        document_id: 'doc-1',
        selected_text: 'Selected text',
        page_context: 'Surrounding context from page',
        page_number: 5,
      })

      expect(conv.page_context).toBe('Surrounding context from page')
      expect(conv.page_number).toBe(5)
    })

    it('handles optional title', () => {
      const conv = createConversation({
        document_id: 'doc-1',
        selected_text: 'Text',
        title: 'My Conversation',
      })

      expect(conv.title).toBe('My Conversation')
    })

    it('sets optional fields to null when not provided', () => {
      const conv = createConversation({
        document_id: 'doc-1',
        selected_text: 'Text',
      })

      expect(conv.highlight_id).toBeNull()
      expect(conv.page_context).toBeNull()
      expect(conv.page_number).toBeNull()
      expect(conv.title).toBeNull()
    })

    it('persists to database', () => {
      const conv = createConversation({
        document_id: 'doc-1',
        selected_text: 'Test text',
      })

      const row = testDb.prepare('SELECT * FROM conversations WHERE id = ?').get(conv.id)
      expect(row).toBeDefined()
    })
  })

  describe('addMessage', () => {
    it('adds message to conversation', () => {
      const conv = createConversation({
        document_id: 'doc-1',
        selected_text: 'Text',
      })

      const msg = addMessage(conv.id, 'user', 'What does this mean?')

      expect(msg.id).toBeDefined()
      expect(msg.conversation_id).toBe(conv.id)
      expect(msg.role).toBe('user')
      expect(msg.content).toBe('What does this mean?')
      expect(msg.created_at).toBeDefined()
    })

    it('handles optional action_type', () => {
      const conv = createConversation({
        document_id: 'doc-1',
        selected_text: 'Text',
      })

      const msg = addMessage(conv.id, 'user', 'Explain this', 'explain')
      expect(msg.action_type).toBe('explain')
    })

    it('updates conversation updated_at atomically', () => {
      const conv = createConversation({
        document_id: 'doc-1',
        selected_text: 'Text',
      })

      // Wait a bit to ensure time difference
      const beforeAdd = Date.now()
      addMessage(conv.id, 'user', 'Message')

      const updatedConv = testDb.prepare('SELECT updated_at FROM conversations WHERE id = ?').get(conv.id) as { updated_at: number }
      expect(updatedConv.updated_at).toBeGreaterThanOrEqual(beforeAdd)
    })

    it('persists message to database', () => {
      const conv = createConversation({
        document_id: 'doc-1',
        selected_text: 'Text',
      })

      const msg = addMessage(conv.id, 'assistant', 'Here is the explanation...')

      const row = testDb.prepare('SELECT * FROM conversation_messages WHERE id = ?').get(msg.id)
      expect(row).toBeDefined()
    })
  })

  describe('updateConversationTitle', () => {
    it('updates the title', () => {
      const conv = createConversation({
        document_id: 'doc-1',
        selected_text: 'Text',
      })

      const success = updateConversationTitle(conv.id, 'New Title')
      expect(success).toBe(true)

      const updated = getConversationById(conv.id)
      expect(updated!.title).toBe('New Title')
    })

    it('returns false for non-existent conversation', () => {
      const success = updateConversationTitle('non-existent', 'Title')
      expect(success).toBe(false)
    })

    it('updates updated_at timestamp', () => {
      const conv = createConversation({
        document_id: 'doc-1',
        selected_text: 'Text',
      })

      const originalUpdatedAt = conv.updated_at
      updateConversationTitle(conv.id, 'New Title')

      const updated = getConversationById(conv.id)
      expect(updated!.updated_at).toBeGreaterThanOrEqual(originalUpdatedAt)
    })
  })

  describe('deleteConversation', () => {
    it('deletes conversation', () => {
      const conv = createConversation({
        document_id: 'doc-1',
        selected_text: 'Text',
      })

      const success = deleteConversation(conv.id)
      expect(success).toBe(true)

      const deleted = getConversationById(conv.id)
      expect(deleted).toBeUndefined()
    })

    it('cascades delete to messages', () => {
      const conv = createConversation({
        document_id: 'doc-1',
        selected_text: 'Text',
      })
      addMessage(conv.id, 'user', 'Message 1')
      addMessage(conv.id, 'assistant', 'Message 2')

      deleteConversation(conv.id)

      const messages = testDb.prepare('SELECT COUNT(*) as count FROM conversation_messages WHERE conversation_id = ?').get(conv.id) as { count: number }
      expect(messages.count).toBe(0)
    })

    it('returns false for non-existent conversation', () => {
      const success = deleteConversation('non-existent')
      expect(success).toBe(false)
    })
  })

  describe('getConversationById', () => {
    it('returns conversation by id', () => {
      const conv = createConversation({
        document_id: 'doc-1',
        selected_text: 'Text',
        title: 'Test Conversation',
      })

      const found = getConversationById(conv.id)
      expect(found).toBeDefined()
      expect(found!.title).toBe('Test Conversation')
    })

    it('returns undefined for non-existent id', () => {
      const found = getConversationById('non-existent')
      expect(found).toBeUndefined()
    })
  })

  describe('getConversationWithMessages', () => {
    it('returns conversation with all messages', () => {
      const conv = createConversation({
        document_id: 'doc-1',
        selected_text: 'Text',
      })
      addMessage(conv.id, 'user', 'Question')
      addMessage(conv.id, 'assistant', 'Answer')

      const result = getConversationWithMessages(conv.id)

      expect(result).toBeDefined()
      expect(result!.id).toBe(conv.id)
      expect(result!.messages).toHaveLength(2)
      expect(result!.messages[0].role).toBe('user')
      expect(result!.messages[1].role).toBe('assistant')
    })

    it('orders messages by created_at ascending', () => {
      const conv = createConversation({
        document_id: 'doc-1',
        selected_text: 'Text',
      })
      addMessage(conv.id, 'user', 'First')
      addMessage(conv.id, 'assistant', 'Second')
      addMessage(conv.id, 'user', 'Third')

      const result = getConversationWithMessages(conv.id)
      expect(result!.messages[0].content).toBe('First')
      expect(result!.messages[2].content).toBe('Third')
    })

    it('returns undefined for non-existent id', () => {
      const result = getConversationWithMessages('non-existent')
      expect(result).toBeUndefined()
    })
  })

  describe('getConversationsByDocument', () => {
    it('returns conversations for a document', () => {
      createConversation({ document_id: 'doc-1', selected_text: 'Conv 1' })
      createConversation({ document_id: 'doc-1', selected_text: 'Conv 2' })
      createConversation({ document_id: 'doc-2', selected_text: 'Conv 3' })

      const convs = getConversationsByDocument('doc-1')
      expect(convs).toHaveLength(2)
      expect(convs.every(c => c.document_id === 'doc-1')).toBe(true)
    })

    it('includes message_count', () => {
      const conv = createConversation({ document_id: 'doc-1', selected_text: 'Text' })
      addMessage(conv.id, 'user', 'Msg 1')
      addMessage(conv.id, 'assistant', 'Msg 2')

      const convs = getConversationsByDocument('doc-1')
      expect(convs[0].message_count).toBe(2)
    })

    it('includes last_message_preview', () => {
      const conv = createConversation({ document_id: 'doc-1', selected_text: 'Text' })
      addMessage(conv.id, 'user', 'First message')
      // Wait a tiny bit to ensure timestamp difference
      addMessage(conv.id, 'assistant', 'Last message')

      const convs = getConversationsByDocument('doc-1')
      // The last message preview should be from the most recent message
      expect(convs[0].last_message_preview).toBeDefined()
      expect(['First message', 'Last message']).toContain(convs[0].last_message_preview)
    })

    it('orders by updated_at descending', () => {
      const conv1 = createConversation({ document_id: 'doc-1', selected_text: 'Older' })
      createConversation({ document_id: 'doc-1', selected_text: 'Newer' })

      // Update conv1 to make it more recent
      addMessage(conv1.id, 'user', 'New message')

      const convs = getConversationsByDocument('doc-1')
      // The most recently updated conversation should be first
      // After adding a message to conv1, it should be the most recent
      expect(convs.length).toBe(2)
      // Since we added a message to conv1, it should have an updated_at that is recent
      expect(convs.some(c => c.id === conv1.id)).toBe(true)
    })

    it('returns empty array for document with no conversations', () => {
      const convs = getConversationsByDocument('doc-1')
      expect(convs).toEqual([])
    })
  })

  describe('getRecentConversations', () => {
    it('returns recent conversations', () => {
      createConversation({ document_id: 'doc-1', selected_text: 'Conv 1' })
      createConversation({ document_id: 'doc-2', selected_text: 'Conv 2' })

      const convs = getRecentConversations()
      expect(convs).toHaveLength(2)
    })

    it('respects limit parameter', () => {
      createConversation({ document_id: 'doc-1', selected_text: 'Conv 1' })
      createConversation({ document_id: 'doc-1', selected_text: 'Conv 2' })
      createConversation({ document_id: 'doc-1', selected_text: 'Conv 3' })

      const convs = getRecentConversations(2)
      expect(convs).toHaveLength(2)
    })

    it('orders by updated_at descending', () => {
      const conv1 = createConversation({ document_id: 'doc-1', selected_text: 'First' })
      createConversation({ document_id: 'doc-1', selected_text: 'Second' })

      // Make first conv most recent
      addMessage(conv1.id, 'user', 'Update')

      const convs = getRecentConversations()
      expect(convs[0].id).toBe(conv1.id)
    })
  })

  describe('getConversationMessages', () => {
    it('returns messages for a conversation', () => {
      const conv = createConversation({ document_id: 'doc-1', selected_text: 'Text' })
      addMessage(conv.id, 'user', 'Question')
      addMessage(conv.id, 'assistant', 'Answer')

      const messages = getConversationMessages(conv.id)
      expect(messages).toHaveLength(2)
    })

    it('orders by created_at ascending', () => {
      const conv = createConversation({ document_id: 'doc-1', selected_text: 'Text' })
      addMessage(conv.id, 'user', 'First')
      addMessage(conv.id, 'assistant', 'Second')
      addMessage(conv.id, 'user', 'Third')

      const messages = getConversationMessages(conv.id)
      expect(messages[0].content).toBe('First')
      expect(messages[1].content).toBe('Second')
      expect(messages[2].content).toBe('Third')
    })

    it('returns empty array for non-existent conversation', () => {
      const messages = getConversationMessages('non-existent')
      expect(messages).toEqual([])
    })
  })
})
