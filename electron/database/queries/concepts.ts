import { getDatabase } from '../index'
import { randomUUID } from 'crypto'

export interface Concept {
  id: string
  name: string
  created_at: number
}

export interface ConceptWithOccurrences extends Concept {
  total_occurrences: number
  document_count: number
}

export interface ConceptLink {
  source: string // concept id
  target: string // concept id
  weight: number // co-occurrence count
}

export interface ConceptGraphData {
  nodes: ConceptWithOccurrences[]
  links: ConceptLink[]
}

export function getOrCreateConcept(name: string): Concept {
  const db = getDatabase()
  const normalizedName = name.toLowerCase().trim()

  const existing = db.prepare(
    'SELECT * FROM concepts WHERE LOWER(name) = ?'
  ).get(normalizedName) as Concept | undefined

  if (existing) return existing

  const id = randomUUID()
  const now = Date.now()

  db.prepare(
    'INSERT INTO concepts (id, name, created_at) VALUES (?, ?, ?)'
  ).run(id, name.trim(), now)

  return { id, name: name.trim(), created_at: now }
}

export function linkConceptToInteraction(conceptId: string, interactionId: string): void {
  const db = getDatabase()

  db.prepare(`
    INSERT OR IGNORE INTO interaction_concepts (interaction_id, concept_id)
    VALUES (?, ?)
  `).run(interactionId, conceptId)
}

export function linkConceptToDocument(conceptId: string, documentId: string): void {
  const db = getDatabase()

  // Try to increment existing count
  const result = db.prepare(`
    UPDATE document_concepts
    SET occurrence_count = occurrence_count + 1
    WHERE document_id = ? AND concept_id = ?
  `).run(documentId, conceptId)

  if (result.changes === 0) {
    // Insert new link
    db.prepare(`
      INSERT INTO document_concepts (document_id, concept_id, occurrence_count)
      VALUES (?, ?, 1)
    `).run(documentId, conceptId)
  }
}

export function saveConceptsForInteraction(
  conceptNames: string[],
  interactionId: string,
  documentId: string
): Concept[] {
  const db = getDatabase()
  const concepts: Concept[] = []
  const now = Date.now()

  // Batch all operations in a single transaction for efficiency
  db.transaction(() => {
    // First, get or create all concepts in batch
    for (const name of conceptNames) {
      const normalizedName = name.toLowerCase().trim()
      const existing = db.prepare(
        'SELECT * FROM concepts WHERE LOWER(name) = ?'
      ).get(normalizedName) as Concept | undefined

      if (existing) {
        concepts.push(existing)
      } else {
        const id = randomUUID()
        db.prepare(
          'INSERT INTO concepts (id, name, created_at) VALUES (?, ?, ?)'
        ).run(id, name.trim(), now)
        concepts.push({ id, name: name.trim(), created_at: now })
      }
    }

    // Batch insert interaction-concept links (using INSERT OR IGNORE for idempotence)
    const insertInteractionLink = db.prepare(`
      INSERT OR IGNORE INTO interaction_concepts (interaction_id, concept_id)
      VALUES (?, ?)
    `)
    for (const concept of concepts) {
      insertInteractionLink.run(interactionId, concept.id)
    }

    // Batch upsert document-concept links
    const updateDocLink = db.prepare(`
      UPDATE document_concepts
      SET occurrence_count = occurrence_count + 1
      WHERE document_id = ? AND concept_id = ?
    `)
    const insertDocLink = db.prepare(`
      INSERT INTO document_concepts (document_id, concept_id, occurrence_count)
      VALUES (?, ?, 1)
    `)
    for (const concept of concepts) {
      const result = updateDocLink.run(documentId, concept.id)
      if (result.changes === 0) {
        insertDocLink.run(documentId, concept.id)
      }
    }
  })()

  return concepts
}

export function getAllConcepts(): ConceptWithOccurrences[] {
  const db = getDatabase()

  return db.prepare(`
    SELECT
      c.id,
      c.name,
      c.created_at,
      COALESCE(SUM(dc.occurrence_count), 0) as total_occurrences,
      COUNT(DISTINCT dc.document_id) as document_count
    FROM concepts c
    LEFT JOIN document_concepts dc ON c.id = dc.concept_id
    GROUP BY c.id
    ORDER BY total_occurrences DESC
  `).all() as ConceptWithOccurrences[]
}

export function getConceptGraph(): ConceptGraphData {
  const db = getDatabase()

  // Get all concepts with their occurrence counts
  const nodes = getAllConcepts()

  // Find concepts that appear together in the same interaction
  // (co-occurrence creates links)
  const links = db.prepare(`
    SELECT
      ic1.concept_id as source,
      ic2.concept_id as target,
      COUNT(*) as weight
    FROM interaction_concepts ic1
    JOIN interaction_concepts ic2 ON ic1.interaction_id = ic2.interaction_id
    WHERE ic1.concept_id < ic2.concept_id
    GROUP BY ic1.concept_id, ic2.concept_id
    HAVING weight > 0
  `).all() as ConceptLink[]

  return { nodes, links }
}

export function getConceptsForDocument(documentId: string): ConceptWithOccurrences[] {
  const db = getDatabase()

  return db.prepare(`
    SELECT
      c.id,
      c.name,
      c.created_at,
      dc.occurrence_count as total_occurrences,
      1 as document_count
    FROM concepts c
    JOIN document_concepts dc ON c.id = dc.concept_id
    WHERE dc.document_id = ?
    ORDER BY dc.occurrence_count DESC
  `).all(documentId) as ConceptWithOccurrences[]
}

export function getDocumentsForConcept(conceptId: string): Array<{ document_id: string; filename: string; occurrence_count: number }> {
  const db = getDatabase()

  return db.prepare(`
    SELECT
      d.id as document_id,
      d.filename,
      dc.occurrence_count
    FROM documents d
    JOIN document_concepts dc ON d.id = dc.document_id
    WHERE dc.concept_id = ?
    ORDER BY dc.occurrence_count DESC
  `).all(conceptId) as Array<{ document_id: string; filename: string; occurrence_count: number }>
}
