/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createTestDatabase, seedTestData } from '../../../mocks/database'
import {
  calculateNextReview,
  createReviewCard,
  updateReviewCard,
  getNextReviewCard,
  getDueReviewCount,
  getAllReviewCards,
  getReviewCardForInteraction,
} from '@electron/database/queries/reviews'

// Mock getDatabase
let testDb: Database.Database

vi.mock('@electron/database/index', () => ({
  getDatabase: vi.fn(() => testDb),
}))

describe('reviews queries', () => {
  beforeEach(() => {
    testDb = createTestDatabase()
    // Seed required data (documents and interactions for foreign key constraints)
    seedTestData(testDb, {
      documents: [
        { id: 'doc-1', filename: 'test.pdf', filepath: '/path/test.pdf' },
      ],
      interactions: [
        { id: 'int-1', document_id: 'doc-1', action_type: 'explain', selected_text: 'test text', response: 'test response' },
        { id: 'int-2', document_id: 'doc-1', action_type: 'summarize', selected_text: 'another text', response: 'another response' },
      ],
    })
  })

  afterEach(() => {
    testDb.close()
  })

  describe('calculateNextReview (SM-2 algorithm)', () => {
    it('resets interval to 1 when quality < 3', () => {
      const result = calculateNextReview(2, 10, 2.5, 5)
      expect(result.intervalDays).toBe(1)
    })

    it('sets interval to 1 on first review with quality >= 3', () => {
      const result = calculateNextReview(4, 1, 2.5, 0)
      expect(result.intervalDays).toBe(1)
    })

    it('sets interval to 6 on second review with quality >= 3', () => {
      const result = calculateNextReview(4, 1, 2.5, 1)
      expect(result.intervalDays).toBe(6)
    })

    it('multiplies by ease factor on subsequent reviews', () => {
      const result = calculateNextReview(4, 6, 2.5, 2)
      expect(result.intervalDays).toBe(Math.round(6 * result.easeFactor))
    })

    it('clamps ease factor to minimum 1.3', () => {
      // Multiple poor ratings should not drop ease below 1.3
      let result = calculateNextReview(0, 1, 1.5, 0)
      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3)

      result = calculateNextReview(1, 1, 1.3, 0)
      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3)
    })

    it('increases ease factor for quality 5', () => {
      const result = calculateNextReview(5, 6, 2.5, 2)
      expect(result.easeFactor).toBeGreaterThan(2.5)
    })

    it('decreases ease factor for quality 3', () => {
      const result = calculateNextReview(3, 6, 2.5, 2)
      expect(result.easeFactor).toBeLessThan(2.5)
    })

    it('clamps quality to 0-5 range', () => {
      const resultNegative = calculateNextReview(-1, 1, 2.5, 0)
      const resultZero = calculateNextReview(0, 1, 2.5, 0)
      expect(resultNegative.intervalDays).toBe(resultZero.intervalDays)

      const resultHigh = calculateNextReview(10, 1, 2.5, 0)
      const resultFive = calculateNextReview(5, 1, 2.5, 0)
      expect(resultHigh.intervalDays).toBe(resultFive.intervalDays)
    })
  })

  describe('createReviewCard', () => {
    it('creates a card with default values', () => {
      const card = createReviewCard({
        interaction_id: 'int-1',
        question: 'What is X?',
        answer: 'X is Y',
      })

      expect(card.id).toBeDefined()
      expect(card.interaction_id).toBe('int-1')
      expect(card.question).toBe('What is X?')
      expect(card.answer).toBe('X is Y')
      expect(card.ease_factor).toBe(2.5)
      expect(card.interval_days).toBe(1)
      expect(card.review_count).toBe(0)
      expect(card.next_review_at).toBeGreaterThan(Date.now())
    })

    it('sets next_review_at to 1 day in the future', () => {
      const beforeCreate = Date.now()
      const card = createReviewCard({
        interaction_id: 'int-1',
        question: 'Q',
        answer: 'A',
      })
      const expectedMin = beforeCreate + 24 * 60 * 60 * 1000 - 1000
      const expectedMax = Date.now() + 24 * 60 * 60 * 1000 + 1000

      expect(card.next_review_at).toBeGreaterThan(expectedMin)
      expect(card.next_review_at).toBeLessThan(expectedMax)
    })

    it('persists card to database', () => {
      const card = createReviewCard({
        interaction_id: 'int-1',
        question: 'Q',
        answer: 'A',
      })

      const row = testDb.prepare('SELECT * FROM review_cards WHERE id = ?').get(card.id)
      expect(row).toBeDefined()
    })
  })

  describe('updateReviewCard', () => {
    it('applies SM-2 algorithm and updates card', () => {
      const card = createReviewCard({
        interaction_id: 'int-1',
        question: 'Q',
        answer: 'A',
      })

      const updated = updateReviewCard(card.id, 4)

      expect(updated).toBeDefined()
      expect(updated!.review_count).toBe(1)
      // After first review with quality 4, interval should stay 1 day, so next_review_at should be >= current time + 1 day
      expect(updated!.next_review_at).toBeGreaterThanOrEqual(card.next_review_at)
    })

    it('resets review_count on quality < 3', () => {
      // First create a card and give it some successful reviews
      const card = createReviewCard({
        interaction_id: 'int-1',
        question: 'Q',
        answer: 'A',
      })

      // Successful review
      let updated = updateReviewCard(card.id, 4)
      expect(updated!.review_count).toBe(1)

      // Another successful review
      updated = updateReviewCard(card.id, 4)
      expect(updated!.review_count).toBe(2)

      // Failed review - should reset
      updated = updateReviewCard(card.id, 2)
      expect(updated!.review_count).toBe(0)
      expect(updated!.interval_days).toBe(1)
    })

    it('returns undefined for non-existent card', () => {
      const result = updateReviewCard('non-existent-id', 4)
      expect(result).toBeUndefined()
    })

    it('persists changes to database', () => {
      const card = createReviewCard({
        interaction_id: 'int-1',
        question: 'Q',
        answer: 'A',
      })

      updateReviewCard(card.id, 4)

      const row = testDb.prepare('SELECT review_count FROM review_cards WHERE id = ?').get(card.id) as { review_count: number }
      expect(row.review_count).toBe(1)
    })
  })

  describe('getNextReviewCard', () => {
    it('returns card that is due', () => {
      // Create a card that is already due (next_review_at in the past)
      const now = Date.now()
      seedTestData(testDb, {
        reviewCards: [
          {
            id: 'card-1',
            interaction_id: 'int-1',
            question: 'Q1',
            answer: 'A1',
            next_review_at: now - 1000, // Due 1 second ago
          },
        ],
      })

      const card = getNextReviewCard()
      expect(card).toBeDefined()
      expect(card!.id).toBe('card-1')
    })

    it('returns undefined when no cards are due', () => {
      // Create a card that is not due yet
      seedTestData(testDb, {
        reviewCards: [
          {
            id: 'card-future',
            interaction_id: 'int-1',
            question: 'Q',
            answer: 'A',
            next_review_at: Date.now() + 24 * 60 * 60 * 1000, // Due in 1 day
          },
        ],
      })

      const card = getNextReviewCard()
      expect(card).toBeUndefined()
    })

    it('returns earliest due card first', () => {
      const now = Date.now()
      seedTestData(testDb, {
        reviewCards: [
          {
            id: 'card-later',
            interaction_id: 'int-1',
            question: 'Later',
            answer: 'A',
            next_review_at: now - 1000, // Due 1 second ago
          },
          {
            id: 'card-earlier',
            interaction_id: 'int-2',
            question: 'Earlier',
            answer: 'A',
            next_review_at: now - 10000, // Due 10 seconds ago
          },
        ],
      })

      const card = getNextReviewCard()
      expect(card).toBeDefined()
      expect(card!.id).toBe('card-earlier')
    })

    it('includes context fields from interaction and document', () => {
      const now = Date.now()
      seedTestData(testDb, {
        reviewCards: [
          {
            id: 'card-ctx',
            interaction_id: 'int-1',
            question: 'Q',
            answer: 'A',
            next_review_at: now - 1000,
          },
        ],
      })

      const card = getNextReviewCard()
      expect(card).toBeDefined()
      expect(card!.selected_text).toBe('test text')
      expect(card!.document_filename).toBe('test.pdf')
      expect(card!.action_type).toBe('explain')
    })
  })

  describe('getDueReviewCount', () => {
    it('returns 0 when no cards exist', () => {
      expect(getDueReviewCount()).toBe(0)
    })

    it('returns count of due cards only', () => {
      const now = Date.now()
      seedTestData(testDb, {
        reviewCards: [
          { id: 'card-due-1', interaction_id: 'int-1', question: 'Q', answer: 'A', next_review_at: now - 1000 },
          { id: 'card-due-2', interaction_id: 'int-2', question: 'Q', answer: 'A', next_review_at: now - 500 },
          { id: 'card-future', interaction_id: 'int-1', question: 'Q', answer: 'A', next_review_at: now + 86400000 },
        ],
      })

      expect(getDueReviewCount()).toBe(2)
    })
  })

  describe('getAllReviewCards', () => {
    it('returns empty array when no cards exist', () => {
      expect(getAllReviewCards()).toEqual([])
    })

    it('returns all cards with context', () => {
      seedTestData(testDb, {
        reviewCards: [
          { id: 'card-1', interaction_id: 'int-1', question: 'Q1', answer: 'A1', next_review_at: Date.now() },
          { id: 'card-2', interaction_id: 'int-2', question: 'Q2', answer: 'A2', next_review_at: Date.now() + 1000 },
        ],
      })

      const cards = getAllReviewCards()
      expect(cards).toHaveLength(2)
      expect(cards[0].document_filename).toBe('test.pdf')
    })

    it('orders by next_review_at ascending', () => {
      const now = Date.now()
      seedTestData(testDb, {
        reviewCards: [
          { id: 'card-later', interaction_id: 'int-1', question: 'Later', answer: 'A', next_review_at: now + 2000 },
          { id: 'card-first', interaction_id: 'int-2', question: 'First', answer: 'A', next_review_at: now },
          { id: 'card-middle', interaction_id: 'int-1', question: 'Middle', answer: 'A', next_review_at: now + 1000 },
        ],
      })

      const cards = getAllReviewCards()
      expect(cards[0].id).toBe('card-first')
      expect(cards[1].id).toBe('card-middle')
      expect(cards[2].id).toBe('card-later')
    })
  })

  describe('getReviewCardForInteraction', () => {
    it('returns card for given interaction', () => {
      seedTestData(testDb, {
        reviewCards: [
          { id: 'card-1', interaction_id: 'int-1', question: 'Q', answer: 'A', next_review_at: Date.now() },
        ],
      })

      const card = getReviewCardForInteraction('int-1')
      expect(card).toBeDefined()
      expect(card!.interaction_id).toBe('int-1')
    })

    it('returns undefined when no card exists for interaction', () => {
      const card = getReviewCardForInteraction('non-existent')
      expect(card).toBeUndefined()
    })
  })
})
