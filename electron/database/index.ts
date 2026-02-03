import Database from 'better-sqlite3'
import { app } from 'electron'
import * as path from 'path'
import { runMigrations } from './migrations'

const DB_FILE = 'synapse.db'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    const userDataPath = app.getPath('userData')
    const dbPath = path.join(userDataPath, DB_FILE)

    db = new Database(dbPath)

    // Enable foreign keys
    db.pragma('foreign_keys = ON')

    // Run migrations
    runMigrations(db)
  }

  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

// Re-export types for convenience
export type { Database } from 'better-sqlite3'
