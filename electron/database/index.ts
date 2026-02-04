import Database from 'better-sqlite3'
import { app } from 'electron'
import * as path from 'path'
import { runMigrations, verifyAndRepairSchema } from './migrations'

const DB_FILE = 'activepaper.db'

let db: Database.Database | null = null
let dbPath: string | null = null
let schemaVerified = false

const IS_DEV = process.env.NODE_ENV !== 'production'

function logSchemaRepair(missingTables: string[], reason?: string): void {
  if (!IS_DEV || missingTables.length === 0) return
  const pathInfo = dbPath ? ` at ${dbPath}` : ''
  const reasonInfo = reason ? ` (${reason})` : ''
  console.warn(`[db] schema repair${reasonInfo}${pathInfo}: missing tables: ${missingTables.join(', ')}`)
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { code?: string; message?: string }
  return err.code === 'SQLITE_ERROR' && typeof err.message === 'string' && err.message.includes('no such table')
}

export function getDatabase(): Database.Database {
  if (!db) {
    const userDataPath = app.getPath('userData')
    dbPath = path.join(userDataPath, DB_FILE)

    db = new Database(dbPath)

    // Enable foreign keys
    db.pragma('foreign_keys = ON')

    // Run migrations
    runMigrations(db)
  }

  if (db && !schemaVerified) {
    const result = verifyAndRepairSchema(db)
    if (result.repaired) {
      logSchemaRepair(result.missingTables, 'startup')
    }
    schemaVerified = true
  }

  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    dbPath = null
    schemaVerified = false
  }
}

export function withSchemaRetry<T>(operation: () => T): T {
  try {
    return operation()
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error
    }

    const database = getDatabase()
    const result = verifyAndRepairSchema(database)
    if (result.repaired) {
      logSchemaRepair(result.missingTables, 'retry')
    }
    schemaVerified = true

    return operation()
  }
}

// Re-export types for convenience
export type { Database } from 'better-sqlite3'
