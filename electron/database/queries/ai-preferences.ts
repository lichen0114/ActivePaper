import { getDatabase } from '../index'
import { randomUUID } from 'crypto'

// Types
export interface AIPreferences {
  id: string
  tone: string
  response_length: string
  response_format: string
  custom_system_prompt: string | null
  custom_system_prompt_enabled: number
  temperature: number | null
  max_tokens: number | null
  model_openai: string | null
  model_anthropic: string | null
  model_gemini: string | null
  model_ollama: string | null
  created_at: number
  updated_at: number
}

export interface AIPreferencesUpdate {
  tone?: string
  response_length?: string
  response_format?: string
  custom_system_prompt?: string | null
  custom_system_prompt_enabled?: number
  temperature?: number | null
  max_tokens?: number | null
  model_openai?: string | null
  model_anthropic?: string | null
  model_gemini?: string | null
  model_ollama?: string | null
}

export interface CustomAction {
  id: string
  name: string
  emoji: string
  prompt_template: string
  sort_order: number
  enabled: number
  created_at: number
  updated_at: number
}

export interface CustomActionCreate {
  name: string
  emoji?: string
  prompt_template: string
  sort_order?: number
}

export interface CustomActionUpdate {
  id: string
  name?: string
  emoji?: string
  prompt_template?: string
  sort_order?: number
  enabled?: number
}

export interface DocumentAIContext {
  document_id: string
  context_instructions: string
  enabled: number
  created_at: number
  updated_at: number
}

// AI Preferences
export function getAIPreferences(): AIPreferences {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM ai_preferences WHERE id = ?').get('default') as AIPreferences | undefined
  if (row) return row

  // Should exist from migration, but create if missing
  const now = Date.now()
  db.prepare(`
    INSERT OR IGNORE INTO ai_preferences (id, created_at, updated_at)
    VALUES ('default', ?, ?)
  `).run(now, now)

  return db.prepare('SELECT * FROM ai_preferences WHERE id = ?').get('default') as AIPreferences
}

export function updateAIPreferences(updates: AIPreferencesUpdate): AIPreferences {
  const db = getDatabase()
  const now = Date.now()

  const fields: string[] = []
  const values: unknown[] = []

  const allowedFields: (keyof AIPreferencesUpdate)[] = [
    'tone', 'response_length', 'response_format',
    'custom_system_prompt', 'custom_system_prompt_enabled',
    'temperature', 'max_tokens',
    'model_openai', 'model_anthropic', 'model_gemini', 'model_ollama',
  ]

  for (const field of allowedFields) {
    if (field in updates) {
      fields.push(`${field} = ?`)
      values.push(updates[field] ?? null)
    }
  }

  if (fields.length === 0) return getAIPreferences()

  fields.push('updated_at = ?')
  values.push(now)
  values.push('default')

  db.prepare(`UPDATE ai_preferences SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return getAIPreferences()
}

// Custom Actions
export function getCustomActions(): CustomAction[] {
  const db = getDatabase()
  return db.prepare(
    'SELECT * FROM custom_actions WHERE enabled = 1 ORDER BY sort_order ASC, created_at ASC'
  ).all() as CustomAction[]
}

export function getAllCustomActions(): CustomAction[] {
  const db = getDatabase()
  return db.prepare(
    'SELECT * FROM custom_actions ORDER BY sort_order ASC, created_at ASC'
  ).all() as CustomAction[]
}

export function createCustomAction(input: CustomActionCreate): CustomAction {
  const db = getDatabase()
  const now = Date.now()
  const id = randomUUID()

  db.prepare(`
    INSERT INTO custom_actions (id, name, emoji, prompt_template, sort_order, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, input.name, input.emoji || '\u{1F527}', input.prompt_template, input.sort_order || 0, now, now)

  return db.prepare('SELECT * FROM custom_actions WHERE id = ?').get(id) as CustomAction
}

export function updateCustomAction(input: CustomActionUpdate): CustomAction | null {
  const db = getDatabase()
  const now = Date.now()

  const fields: string[] = []
  const values: unknown[] = []

  if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name) }
  if (input.emoji !== undefined) { fields.push('emoji = ?'); values.push(input.emoji) }
  if (input.prompt_template !== undefined) { fields.push('prompt_template = ?'); values.push(input.prompt_template) }
  if (input.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(input.sort_order) }
  if (input.enabled !== undefined) { fields.push('enabled = ?'); values.push(input.enabled) }

  if (fields.length === 0) {
    return db.prepare('SELECT * FROM custom_actions WHERE id = ?').get(input.id) as CustomAction | null
  }

  fields.push('updated_at = ?')
  values.push(now)
  values.push(input.id)

  db.prepare(`UPDATE custom_actions SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return db.prepare('SELECT * FROM custom_actions WHERE id = ?').get(input.id) as CustomAction | null
}

export function deleteCustomAction(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM custom_actions WHERE id = ?').run(id)
  return result.changes > 0
}

// Document AI Context
export function getDocumentAIContext(documentId: string): DocumentAIContext | null {
  const db = getDatabase()
  return (db.prepare(
    'SELECT * FROM document_ai_context WHERE document_id = ?'
  ).get(documentId) as DocumentAIContext | undefined) || null
}

export function setDocumentAIContext(documentId: string, contextInstructions: string, enabled: number = 1): DocumentAIContext {
  const db = getDatabase()
  const now = Date.now()

  db.prepare(`
    INSERT INTO document_ai_context (document_id, context_instructions, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(document_id) DO UPDATE SET
      context_instructions = excluded.context_instructions,
      enabled = excluded.enabled,
      updated_at = excluded.updated_at
  `).run(documentId, contextInstructions, enabled, now, now)

  return db.prepare(
    'SELECT * FROM document_ai_context WHERE document_id = ?'
  ).get(documentId) as DocumentAIContext
}

export function deleteDocumentAIContext(documentId: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM document_ai_context WHERE document_id = ?').run(documentId)
  return result.changes > 0
}
