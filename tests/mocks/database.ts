import Database from 'better-sqlite3'
import { runMigrations } from '@electron/database/migrations'

/**
 * Creates an in-memory SQLite database with full schema applied
 */
export function createTestDatabase(): Database.Database {
  const db = new Database(':memory:')
  runMigrations(db)
  return db
}

/**
 * Seed data types for test fixtures
 */
export interface SeedData {
  documents?: Array<{
    id: string
    filename: string
    filepath: string
    last_opened_at?: number
    scroll_position?: number
    total_pages?: number
    created_at?: number
  }>
  interactions?: Array<{
    id: string
    document_id: string
    action_type: 'explain' | 'summarize' | 'define'
    selected_text: string
    page_context?: string
    response: string
    page_number?: number
    scroll_position?: number
    created_at?: number
  }>
  concepts?: Array<{
    id: string
    name: string
    created_at?: number
  }>
  interactionConcepts?: Array<{
    interaction_id: string
    concept_id: string
  }>
  documentConcepts?: Array<{
    document_id: string
    concept_id: string
    occurrence_count?: number
  }>
  reviewCards?: Array<{
    id: string
    interaction_id: string
    question: string
    answer: string
    next_review_at?: number
    interval_days?: number
    ease_factor?: number
    review_count?: number
    created_at?: number
  }>
  highlights?: Array<{
    id: string
    document_id: string
    page_number: number
    start_offset: number
    end_offset: number
    selected_text: string
    color?: string
    note?: string
    created_at?: number
    updated_at?: number
  }>
  bookmarks?: Array<{
    id: string
    document_id: string
    page_number: number
    label?: string
    created_at?: number
  }>
  conversations?: Array<{
    id: string
    document_id: string
    highlight_id?: string
    selected_text: string
    page_context?: string
    page_number?: number
    title?: string
    created_at?: number
    updated_at?: number
  }>
  conversationMessages?: Array<{
    id: string
    conversation_id: string
    role: 'user' | 'assistant'
    content: string
    action_type?: string
    created_at?: number
  }>
}

/**
 * Seed test data into the database
 */
export function seedTestData(db: Database.Database, data: SeedData): void {
  const now = Date.now()

  // Seed documents
  if (data.documents) {
    const insertDoc = db.prepare(`
      INSERT INTO documents (id, filename, filepath, last_opened_at, scroll_position, total_pages, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    for (const doc of data.documents) {
      insertDoc.run(
        doc.id,
        doc.filename,
        doc.filepath,
        doc.last_opened_at ?? now,
        doc.scroll_position ?? 0,
        doc.total_pages ?? null,
        doc.created_at ?? now
      )
    }
  }

  // Seed interactions
  if (data.interactions) {
    const insertInteraction = db.prepare(`
      INSERT INTO interactions (id, document_id, action_type, selected_text, page_context, response, page_number, scroll_position, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const interaction of data.interactions) {
      insertInteraction.run(
        interaction.id,
        interaction.document_id,
        interaction.action_type,
        interaction.selected_text,
        interaction.page_context ?? null,
        interaction.response,
        interaction.page_number ?? null,
        interaction.scroll_position ?? null,
        interaction.created_at ?? now
      )
    }
  }

  // Seed concepts
  if (data.concepts) {
    const insertConcept = db.prepare(`
      INSERT INTO concepts (id, name, created_at)
      VALUES (?, ?, ?)
    `)
    for (const concept of data.concepts) {
      insertConcept.run(concept.id, concept.name, concept.created_at ?? now)
    }
  }

  // Seed interaction-concept links
  if (data.interactionConcepts) {
    const insertLink = db.prepare(`
      INSERT INTO interaction_concepts (interaction_id, concept_id)
      VALUES (?, ?)
    `)
    for (const link of data.interactionConcepts) {
      insertLink.run(link.interaction_id, link.concept_id)
    }
  }

  // Seed document-concept links
  if (data.documentConcepts) {
    const insertLink = db.prepare(`
      INSERT INTO document_concepts (document_id, concept_id, occurrence_count)
      VALUES (?, ?, ?)
    `)
    for (const link of data.documentConcepts) {
      insertLink.run(link.document_id, link.concept_id, link.occurrence_count ?? 1)
    }
  }

  // Seed review cards
  if (data.reviewCards) {
    const insertCard = db.prepare(`
      INSERT INTO review_cards (id, interaction_id, question, answer, next_review_at, interval_days, ease_factor, review_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const card of data.reviewCards) {
      insertCard.run(
        card.id,
        card.interaction_id,
        card.question,
        card.answer,
        card.next_review_at ?? now + 24 * 60 * 60 * 1000,
        card.interval_days ?? 1,
        card.ease_factor ?? 2.5,
        card.review_count ?? 0,
        card.created_at ?? now
      )
    }
  }

  // Seed highlights
  if (data.highlights) {
    const insertHighlight = db.prepare(`
      INSERT INTO highlights (id, document_id, page_number, start_offset, end_offset, selected_text, color, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const highlight of data.highlights) {
      insertHighlight.run(
        highlight.id,
        highlight.document_id,
        highlight.page_number,
        highlight.start_offset,
        highlight.end_offset,
        highlight.selected_text,
        highlight.color ?? 'yellow',
        highlight.note ?? null,
        highlight.created_at ?? now,
        highlight.updated_at ?? now
      )
    }
  }

  // Seed bookmarks
  if (data.bookmarks) {
    const insertBookmark = db.prepare(`
      INSERT INTO bookmarks (id, document_id, page_number, label, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    for (const bookmark of data.bookmarks) {
      insertBookmark.run(
        bookmark.id,
        bookmark.document_id,
        bookmark.page_number,
        bookmark.label ?? null,
        bookmark.created_at ?? now
      )
    }
  }

  // Seed conversations
  if (data.conversations) {
    const insertConv = db.prepare(`
      INSERT INTO conversations (id, document_id, highlight_id, selected_text, page_context, page_number, title, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const conv of data.conversations) {
      insertConv.run(
        conv.id,
        conv.document_id,
        conv.highlight_id ?? null,
        conv.selected_text,
        conv.page_context ?? null,
        conv.page_number ?? null,
        conv.title ?? null,
        conv.created_at ?? now,
        conv.updated_at ?? now
      )
    }
  }

  // Seed conversation messages
  if (data.conversationMessages) {
    const insertMsg = db.prepare(`
      INSERT INTO conversation_messages (id, conversation_id, role, content, action_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    for (const msg of data.conversationMessages) {
      insertMsg.run(
        msg.id,
        msg.conversation_id,
        msg.role,
        msg.content,
        msg.action_type ?? null,
        msg.created_at ?? now
      )
    }
  }
}

/**
 * Clear all data from the database while preserving schema
 */
export function resetTestDatabase(db: Database.Database): void {
  const tables = [
    'conversation_messages',
    'conversations',
    'bookmarks',
    'highlights',
    'review_cards',
    'document_concepts',
    'interaction_concepts',
    'concepts',
    'interactions',
    'documents',
  ]

  db.transaction(() => {
    for (const table of tables) {
      db.prepare(`DELETE FROM ${table}`).run()
    }
  })()
}
