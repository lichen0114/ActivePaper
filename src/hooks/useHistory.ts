import { useState, useCallback } from 'react'

export type ActionType = 'explain' | 'summarize' | 'define' | 'parse_equation' | 'explain_fundamental' | 'extract_terms'

export interface HistoryEntry {
  id: string
  timestamp: number
  selectedText: string
  action: ActionType
  response: string
}

// Maximum history size to prevent unbounded memory growth
const MAX_HISTORY_SIZE = 100

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const addEntry = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    setHistory(prev => [{
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    }, ...prev].slice(0, MAX_HISTORY_SIZE))
  }, [])

  const getEntry = useCallback((id: string) => {
    return history.find(entry => entry.id === id)
  }, [history])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  return {
    history,
    addEntry,
    getEntry,
    clearHistory,
  }
}
