import { useState } from 'react'
import { useReviewCards } from '../../hooks/useReviewCards'

interface SpacedRepetitionDockProps {
  dueCount: number
  onReviewComplete: () => void
}

export default function SpacedRepetitionDock({
  dueCount,
  onReviewComplete,
}: SpacedRepetitionDockProps) {
  const {
    currentCard,
    isFlipped,
    isLoading,
    flipCard,
    rateCard,
    dueCount: actualDueCount,
  } = useReviewCards()

  const [isExpanded, setIsExpanded] = useState(false)

  const handleRate = async (quality: number) => {
    await rateCard(quality)
    onReviewComplete()
  }

  const displayCount = actualDueCount || dueCount

  // Collapsed state - just show the badge
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="review-dock w-full p-3 flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-white text-sm font-medium">Review Cards</p>
            <p className="text-gray-500 text-xs">
              {displayCount > 0 ? `${displayCount} cards due` : 'All caught up!'}
            </p>
          </div>
        </div>

        {displayCount > 0 && (
          <div className={`
            px-2 py-0.5 rounded-full text-xs font-medium
            ${displayCount > 0 ? 'bg-rose-500 text-white review-badge-pulse' : 'bg-gray-700 text-gray-400'}
          `}>
            {displayCount}
          </div>
        )}

        <svg
          className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors ml-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    )
  }

  // Expanded state - show the flashcard
  return (
    <div className="review-dock">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800/50">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-medium text-sm">Review</h3>
          {displayCount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-rose-500/20 text-rose-400">
              {displayCount} due
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-500 hover:text-white p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Card content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : currentCard ? (
          <>
            {/* Flashcard */}
            <div
              className={`review-card bg-zinc-800/50 rounded-lg min-h-[120px] cursor-pointer ${isFlipped ? 'flipped' : ''}`}
              onClick={flipCard}
              style={{ perspective: '1000px' }}
            >
              <div className="relative" style={{ transformStyle: 'preserve-3d' }}>
                {/* Front - Question */}
                <div
                  className={`review-card-face p-4 ${isFlipped ? 'invisible' : ''}`}
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Question
                  </div>
                  <p className="text-white text-sm leading-relaxed">
                    {currentCard.question}
                  </p>
                  <div className="mt-3 text-xs text-gray-600">
                    From: {currentCard.document_filename}
                  </div>
                </div>

                {/* Back - Answer */}
                {isFlipped && (
                  <div
                    className="review-card-face p-4"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="text-xs text-emerald-500 mb-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Answer
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {currentCard.answer}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Tap hint or rating buttons */}
            {!isFlipped ? (
              <div className="text-center mt-3 text-xs text-gray-600">
                Tap to reveal answer
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2 text-center">How well did you remember?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRate(0)}
                    className="rating-btn again flex-1"
                  >
                    Again
                  </button>
                  <button
                    onClick={() => handleRate(2)}
                    className="rating-btn hard flex-1"
                  >
                    Hard
                  </button>
                  <button
                    onClick={() => handleRate(3)}
                    className="rating-btn good flex-1"
                  >
                    Good
                  </button>
                  <button
                    onClick={() => handleRate(5)}
                    className="rating-btn easy flex-1"
                  >
                    Easy
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <svg
              className="w-10 h-10 mx-auto mb-2 text-emerald-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-white text-sm font-medium">All caught up!</p>
            <p className="text-gray-500 text-xs mt-1">
              No cards due for review
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
