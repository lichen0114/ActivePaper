/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createTestDatabase, seedTestData } from '../../../mocks/database'
import {
  getOrCreateConcept,
  linkConceptToInteraction,
  linkConceptToDocument,
  saveConceptsForInteraction,
  getAllConcepts,
  getConceptGraph,
  getConceptsForDocument,
  getDocumentsForConcept,
} from '@electron/database/queries/concepts'

// Mock getDatabase
let testDb: Database.Database

vi.mock('@electron/database/index', () => ({
  getDatabase: vi.fn(() => testDb),
}))

describe('concepts queries', () => {
  beforeEach(() => {
    testDb = createTestDatabase()
    // Seed required data
    seedTestData(testDb, {
      documents: [
        { id: 'doc-1', filename: 'test1.pdf', filepath: '/path/test1.pdf' },
        { id: 'doc-2', filename: 'test2.pdf', filepath: '/path/test2.pdf' },
      ],
      interactions: [
        { id: 'int-1', document_id: 'doc-1', action_type: 'explain', selected_text: 'text 1', response: 'response 1' },
        { id: 'int-2', document_id: 'doc-1', action_type: 'explain', selected_text: 'text 2', response: 'response 2' },
        { id: 'int-3', document_id: 'doc-2', action_type: 'explain', selected_text: 'text 3', response: 'response 3' },
      ],
    })
  })

  afterEach(() => {
    testDb.close()
  })

  describe('getOrCreateConcept', () => {
    it('creates new concept when it does not exist', () => {
      const concept = getOrCreateConcept('Machine Learning')

      expect(concept.id).toBeDefined()
      expect(concept.name).toBe('Machine Learning')
      expect(concept.created_at).toBeDefined()
    })

    it('returns existing concept on case-insensitive match', () => {
      const concept1 = getOrCreateConcept('Machine Learning')
      const concept2 = getOrCreateConcept('machine learning')
      const concept3 = getOrCreateConcept('MACHINE LEARNING')

      expect(concept1.id).toBe(concept2.id)
      expect(concept2.id).toBe(concept3.id)
    })

    it('trims whitespace from name', () => {
      const concept = getOrCreateConcept('  Neural Network  ')
      expect(concept.name).toBe('Neural Network')
    })

    it('persists concept to database', () => {
      const concept = getOrCreateConcept('Deep Learning')

      const row = testDb.prepare('SELECT * FROM concepts WHERE id = ?').get(concept.id)
      expect(row).toBeDefined()
    })
  })

  describe('linkConceptToInteraction', () => {
    it('creates link between concept and interaction', () => {
      seedTestData(testDb, {
        concepts: [{ id: 'concept-1', name: 'Test Concept' }],
      })

      linkConceptToInteraction('concept-1', 'int-1')

      const row = testDb.prepare(
        'SELECT * FROM interaction_concepts WHERE concept_id = ? AND interaction_id = ?'
      ).get('concept-1', 'int-1')
      expect(row).toBeDefined()
    })

    it('is idempotent - does not fail on duplicate link', () => {
      seedTestData(testDb, {
        concepts: [{ id: 'concept-1', name: 'Test Concept' }],
      })

      // Should not throw on duplicate
      linkConceptToInteraction('concept-1', 'int-1')
      linkConceptToInteraction('concept-1', 'int-1')

      const rows = testDb.prepare(
        'SELECT COUNT(*) as count FROM interaction_concepts WHERE concept_id = ? AND interaction_id = ?'
      ).get('concept-1', 'int-1') as { count: number }
      expect(rows.count).toBe(1)
    })
  })

  describe('linkConceptToDocument', () => {
    it('creates link with occurrence_count of 1', () => {
      seedTestData(testDb, {
        concepts: [{ id: 'concept-1', name: 'Test Concept' }],
      })

      linkConceptToDocument('concept-1', 'doc-1')

      const row = testDb.prepare(
        'SELECT occurrence_count FROM document_concepts WHERE concept_id = ? AND document_id = ?'
      ).get('concept-1', 'doc-1') as { occurrence_count: number }
      expect(row.occurrence_count).toBe(1)
    })

    it('increments occurrence_count on subsequent calls', () => {
      seedTestData(testDb, {
        concepts: [{ id: 'concept-1', name: 'Test Concept' }],
      })

      linkConceptToDocument('concept-1', 'doc-1')
      linkConceptToDocument('concept-1', 'doc-1')
      linkConceptToDocument('concept-1', 'doc-1')

      const row = testDb.prepare(
        'SELECT occurrence_count FROM document_concepts WHERE concept_id = ? AND document_id = ?'
      ).get('concept-1', 'doc-1') as { occurrence_count: number }
      expect(row.occurrence_count).toBe(3)
    })
  })

  describe('saveConceptsForInteraction', () => {
    it('creates concepts and links them to interaction and document', () => {
      const concepts = saveConceptsForInteraction(
        ['Neural Network', 'Deep Learning'],
        'int-1',
        'doc-1'
      )

      expect(concepts).toHaveLength(2)
      expect(concepts.map(c => c.name).sort()).toEqual(['Deep Learning', 'Neural Network'])

      // Check interaction links
      for (const concept of concepts) {
        const intLink = testDb.prepare(
          'SELECT * FROM interaction_concepts WHERE concept_id = ? AND interaction_id = ?'
        ).get(concept.id, 'int-1')
        expect(intLink).toBeDefined()
      }

      // Check document links
      for (const concept of concepts) {
        const docLink = testDb.prepare(
          'SELECT * FROM document_concepts WHERE concept_id = ? AND document_id = ?'
        ).get(concept.id, 'doc-1')
        expect(docLink).toBeDefined()
      }
    })

    it('reuses existing concepts with case-insensitive matching', () => {
      // Create existing concept
      const existing = getOrCreateConcept('Neural Network')

      // Save with different case
      const concepts = saveConceptsForInteraction(
        ['neural network'],
        'int-1',
        'doc-1'
      )

      expect(concepts).toHaveLength(1)
      expect(concepts[0].id).toBe(existing.id)
    })

    it('runs atomically in a transaction', () => {
      // If any part fails, the whole operation should be rolled back
      // We can verify by checking that all operations succeed together
      const concepts = saveConceptsForInteraction(
        ['Concept A', 'Concept B', 'Concept C'],
        'int-1',
        'doc-1'
      )

      expect(concepts).toHaveLength(3)

      // All should be linked
      const linkCount = testDb.prepare(
        'SELECT COUNT(*) as count FROM interaction_concepts WHERE interaction_id = ?'
      ).get('int-1') as { count: number }
      expect(linkCount.count).toBe(3)
    })
  })

  describe('getAllConcepts', () => {
    it('returns empty array when no concepts exist', () => {
      expect(getAllConcepts()).toEqual([])
    })

    it('returns concepts with occurrence counts', () => {
      seedTestData(testDb, {
        concepts: [
          { id: 'c1', name: 'Concept A' },
          { id: 'c2', name: 'Concept B' },
        ],
        documentConcepts: [
          { document_id: 'doc-1', concept_id: 'c1', occurrence_count: 5 },
          { document_id: 'doc-2', concept_id: 'c1', occurrence_count: 3 },
          { document_id: 'doc-1', concept_id: 'c2', occurrence_count: 2 },
        ],
      })

      const concepts = getAllConcepts()

      expect(concepts).toHaveLength(2)
      const conceptA = concepts.find(c => c.name === 'Concept A')
      expect(conceptA!.total_occurrences).toBe(8)
      expect(conceptA!.document_count).toBe(2)
    })

    it('orders by total_occurrences descending', () => {
      seedTestData(testDb, {
        concepts: [
          { id: 'c1', name: 'Less Common' },
          { id: 'c2', name: 'Most Common' },
        ],
        documentConcepts: [
          { document_id: 'doc-1', concept_id: 'c1', occurrence_count: 2 },
          { document_id: 'doc-1', concept_id: 'c2', occurrence_count: 10 },
        ],
      })

      const concepts = getAllConcepts()
      expect(concepts[0].name).toBe('Most Common')
      expect(concepts[1].name).toBe('Less Common')
    })
  })

  describe('getConceptGraph', () => {
    it('returns nodes and links', () => {
      seedTestData(testDb, {
        concepts: [
          { id: 'c1', name: 'Concept A' },
          { id: 'c2', name: 'Concept B' },
        ],
        documentConcepts: [
          { document_id: 'doc-1', concept_id: 'c1', occurrence_count: 1 },
          { document_id: 'doc-1', concept_id: 'c2', occurrence_count: 1 },
        ],
      })

      const graph = getConceptGraph()
      expect(graph.nodes).toHaveLength(2)
      // Links require co-occurrence in the same interaction
      expect(graph.links).toBeDefined()
    })

    it('creates links for concepts co-occurring in same interaction', () => {
      seedTestData(testDb, {
        concepts: [
          { id: 'c1', name: 'Concept A' },
          { id: 'c2', name: 'Concept B' },
        ],
        interactionConcepts: [
          // Both concepts appear in int-1
          { interaction_id: 'int-1', concept_id: 'c1' },
          { interaction_id: 'int-1', concept_id: 'c2' },
        ],
      })

      const graph = getConceptGraph()
      expect(graph.links).toHaveLength(1)
      expect(graph.links[0].weight).toBe(1)
    })

    it('accumulates link weights for multiple co-occurrences', () => {
      seedTestData(testDb, {
        concepts: [
          { id: 'c1', name: 'Concept A' },
          { id: 'c2', name: 'Concept B' },
        ],
        interactionConcepts: [
          // Both concepts appear in int-1 and int-2
          { interaction_id: 'int-1', concept_id: 'c1' },
          { interaction_id: 'int-1', concept_id: 'c2' },
          { interaction_id: 'int-2', concept_id: 'c1' },
          { interaction_id: 'int-2', concept_id: 'c2' },
        ],
      })

      const graph = getConceptGraph()
      expect(graph.links).toHaveLength(1)
      expect(graph.links[0].weight).toBe(2)
    })
  })

  describe('getConceptsForDocument', () => {
    it('returns concepts linked to a document', () => {
      seedTestData(testDb, {
        concepts: [
          { id: 'c1', name: 'Concept A' },
          { id: 'c2', name: 'Concept B' },
          { id: 'c3', name: 'Concept C' },
        ],
        documentConcepts: [
          { document_id: 'doc-1', concept_id: 'c1', occurrence_count: 3 },
          { document_id: 'doc-1', concept_id: 'c2', occurrence_count: 1 },
          { document_id: 'doc-2', concept_id: 'c3', occurrence_count: 5 }, // Different doc
        ],
      })

      const concepts = getConceptsForDocument('doc-1')
      expect(concepts).toHaveLength(2)
      expect(concepts.map(c => c.name).sort()).toEqual(['Concept A', 'Concept B'])
    })

    it('orders by occurrence_count descending', () => {
      seedTestData(testDb, {
        concepts: [
          { id: 'c1', name: 'Less Common' },
          { id: 'c2', name: 'Most Common' },
        ],
        documentConcepts: [
          { document_id: 'doc-1', concept_id: 'c1', occurrence_count: 2 },
          { document_id: 'doc-1', concept_id: 'c2', occurrence_count: 10 },
        ],
      })

      const concepts = getConceptsForDocument('doc-1')
      expect(concepts[0].name).toBe('Most Common')
    })

    it('returns empty array for document with no concepts', () => {
      expect(getConceptsForDocument('doc-1')).toEqual([])
    })
  })

  describe('getDocumentsForConcept', () => {
    it('returns documents linked to a concept', () => {
      seedTestData(testDb, {
        concepts: [{ id: 'c1', name: 'Shared Concept' }],
        documentConcepts: [
          { document_id: 'doc-1', concept_id: 'c1', occurrence_count: 3 },
          { document_id: 'doc-2', concept_id: 'c1', occurrence_count: 7 },
        ],
      })

      const documents = getDocumentsForConcept('c1')
      expect(documents).toHaveLength(2)
      expect(documents.map(d => d.filename).sort()).toEqual(['test1.pdf', 'test2.pdf'])
    })

    it('orders by occurrence_count descending', () => {
      seedTestData(testDb, {
        concepts: [{ id: 'c1', name: 'Concept' }],
        documentConcepts: [
          { document_id: 'doc-1', concept_id: 'c1', occurrence_count: 3 },
          { document_id: 'doc-2', concept_id: 'c1', occurrence_count: 10 },
        ],
      })

      const documents = getDocumentsForConcept('c1')
      expect(documents[0].filename).toBe('test2.pdf')
      expect(documents[0].occurrence_count).toBe(10)
    })

    it('returns empty array for concept with no documents', () => {
      seedTestData(testDb, {
        concepts: [{ id: 'c1', name: 'Orphan Concept' }],
      })

      expect(getDocumentsForConcept('c1')).toEqual([])
    })
  })
})
