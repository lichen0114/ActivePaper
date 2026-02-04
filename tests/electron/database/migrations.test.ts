import { describe, it, expect, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { runMigrations, verifyAndRepairSchema } from '@electron/database/migrations'

let userDataPath = ''

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => userDataPath),
  },
}))

const REQUIRED_TABLES_V1 = [
  'documents',
  'interactions',
  'concepts',
  'interaction_concepts',
  'document_concepts',
  'review_cards',
]
const V2_TABLES = [
  'highlights',
  'bookmarks',
  'conversations',
  'conversation_messages',
  'documents_fts',
  'interactions_fts',
  'concepts_fts',
]
const REQUIRED_TABLES_V2 = [...REQUIRED_TABLES_V1, ...V2_TABLES]

const listTables = (db: Database.Database): string[] => {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'view')")
    .all()
    .map((row) => (row as { name: string }).name)
}

let tempDir: string | null = null

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

describe('database migrations', () => {
  it('repairs missing v2 tables when schema_version is 2', () => {
    const db = new Database(':memory:')
    runMigrations(db)

    db.exec(V2_TABLES.map((table) => `DROP TABLE IF EXISTS ${table};`).join('\n'))
    db.prepare('UPDATE schema_version SET version = 2').run()

    const result = verifyAndRepairSchema(db)
    expect(result.repaired).toBe(true)

    const tables = listTables(db)
    for (const table of V2_TABLES) {
      expect(tables).toContain(table)
    }
  })

  it('creates full schema on fresh db', () => {
    const db = new Database(':memory:')
    runMigrations(db)

    const result = verifyAndRepairSchema(db)
    expect(result.repaired).toBe(false)

    const tables = listTables(db)
    for (const table of REQUIRED_TABLES_V2) {
      expect(tables).toContain(table)
    }

    const row = db.prepare('SELECT version FROM schema_version').get() as { version: number } | undefined
    expect(row?.version).toBe(2)
  })

  it('retries missing table errors in highlights queries', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'activepaper-test-'))
    userDataPath = tempDir
    vi.resetModules()

    const { getDatabase, closeDatabase } = await import('@electron/database/index')
    const { getHighlightsByDocument } = await import('@electron/database/queries/highlights')

    const db = getDatabase()
    db.exec('DROP TABLE IF EXISTS highlights;')

    const results = getHighlightsByDocument('doc-1')
    expect(results).toEqual([])

    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name = 'highlights'"
    ).get()
    expect(row).toBeTruthy()

    closeDatabase()
  })
})
