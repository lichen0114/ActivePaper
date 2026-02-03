import type Database from 'better-sqlite3'

const SCHEMA_VERSION = 1

export function runMigrations(db: Database.Database): void {
  // Create schema_version table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    )
  `)

  const row = db.prepare('SELECT version FROM schema_version').get() as { version: number } | undefined
  const currentVersion = row?.version || 0

  if (currentVersion < SCHEMA_VERSION) {
    applyMigrations(db, currentVersion)
  }
}

function applyMigrations(db: Database.Database, fromVersion: number): void {
  const migrations: Array<() => void> = [
    // Migration 1: Initial schema
    () => {
      db.exec(`
        -- Documents: tracks opened PDF files
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          filepath TEXT NOT NULL UNIQUE,
          last_opened_at INTEGER NOT NULL,
          scroll_position REAL DEFAULT 0,
          total_pages INTEGER,
          created_at INTEGER NOT NULL
        );

        -- Interactions: every AI query
        CREATE TABLE IF NOT EXISTS interactions (
          id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL,
          action_type TEXT NOT NULL,
          selected_text TEXT NOT NULL,
          page_context TEXT,
          response TEXT NOT NULL,
          page_number INTEGER,
          scroll_position REAL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (document_id) REFERENCES documents(id)
        );

        -- Concepts: extracted key terms
        CREATE TABLE IF NOT EXISTS concepts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          created_at INTEGER NOT NULL
        );

        -- Junction: concepts in interactions
        CREATE TABLE IF NOT EXISTS interaction_concepts (
          interaction_id TEXT NOT NULL,
          concept_id TEXT NOT NULL,
          PRIMARY KEY (interaction_id, concept_id),
          FOREIGN KEY (interaction_id) REFERENCES interactions(id),
          FOREIGN KEY (concept_id) REFERENCES concepts(id)
        );

        -- Document-concept links
        CREATE TABLE IF NOT EXISTS document_concepts (
          document_id TEXT NOT NULL,
          concept_id TEXT NOT NULL,
          occurrence_count INTEGER DEFAULT 1,
          PRIMARY KEY (document_id, concept_id),
          FOREIGN KEY (document_id) REFERENCES documents(id),
          FOREIGN KEY (concept_id) REFERENCES concepts(id)
        );

        -- Spaced repetition cards
        CREATE TABLE IF NOT EXISTS review_cards (
          id TEXT PRIMARY KEY,
          interaction_id TEXT NOT NULL,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          next_review_at INTEGER NOT NULL,
          interval_days INTEGER DEFAULT 1,
          ease_factor REAL DEFAULT 2.5,
          review_count INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (interaction_id) REFERENCES interactions(id)
        );

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_interactions_doc ON interactions(document_id);
        CREATE INDEX IF NOT EXISTS idx_interactions_created ON interactions(created_at);
        CREATE INDEX IF NOT EXISTS idx_review_cards_next ON review_cards(next_review_at);
        CREATE INDEX IF NOT EXISTS idx_documents_last_opened ON documents(last_opened_at);
      `)
    },
  ]

  // Apply migrations sequentially
  db.transaction(() => {
    for (let i = fromVersion; i < migrations.length; i++) {
      migrations[i]()
    }

    // Update schema version
    db.prepare('DELETE FROM schema_version').run()
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION)
  })()
}
