/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createTestDatabase, seedTestData } from '../../../mocks/database'
import {
  saveInteraction,
  getInteractionsByDocument,
  getInteractionById,
  getRecentInteractions,
  getActivityByDay,
  getDocumentActivityStats,
} from '@electron/database/queries/interactions'

// Mock getDatabase
let testDb: Database.Database

vi.mock('@electron/database/index', () => ({
  getDatabase: vi.fn(() => testDb),
}))

describe('interactions queries', () => {
  beforeEach(() => {
    testDb = createTestDatabase()
    // Seed required documents
    seedTestData(testDb, {
      documents: [
        { id: 'doc-1', filename: 'test1.pdf', filepath: '/path/test1.pdf' },
        { id: 'doc-2', filename: 'test2.pdf', filepath: '/path/test2.pdf' },
      ],
    })
  })

  afterEach(() => {
    testDb.close()
  })

  describe('saveInteraction', () => {
    it('creates interaction with all required fields', () => {
      const interaction = saveInteraction({
        document_id: 'doc-1',
        action_type: 'explain',
        selected_text: 'What is quantum computing?',
        response: 'Quantum computing uses quantum mechanics...',
      })

      expect(interaction.id).toBeDefined()
      expect(interaction.document_id).toBe('doc-1')
      expect(interaction.action_type).toBe('explain')
      expect(interaction.selected_text).toBe('What is quantum computing?')
      expect(interaction.response).toBe('Quantum computing uses quantum mechanics...')
      expect(interaction.created_at).toBeDefined()
    })

    it('saves optional fields when provided', () => {
      const interaction = saveInteraction({
        document_id: 'doc-1',
        action_type: 'explain',
        selected_text: 'Selected text',
        page_context: 'Surrounding context from page',
        response: 'AI response',
        page_number: 5,
        scroll_position: 123.45,
      })

      expect(interaction.page_context).toBe('Surrounding context from page')
      expect(interaction.page_number).toBe(5)
      expect(interaction.scroll_position).toBe(123.45)
    })

    it('sets optional fields to null when not provided', () => {
      const interaction = saveInteraction({
        document_id: 'doc-1',
        action_type: 'summarize',
        selected_text: 'Text',
        response: 'Summary',
      })

      expect(interaction.page_context).toBeNull()
      expect(interaction.page_number).toBeNull()
      expect(interaction.scroll_position).toBeNull()
    })

    it('persists to database', () => {
      const interaction = saveInteraction({
        document_id: 'doc-1',
        action_type: 'define',
        selected_text: 'entropy',
        response: 'A measure of disorder',
      })

      const row = testDb.prepare('SELECT * FROM interactions WHERE id = ?').get(interaction.id)
      expect(row).toBeDefined()
    })
  })

  describe('getInteractionsByDocument', () => {
    it('returns interactions for the given document', () => {
      seedTestData(testDb, {
        interactions: [
          { id: 'int-1', document_id: 'doc-1', action_type: 'explain', selected_text: 't1', response: 'r1' },
          { id: 'int-2', document_id: 'doc-1', action_type: 'explain', selected_text: 't2', response: 'r2' },
          { id: 'int-3', document_id: 'doc-2', action_type: 'explain', selected_text: 't3', response: 'r3' },
        ],
      })

      const interactions = getInteractionsByDocument('doc-1')
      expect(interactions).toHaveLength(2)
      expect(interactions.every(i => i.document_id === 'doc-1')).toBe(true)
    })

    it('orders by created_at descending (most recent first)', () => {
      const now = Date.now()
      seedTestData(testDb, {
        interactions: [
          { id: 'int-old', document_id: 'doc-1', action_type: 'explain', selected_text: 'old', response: 'r', created_at: now - 10000 },
          { id: 'int-new', document_id: 'doc-1', action_type: 'explain', selected_text: 'new', response: 'r', created_at: now },
        ],
      })

      const interactions = getInteractionsByDocument('doc-1')
      expect(interactions[0].id).toBe('int-new')
      expect(interactions[1].id).toBe('int-old')
    })

    it('returns empty array for document with no interactions', () => {
      expect(getInteractionsByDocument('doc-1')).toEqual([])
    })
  })

  describe('getInteractionById', () => {
    it('returns interaction with given id', () => {
      seedTestData(testDb, {
        interactions: [
          { id: 'int-1', document_id: 'doc-1', action_type: 'explain', selected_text: 'text', response: 'response' },
        ],
      })

      const interaction = getInteractionById('int-1')
      expect(interaction).toBeDefined()
      expect(interaction!.id).toBe('int-1')
    })

    it('returns undefined for non-existent id', () => {
      const interaction = getInteractionById('non-existent')
      expect(interaction).toBeUndefined()
    })
  })

  describe('getRecentInteractions', () => {
    it('returns interactions with document info', () => {
      seedTestData(testDb, {
        interactions: [
          { id: 'int-1', document_id: 'doc-1', action_type: 'explain', selected_text: 'text', response: 'response' },
        ],
      })

      const interactions = getRecentInteractions()
      expect(interactions).toHaveLength(1)
      expect(interactions[0].filename).toBe('test1.pdf')
      expect(interactions[0].filepath).toBe('/path/test1.pdf')
    })

    it('orders by created_at descending', () => {
      const now = Date.now()
      seedTestData(testDb, {
        interactions: [
          { id: 'int-1', document_id: 'doc-1', action_type: 'explain', selected_text: 'older', response: 'r', created_at: now - 5000 },
          { id: 'int-2', document_id: 'doc-2', action_type: 'explain', selected_text: 'newest', response: 'r', created_at: now },
        ],
      })

      const interactions = getRecentInteractions()
      expect(interactions[0].selected_text).toBe('newest')
    })

    it('respects limit parameter', () => {
      seedTestData(testDb, {
        interactions: [
          { id: 'int-1', document_id: 'doc-1', action_type: 'explain', selected_text: 't1', response: 'r1' },
          { id: 'int-2', document_id: 'doc-1', action_type: 'explain', selected_text: 't2', response: 'r2' },
          { id: 'int-3', document_id: 'doc-1', action_type: 'explain', selected_text: 't3', response: 'r3' },
        ],
      })

      const interactions = getRecentInteractions(2)
      expect(interactions).toHaveLength(2)
    })
  })

  describe('getActivityByDay', () => {
    it('groups interactions by date', () => {
      const now = Date.now()
      const oneDay = 24 * 60 * 60 * 1000

      seedTestData(testDb, {
        interactions: [
          { id: 'int-1', document_id: 'doc-1', action_type: 'explain', selected_text: 't', response: 'r', created_at: now },
          { id: 'int-2', document_id: 'doc-1', action_type: 'summarize', selected_text: 't', response: 'r', created_at: now },
          { id: 'int-3', document_id: 'doc-1', action_type: 'explain', selected_text: 't', response: 'r', created_at: now - oneDay },
        ],
      })

      const activity = getActivityByDay()
      expect(activity.length).toBeGreaterThanOrEqual(1)
    })

    it('counts action types separately', () => {
      const now = Date.now()

      seedTestData(testDb, {
        interactions: [
          { id: 'int-1', document_id: 'doc-1', action_type: 'explain', selected_text: 't', response: 'r', created_at: now },
          { id: 'int-2', document_id: 'doc-1', action_type: 'explain', selected_text: 't', response: 'r', created_at: now },
          { id: 'int-3', document_id: 'doc-1', action_type: 'summarize', selected_text: 't', response: 'r', created_at: now },
          { id: 'int-4', document_id: 'doc-1', action_type: 'define', selected_text: 't', response: 'r', created_at: now },
        ],
      })

      const activity = getActivityByDay()
      const today = activity[activity.length - 1] // Most recent day
      expect(today.explain_count).toBe(2)
      expect(today.summarize_count).toBe(1)
      expect(today.define_count).toBe(1)
    })

    it('respects days parameter', () => {
      const now = Date.now()
      const oneDay = 24 * 60 * 60 * 1000

      seedTestData(testDb, {
        interactions: [
          { id: 'int-recent', document_id: 'doc-1', action_type: 'explain', selected_text: 't', response: 'r', created_at: now },
          { id: 'int-old', document_id: 'doc-1', action_type: 'explain', selected_text: 't', response: 'r', created_at: now - (100 * oneDay) },
        ],
      })

      const activity = getActivityByDay(7) // Only last 7 days
      // Old interaction should not be included
      const totalCount = activity.reduce((sum, day) => sum + day.explain_count, 0)
      expect(totalCount).toBe(1)
    })

    it('orders by date ascending', () => {
      const now = Date.now()
      const oneDay = 24 * 60 * 60 * 1000

      seedTestData(testDb, {
        interactions: [
          { id: 'int-today', document_id: 'doc-1', action_type: 'explain', selected_text: 't', response: 'r', created_at: now },
          { id: 'int-yesterday', document_id: 'doc-1', action_type: 'explain', selected_text: 't', response: 'r', created_at: now - oneDay },
        ],
      })

      const activity = getActivityByDay()
      if (activity.length >= 2) {
        expect(new Date(activity[0].date).getTime()).toBeLessThan(new Date(activity[activity.length - 1].date).getTime())
      }
    })
  })

  describe('getDocumentActivityStats', () => {
    it('aggregates stats per document', () => {
      seedTestData(testDb, {
        interactions: [
          { id: 'int-1', document_id: 'doc-1', action_type: 'explain', selected_text: 't', response: 'r' },
          { id: 'int-2', document_id: 'doc-1', action_type: 'summarize', selected_text: 't', response: 'r' },
          { id: 'int-3', document_id: 'doc-2', action_type: 'define', selected_text: 't', response: 'r' },
        ],
      })

      const stats = getDocumentActivityStats()
      expect(stats).toHaveLength(2)

      const doc1Stats = stats.find(s => s.document_id === 'doc-1')
      expect(doc1Stats!.total_interactions).toBe(2)
      expect(doc1Stats!.explain_count).toBe(1)
      expect(doc1Stats!.summarize_count).toBe(1)
      expect(doc1Stats!.define_count).toBe(0)
    })

    it('orders by last_interaction_at descending', () => {
      const now = Date.now()

      seedTestData(testDb, {
        interactions: [
          { id: 'int-1', document_id: 'doc-1', action_type: 'explain', selected_text: 't', response: 'r', created_at: now - 10000 },
          { id: 'int-2', document_id: 'doc-2', action_type: 'explain', selected_text: 't', response: 'r', created_at: now },
        ],
      })

      const stats = getDocumentActivityStats()
      expect(stats[0].document_id).toBe('doc-2') // Most recent first
    })

    it('excludes documents with no interactions', () => {
      // doc-1 and doc-2 are seeded but have no interactions
      const stats = getDocumentActivityStats()
      expect(stats).toHaveLength(0)
    })

    it('includes filename in results', () => {
      seedTestData(testDb, {
        interactions: [
          { id: 'int-1', document_id: 'doc-1', action_type: 'explain', selected_text: 't', response: 'r' },
        ],
      })

      const stats = getDocumentActivityStats()
      expect(stats[0].filename).toBe('test1.pdf')
    })
  })
})
