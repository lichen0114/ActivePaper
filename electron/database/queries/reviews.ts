import { getDatabase } from '../index'
import { randomUUID } from 'crypto'

export interface ReviewCard {
  id: string
  interaction_id: string
  question: string
  answer: string
  next_review_at: number
  interval_days: number
  ease_factor: number
  review_count: number
  created_at: number
}

export interface ReviewCardWithContext extends ReviewCard {
  selected_text: string
  document_filename: string
  action_type: string
}

export interface ReviewCardCreateInput {
  interaction_id: string
  question: string
  answer: string
}

// SM-2 Algorithm constants
const MIN_EASE_FACTOR = 1.3
const INITIAL_EASE_FACTOR = 2.5

/**
 * SM-2 Spaced Repetition Algorithm
 * Quality ratings: 0-5
 * 0 - Complete blackout, no recall
 * 1 - Incorrect, but upon seeing correct answer, it felt familiar
 * 2 - Incorrect, but correct answer seemed easy to recall
 * 3 - Correct, but required significant effort
 * 4 - Correct, after some hesitation
 * 5 - Correct, perfect response
 */
export function calculateNextReview(
  quality: number,
  currentInterval: number,
  currentEaseFactor: number,
  reviewCount: number
): { intervalDays: number; easeFactor: number } {
  // Clamp quality to 0-5
  quality = Math.max(0, Math.min(5, quality))

  let newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  newEaseFactor = Math.max(MIN_EASE_FACTOR, newEaseFactor)

  let newInterval: number

  if (quality < 3) {
    // Failed - reset to beginning
    newInterval = 1
  } else {
    // Passed
    if (reviewCount === 0) {
      newInterval = 1
    } else if (reviewCount === 1) {
      newInterval = 6
    } else {
      newInterval = Math.round(currentInterval * newEaseFactor)
    }
  }

  return {
    intervalDays: newInterval,
    easeFactor: newEaseFactor,
  }
}

export function createReviewCard(input: ReviewCardCreateInput): ReviewCard {
  const db = getDatabase()
  const id = randomUUID()
  const now = Date.now()
  // First review in 1 day
  const nextReviewAt = now + 24 * 60 * 60 * 1000

  db.prepare(`
    INSERT INTO review_cards (id, interaction_id, question, answer, next_review_at, interval_days, ease_factor, review_count, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, 0, ?)
  `).run(id, input.interaction_id, input.question, input.answer, nextReviewAt, INITIAL_EASE_FACTOR, now)

  return {
    id,
    interaction_id: input.interaction_id,
    question: input.question,
    answer: input.answer,
    next_review_at: nextReviewAt,
    interval_days: 1,
    ease_factor: INITIAL_EASE_FACTOR,
    review_count: 0,
    created_at: now,
  }
}

export function updateReviewCard(cardId: string, quality: number): ReviewCard | undefined {
  const db = getDatabase()

  const card = db.prepare(
    'SELECT * FROM review_cards WHERE id = ?'
  ).get(cardId) as ReviewCard | undefined

  if (!card) return undefined

  const { intervalDays, easeFactor } = calculateNextReview(
    quality,
    card.interval_days,
    card.ease_factor,
    card.review_count
  )

  const now = Date.now()
  const nextReviewAt = now + intervalDays * 24 * 60 * 60 * 1000
  const newReviewCount = quality < 3 ? 0 : card.review_count + 1

  db.prepare(`
    UPDATE review_cards
    SET next_review_at = ?, interval_days = ?, ease_factor = ?, review_count = ?
    WHERE id = ?
  `).run(nextReviewAt, intervalDays, easeFactor, newReviewCount, cardId)

  return {
    ...card,
    next_review_at: nextReviewAt,
    interval_days: intervalDays,
    ease_factor: easeFactor,
    review_count: newReviewCount,
  }
}

export function getNextReviewCard(): ReviewCardWithContext | undefined {
  const db = getDatabase()
  const now = Date.now()

  return db.prepare(`
    SELECT
      rc.*,
      i.selected_text,
      i.action_type,
      d.filename as document_filename
    FROM review_cards rc
    JOIN interactions i ON rc.interaction_id = i.id
    JOIN documents d ON i.document_id = d.id
    WHERE rc.next_review_at <= ?
    ORDER BY rc.next_review_at ASC
    LIMIT 1
  `).get(now) as ReviewCardWithContext | undefined
}

export function getDueReviewCount(): number {
  const db = getDatabase()
  const now = Date.now()

  const result = db.prepare(
    'SELECT COUNT(*) as count FROM review_cards WHERE next_review_at <= ?'
  ).get(now) as { count: number }

  return result.count
}

export function getAllReviewCards(): ReviewCardWithContext[] {
  const db = getDatabase()

  return db.prepare(`
    SELECT
      rc.*,
      i.selected_text,
      i.action_type,
      d.filename as document_filename
    FROM review_cards rc
    JOIN interactions i ON rc.interaction_id = i.id
    JOIN documents d ON i.document_id = d.id
    ORDER BY rc.next_review_at ASC
  `).all() as ReviewCardWithContext[]
}

export function getReviewCardForInteraction(interactionId: string): ReviewCard | undefined {
  const db = getDatabase()
  return db.prepare(
    'SELECT * FROM review_cards WHERE interaction_id = ?'
  ).get(interactionId) as ReviewCard | undefined
}
