import { useState, useCallback, useRef } from 'react'
import type { ActionType } from './useHistory'
import type { Message } from './useConversation'

interface AIState {
  response: string
  isLoading: boolean
  error: string | null
}

export function useAI() {
  const [state, setState] = useState<AIState>({
    response: '',
    isLoading: false,
    error: null,
  })

  // Use array accumulation to avoid O(n²) string concatenation
  const chunksRef = useRef<string[]>([])
  const rafScheduledRef = useRef(false)

  const askAI = useCallback(async (
    text: string,
    context?: string,
    action: ActionType = 'explain',
    conversationHistory?: Message[]
  ) => {
    if (!window.api) {
      setState({
        response: '',
        isLoading: false,
        error: 'API not available - running outside Electron',
      })
      return
    }

    // Reset chunks accumulator
    chunksRef.current = []
    rafScheduledRef.current = false

    setState({
      response: '',
      isLoading: true,
      error: null,
    })

    try {
      await window.api.askAI(
        text,
        context || '',
        undefined, // Use current provider
        action,
        conversationHistory,
        // onChunk - use RAF batching to avoid O(n²) string concatenation
        (chunk) => {
          chunksRef.current.push(chunk)
          if (!rafScheduledRef.current) {
            rafScheduledRef.current = true
            requestAnimationFrame(() => {
              setState((prev) => ({
                ...prev,
                response: chunksRef.current.join(''),
              }))
              rafScheduledRef.current = false
            })
          }
        },
        // onDone
        () => {
          setState((prev) => ({
            ...prev,
            isLoading: false,
          }))
        },
        // onError
        (error) => {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error,
          }))
        }
      )
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'An error occurred',
      }))
    }
  }, [])

  const clearResponse = useCallback(() => {
    setState({
      response: '',
      isLoading: false,
      error: null,
    })
  }, [])

  return {
    response: state.response,
    isLoading: state.isLoading,
    error: state.error,
    askAI,
    clearResponse,
  }
}
