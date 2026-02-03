import { useState, useEffect, useCallback } from 'react'

interface UseReviewCardsState {
  currentCard: ReviewCard | null
  dueCount: number
  isFlipped: boolean
  isLoading: boolean
  error: string | null
}

export function useReviewCards() {
  const [state, setState] = useState<UseReviewCardsState>({
    currentCard: null,
    dueCount: 0,
    isFlipped: false,
    isLoading: true,
    error: null,
  })

  const loadNextCard = useCallback(async () => {
    if (!window.api) return

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null, isFlipped: false }))

      const [nextCard, dueCount] = await Promise.all([
        window.api.getNextReviewCard(),
        window.api.getDueReviewCount(),
      ])

      setState({
        currentCard: nextCard,
        dueCount,
        isFlipped: false,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load review card',
      }))
    }
  }, [])

  useEffect(() => {
    loadNextCard()
  }, [loadNextCard])

  const flipCard = useCallback(() => {
    setState(prev => ({ ...prev, isFlipped: !prev.isFlipped }))
  }, [])

  const rateCard = useCallback(async (quality: number) => {
    if (!window.api || !state.currentCard) return

    try {
      setState(prev => ({ ...prev, isLoading: true }))

      await window.api.updateReviewCard({
        cardId: state.currentCard.id,
        quality,
      })

      // Load next card
      await loadNextCard()
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to rate card',
      }))
    }
  }, [state.currentCard, loadNextCard])

  return {
    ...state,
    flipCard,
    rateCard,
    refresh: loadNextCard,
  }
}
