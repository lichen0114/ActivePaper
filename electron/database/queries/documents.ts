import { getDatabase } from '../index'
import { randomUUID } from 'crypto'

export interface Document {
  id: string
  filename: string
  filepath: string
  last_opened_at: number
  scroll_position: number
  total_pages: number | null
  created_at: number
}

export interface DocumentCreateInput {
  filename: string
  filepath: string
  total_pages?: number
}

export interface DocumentUpdateInput {
  id: string
  scroll_position?: number
  total_pages?: number
}

export function getOrCreateDocument(input: DocumentCreateInput): Document {
  const db = getDatabase()
  const now = Date.now()

  // Try to find existing document by filepath
  const existing = db.prepare(
    'SELECT * FROM documents WHERE filepath = ?'
  ).get(input.filepath) as Document | undefined

  if (existing) {
    // Update last_opened_at
    db.prepare(
      'UPDATE documents SET last_opened_at = ? WHERE id = ?'
    ).run(now, existing.id)

    return { ...existing, last_opened_at: now }
  }

  // Create new document
  const id = randomUUID()
  db.prepare(`
    INSERT INTO documents (id, filename, filepath, last_opened_at, scroll_position, total_pages, created_at)
    VALUES (?, ?, ?, ?, 0, ?, ?)
  `).run(id, input.filename, input.filepath, now, input.total_pages || null, now)

  return {
    id,
    filename: input.filename,
    filepath: input.filepath,
    last_opened_at: now,
    scroll_position: 0,
    total_pages: input.total_pages || null,
    created_at: now,
  }
}

export function updateDocument(input: DocumentUpdateInput): boolean {
  const db = getDatabase()
  const updates: string[] = []
  const values: unknown[] = []

  if (input.scroll_position !== undefined) {
    updates.push('scroll_position = ?')
    values.push(input.scroll_position)
  }

  if (input.total_pages !== undefined) {
    updates.push('total_pages = ?')
    values.push(input.total_pages)
  }

  if (updates.length === 0) return false

  values.push(input.id)

  const result = db.prepare(
    `UPDATE documents SET ${updates.join(', ')} WHERE id = ?`
  ).run(...values)

  return result.changes > 0
}

export function getRecentDocuments(limit: number = 3): Document[] {
  const db = getDatabase()
  return db.prepare(
    'SELECT * FROM documents ORDER BY last_opened_at DESC LIMIT ?'
  ).all(limit) as Document[]
}

export function getDocumentById(id: string): Document | undefined {
  const db = getDatabase()
  return db.prepare(
    'SELECT * FROM documents WHERE id = ?'
  ).get(id) as Document | undefined
}

export function getDocumentByFilepath(filepath: string): Document | undefined {
  const db = getDatabase()
  return db.prepare(
    'SELECT * FROM documents WHERE filepath = ?'
  ).get(filepath) as Document | undefined
}
