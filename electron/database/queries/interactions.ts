import { getDatabase } from '../index'
import { randomUUID } from 'crypto'

export type ActionType = 'explain' | 'summarize' | 'define'

export interface Interaction {
  id: string
  document_id: string
  action_type: ActionType
  selected_text: string
  page_context: string | null
  response: string
  page_number: number | null
  scroll_position: number | null
  created_at: number
}

export interface InteractionCreateInput {
  document_id: string
  action_type: ActionType
  selected_text: string
  page_context?: string
  response: string
  page_number?: number
  scroll_position?: number
}

export interface InteractionWithDocument extends Interaction {
  filename: string
  filepath: string
}

export function saveInteraction(input: InteractionCreateInput): Interaction {
  const db = getDatabase()
  const id = randomUUID()
  const now = Date.now()

  db.prepare(`
    INSERT INTO interactions (id, document_id, action_type, selected_text, page_context, response, page_number, scroll_position, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.document_id,
    input.action_type,
    input.selected_text,
    input.page_context || null,
    input.response,
    input.page_number || null,
    input.scroll_position || null,
    now
  )

  return {
    id,
    document_id: input.document_id,
    action_type: input.action_type,
    selected_text: input.selected_text,
    page_context: input.page_context || null,
    response: input.response,
    page_number: input.page_number || null,
    scroll_position: input.scroll_position || null,
    created_at: now,
  }
}

export function getInteractionsByDocument(documentId: string): Interaction[] {
  const db = getDatabase()
  return db.prepare(
    'SELECT * FROM interactions WHERE document_id = ? ORDER BY created_at DESC'
  ).all(documentId) as Interaction[]
}

export function getInteractionById(id: string): Interaction | undefined {
  const db = getDatabase()
  return db.prepare(
    'SELECT * FROM interactions WHERE id = ?'
  ).get(id) as Interaction | undefined
}

export function getRecentInteractions(limit: number = 50): InteractionWithDocument[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT i.*, d.filename, d.filepath
    FROM interactions i
    JOIN documents d ON i.document_id = d.id
    ORDER BY i.created_at DESC
    LIMIT ?
  `).all(limit) as InteractionWithDocument[]
}

export interface DailyActivityCount {
  date: string // YYYY-MM-DD
  explain_count: number
  summarize_count: number
  define_count: number
}

export function getActivityByDay(days: number = 90): DailyActivityCount[] {
  const db = getDatabase()
  const since = Date.now() - days * 24 * 60 * 60 * 1000

  return db.prepare(`
    SELECT
      date(created_at / 1000, 'unixepoch', 'localtime') as date,
      SUM(CASE WHEN action_type = 'explain' THEN 1 ELSE 0 END) as explain_count,
      SUM(CASE WHEN action_type = 'summarize' THEN 1 ELSE 0 END) as summarize_count,
      SUM(CASE WHEN action_type = 'define' THEN 1 ELSE 0 END) as define_count
    FROM interactions
    WHERE created_at >= ?
    GROUP BY date
    ORDER BY date ASC
  `).all(since) as DailyActivityCount[]
}

export interface DocumentActivity {
  document_id: string
  filename: string
  total_interactions: number
  explain_count: number
  summarize_count: number
  define_count: number
  last_interaction_at: number
}

export function getDocumentActivityStats(): DocumentActivity[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT
      d.id as document_id,
      d.filename,
      COUNT(i.id) as total_interactions,
      SUM(CASE WHEN i.action_type = 'explain' THEN 1 ELSE 0 END) as explain_count,
      SUM(CASE WHEN i.action_type = 'summarize' THEN 1 ELSE 0 END) as summarize_count,
      SUM(CASE WHEN i.action_type = 'define' THEN 1 ELSE 0 END) as define_count,
      MAX(i.created_at) as last_interaction_at
    FROM documents d
    LEFT JOIN interactions i ON d.id = i.document_id
    GROUP BY d.id
    HAVING total_interactions > 0
    ORDER BY last_interaction_at DESC
  `).all() as DocumentActivity[]
}
