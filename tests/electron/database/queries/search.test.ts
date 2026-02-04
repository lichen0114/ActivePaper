/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createTestDatabase, seedTestData } from '../../../mocks/database'
import {
  searchDocuments,
  searchInteractions,
  searchConcepts,
  searchAll,
  searchInteractionsInDocument,
} from '@electron/database/queries/search'

// Mock getDatabase
let testDb: Database.Database

vi.mock('@electron/database/index', () => ({
  getDatabase: vi.fn(() => testDb),
}))

describe('search queries', () => {
  beforeEach(() => {
    testDb = createTestDatabase()
    // Seed data for search tests
    seedTestData(testDb, {
      documents: [
        { id: 'doc-1', filename: 'quantum-computing.pdf', filepath: '/path/quantum.pdf' },
        { id: 'doc-2', filename: 'machine-learning.pdf', filepath: '/path/ml.pdf' },
        { id: 'doc-3', filename: 'statistics.pdf', filepath: '/path/stats.pdf' },
      ],
      interactions: [
        {
          id: 'int-1',
          document_id: 'doc-1',
          action_type: 'explain',
          selected_text: 'quantum superposition',
          response: 'Superposition is a fundamental principle of quantum mechanics',
        },
        {
          id: 'int-2',
          document_id: 'doc-1',
          action_type: 'explain',
          selected_text: 'entanglement',
          response: 'Quantum entanglement describes correlation between particles',
        },
        {
          id: 'int-3',
          document_id: 'doc-2',
          action_type: 'summarize',
          selected_text: 'neural networks',
          response: 'Neural networks are computational models inspired by biological neurons',
        },
      ],
      concepts: [
        { id: 'c1', name: 'Quantum Mechanics' },
        { id: 'c2', name: 'Machine Learning' },
        { id: 'c3', name: 'Neural Networks' },
        { id: 'c4', name: 'Probability Theory' },
      ],
    })
  })

  afterEach(() => {
    testDb.close()
  })

  describe('escapeQuery (via searchDocuments)', () => {
    it('returns empty array for empty query', () => {
      const results = searchDocuments('')
      expect(results).toEqual([])
    })

    it('returns empty array for whitespace-only query', () => {
      const results = searchDocuments('   ')
      expect(results).toEqual([])
    })

    it('handles special FTS5 characters in query', () => {
      // These should not throw and should return results based on cleaned query
      expect(() => searchDocuments('test"query')).not.toThrow()
      expect(() => searchDocuments('test:query')).not.toThrow()
      expect(() => searchDocuments('test*query')).not.toThrow()
      expect(() => searchDocuments('test^query')).not.toThrow()
      expect(() => searchDocuments('(test)')).not.toThrow()
    })
  })

  describe('searchDocuments', () => {
    it('finds documents by filename', () => {
      const results = searchDocuments('quantum')
      expect(results).toHaveLength(1)
      expect(results[0].filename).toBe('quantum-computing.pdf')
    })

    it('returns document fields', () => {
      const results = searchDocuments('machine')
      expect(results[0]).toHaveProperty('id')
      expect(results[0]).toHaveProperty('filename')
      expect(results[0]).toHaveProperty('filepath')
      expect(results[0]).toHaveProperty('last_opened_at')
      expect(results[0]).toHaveProperty('rank')
    })

    it('respects limit parameter', () => {
      const results = searchDocuments('pdf', 2)
      expect(results.length).toBeLessThanOrEqual(2)
    })

    it('returns empty array when no matches', () => {
      const results = searchDocuments('nonexistent')
      expect(results).toEqual([])
    })

    it('handles partial matches with prefix search', () => {
      const results = searchDocuments('quant') // Should match 'quantum'
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('searchInteractions', () => {
    it('finds interactions by selected_text', () => {
      const results = searchInteractions('superposition')
      expect(results).toHaveLength(1)
      expect(results[0].selected_text).toBe('quantum superposition')
    })

    it('finds interactions by response', () => {
      const results = searchInteractions('biological neurons')
      expect(results).toHaveLength(1)
      expect(results[0].selected_text).toBe('neural networks')
    })

    it('returns snippet with highlighting', () => {
      const results = searchInteractions('quantum')
      expect(results[0]).toHaveProperty('snippet')
      // Snippet should contain highlight marks
      expect(results[0].snippet).toContain('<mark>')
    })

    it('includes document filename', () => {
      const results = searchInteractions('superposition')
      expect(results[0].filename).toBe('quantum-computing.pdf')
    })

    it('respects limit parameter', () => {
      const results = searchInteractions('quantum', 1)
      expect(results).toHaveLength(1)
    })

    it('returns empty array when no matches', () => {
      const results = searchInteractions('nonexistent')
      expect(results).toEqual([])
    })
  })

  describe('searchConcepts', () => {
    it('finds concepts by name', () => {
      const results = searchConcepts('quantum')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Quantum Mechanics')
    })

    it('returns concept fields', () => {
      const results = searchConcepts('learning')
      expect(results[0]).toHaveProperty('id')
      expect(results[0]).toHaveProperty('name')
      expect(results[0]).toHaveProperty('created_at')
      expect(results[0]).toHaveProperty('rank')
    })

    it('handles partial matches', () => {
      const results = searchConcepts('neural')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Neural Networks')
    })

    it('respects limit parameter', () => {
      const results = searchConcepts('theory', 1)
      expect(results.length).toBeLessThanOrEqual(1)
    })

    it('returns empty array when no matches', () => {
      const results = searchConcepts('nonexistent')
      expect(results).toEqual([])
    })
  })

  describe('searchAll', () => {
    it('returns results from all three types', () => {
      const results = searchAll('quantum')

      expect(results).toHaveProperty('documents')
      expect(results).toHaveProperty('interactions')
      expect(results).toHaveProperty('concepts')
    })

    it('combines results correctly', () => {
      const results = searchAll('quantum')

      // Should find the quantum document
      expect(results.documents.length).toBeGreaterThanOrEqual(1)
      // Should find interactions with 'quantum'
      expect(results.interactions.length).toBeGreaterThanOrEqual(1)
      // Should find Quantum Mechanics concept
      expect(results.concepts.length).toBeGreaterThanOrEqual(1)
    })

    it('respects limitPerType parameter', () => {
      const results = searchAll('quantum', 1)

      expect(results.documents.length).toBeLessThanOrEqual(1)
      expect(results.interactions.length).toBeLessThanOrEqual(1)
      expect(results.concepts.length).toBeLessThanOrEqual(1)
    })

    it('returns empty arrays for no matches', () => {
      const results = searchAll('nonexistent')

      expect(results.documents).toEqual([])
      expect(results.interactions).toEqual([])
      expect(results.concepts).toEqual([])
    })
  })

  describe('searchInteractionsInDocument', () => {
    it('searches only within specified document', () => {
      const results = searchInteractionsInDocument('doc-1', 'quantum')

      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results.every(r => r.document_id === 'doc-1')).toBe(true)
    })

    it('does not return interactions from other documents', () => {
      const results = searchInteractionsInDocument('doc-1', 'neural')

      // 'neural' is in doc-2, not doc-1
      expect(results).toHaveLength(0)
    })

    it('respects limit parameter', () => {
      const results = searchInteractionsInDocument('doc-1', 'quantum', 1)
      expect(results.length).toBeLessThanOrEqual(1)
    })

    it('returns empty array for no matches', () => {
      const results = searchInteractionsInDocument('doc-1', 'nonexistent')
      expect(results).toEqual([])
    })

    it('returns empty array for empty query', () => {
      const results = searchInteractionsInDocument('doc-1', '')
      expect(results).toEqual([])
    })
  })
})
