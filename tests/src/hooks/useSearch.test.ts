import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSearch } from '@/hooks/useSearch'

describe('useSearch', () => {
  let mockWindowApi: {
    searchAll: ReturnType<typeof vi.fn>
    searchDocuments: ReturnType<typeof vi.fn>
    searchInteractions: ReturnType<typeof vi.fn>
    searchConcepts: ReturnType<typeof vi.fn>
    searchInteractionsInDocument: ReturnType<typeof vi.fn>
  }

  const mockDocuments = [
    { id: 'doc-1', filename: 'quantum.pdf', filepath: '/path/quantum.pdf', last_opened_at: Date.now(), rank: 1 },
  ]

  const mockInteractions = [
    { id: 'int-1', document_id: 'doc-1', action_type: 'explain', selected_text: 'quantum', response: 'Quantum...', page_number: 1, created_at: Date.now(), filename: 'quantum.pdf', rank: 1, snippet: 'test <mark>quantum</mark>' },
  ]

  const mockConcepts = [
    { id: 'c-1', name: 'Quantum Mechanics', created_at: Date.now(), rank: 1 },
  ]

  beforeEach(() => {
    mockWindowApi = {
      searchAll: vi.fn(async () => ({
        documents: mockDocuments,
        interactions: mockInteractions,
        concepts: mockConcepts,
      })),
      searchDocuments: vi.fn(async () => mockDocuments),
      searchInteractions: vi.fn(async () => mockInteractions),
      searchConcepts: vi.fn(async () => mockConcepts),
      searchInteractionsInDocument: vi.fn(async () => mockInteractions),
    }
    ;(window as Window & { api: typeof mockWindowApi }).api = mockWindowApi
  })

  afterEach(() => {
    vi.clearAllMocks()
    delete (window as Window & { api?: typeof mockWindowApi }).api
  })

  describe('initial state', () => {
    it('starts with empty query and default scope', () => {
      const { result } = renderHook(() => useSearch())

      expect(result.current.query).toBe('')
      expect(result.current.scope).toBe('all')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.results).toBeNull()
      expect(result.current.pdfMatches).toEqual([])
      expect(result.current.selectedResultIndex).toBe(0)
      expect(result.current.totalResults).toBe(0)
    })
  })

  describe('setQuery', () => {
    it('updates query state', () => {
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('test query')
      })

      expect(result.current.query).toBe('test query')
    })
  })

  describe('setScope', () => {
    it('updates scope and resets results', async () => {
      const { result } = renderHook(() => useSearch())

      // First do a search to have results
      act(() => {
        result.current.setQuery('test')
      })

      await act(async () => {
        await result.current.search()
      })

      // Now change scope
      act(() => {
        result.current.setScope('documents')
      })

      expect(result.current.scope).toBe('documents')
      expect(result.current.results).toBeNull()
      expect(result.current.pdfMatches).toEqual([])
      expect(result.current.selectedResultIndex).toBe(0)
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('search', () => {
    it('returns no results for empty query', async () => {
      const { result } = renderHook(() => useSearch())

      await act(async () => {
        await result.current.search()
      })

      expect(result.current.results).toBeNull()
      expect(mockWindowApi.searchAll).not.toHaveBeenCalled()
    })

    it('returns no results for whitespace query', async () => {
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('   ')
      })

      await act(async () => {
        await result.current.search()
      })

      expect(result.current.results).toBeNull()
    })

    it('calls searchAll for scope "all"', async () => {
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('quantum')
      })

      await act(async () => {
        await result.current.search()
      })

      expect(mockWindowApi.searchAll).toHaveBeenCalledWith('quantum')
      expect(result.current.results).not.toBeNull()
      expect(result.current.results!.documents).toHaveLength(1)
    })

    it('calls searchDocuments for scope "documents"', async () => {
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('quantum')
        result.current.setScope('documents')
      })

      await act(async () => {
        await result.current.search()
      })

      expect(mockWindowApi.searchDocuments).toHaveBeenCalledWith('quantum')
      expect(result.current.results!.documents).toHaveLength(1)
      expect(result.current.results!.interactions).toEqual([])
      expect(result.current.results!.concepts).toEqual([])
    })

    it('calls searchInteractions for scope "interactions"', async () => {
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('quantum')
        result.current.setScope('interactions')
      })

      await act(async () => {
        await result.current.search()
      })

      expect(mockWindowApi.searchInteractions).toHaveBeenCalledWith('quantum')
    })

    it('calls searchInteractionsInDocument when documentId provided', async () => {
      const { result } = renderHook(() => useSearch('doc-1'))

      act(() => {
        result.current.setQuery('quantum')
        result.current.setScope('interactions')
      })

      await act(async () => {
        await result.current.search()
      })

      expect(mockWindowApi.searchInteractionsInDocument).toHaveBeenCalledWith('doc-1', 'quantum')
    })

    it('calls searchConcepts for scope "concepts"', async () => {
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('quantum')
        result.current.setScope('concepts')
      })

      await act(async () => {
        await result.current.search()
      })

      expect(mockWindowApi.searchConcepts).toHaveBeenCalledWith('quantum')
    })

    it('handles currentPdf scope locally', async () => {
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('test')
        result.current.setScope('currentPdf')
      })

      await act(async () => {
        await result.current.search()
      })

      // Should not call any API for currentPdf (handled locally)
      expect(mockWindowApi.searchAll).not.toHaveBeenCalled()
      expect(mockWindowApi.searchDocuments).not.toHaveBeenCalled()
      expect(result.current.isLoading).toBe(false)
    })

    it('sets isLoading during search', async () => {
      mockWindowApi.searchAll.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return { documents: [], interactions: [], concepts: [] }
      })

      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('test')
      })

      act(() => {
        result.current.search()
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('handles search errors gracefully', async () => {
      mockWindowApi.searchAll.mockRejectedValue(new Error('Search failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('test')
      })

      await act(async () => {
        await result.current.search()
      })

      expect(result.current.isLoading).toBe(false)
      consoleSpy.mockRestore()
    })
  })

  describe('setPdfMatches', () => {
    it('sets PDF matches and resets index', () => {
      const { result } = renderHook(() => useSearch())

      const matches = [
        { pageNumber: 1, text: 'match 1', index: 0 },
        { pageNumber: 2, text: 'match 2', index: 1 },
      ]

      act(() => {
        result.current.setPdfMatches(matches)
      })

      expect(result.current.pdfMatches).toEqual(matches)
      expect(result.current.selectedResultIndex).toBe(0)
    })
  })

  describe('selectNextResult', () => {
    it('increments selected result index', async () => {
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('test')
      })

      await act(async () => {
        await result.current.search()
      })

      act(() => {
        result.current.selectNextResult()
      })

      expect(result.current.selectedResultIndex).toBe(1)
    })

    it('wraps around to 0 at end', async () => {
      mockWindowApi.searchAll.mockResolvedValue({
        documents: [{ id: 'd1' }, { id: 'd2' }],
        interactions: [],
        concepts: [],
      })

      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('test')
      })

      await act(async () => {
        await result.current.search()
      })

      expect(result.current.totalResults).toBe(2)

      // Go to index 1
      act(() => {
        result.current.selectNextResult()
      })
      expect(result.current.selectedResultIndex).toBe(1)

      // Should wrap to 0
      act(() => {
        result.current.selectNextResult()
      })
      expect(result.current.selectedResultIndex).toBe(0)
    })

    it('does nothing when no results', () => {
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.selectNextResult()
      })

      expect(result.current.selectedResultIndex).toBe(0)
    })
  })

  describe('selectPreviousResult', () => {
    it('decrements selected result index', async () => {
      mockWindowApi.searchAll.mockResolvedValue({
        documents: [{ id: 'd1' }, { id: 'd2' }],
        interactions: [],
        concepts: [],
      })

      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('test')
      })

      await act(async () => {
        await result.current.search()
      })

      // Start at index 1
      act(() => {
        result.current.selectNextResult()
      })
      expect(result.current.selectedResultIndex).toBe(1)

      act(() => {
        result.current.selectPreviousResult()
      })

      expect(result.current.selectedResultIndex).toBe(0)
    })

    it('wraps around to last at beginning', async () => {
      mockWindowApi.searchAll.mockResolvedValue({
        documents: [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }],
        interactions: [],
        concepts: [],
      })

      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('test')
      })

      await act(async () => {
        await result.current.search()
      })

      expect(result.current.totalResults).toBe(3)

      // At index 0, go previous
      act(() => {
        result.current.selectPreviousResult()
      })

      expect(result.current.selectedResultIndex).toBe(2)
    })
  })

  describe('clearSearch', () => {
    it('resets all search state', async () => {
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('test')
        result.current.setScope('documents')
      })

      await act(async () => {
        await result.current.search()
      })

      act(() => {
        result.current.clearSearch()
      })

      expect(result.current.query).toBe('')
      expect(result.current.scope).toBe('all')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.results).toBeNull()
      expect(result.current.pdfMatches).toEqual([])
      expect(result.current.selectedResultIndex).toBe(0)
    })
  })

  describe('totalResults', () => {
    it('counts results from all types for scope "all"', async () => {
      mockWindowApi.searchAll.mockResolvedValue({
        documents: [{ id: 'd1' }],
        interactions: [{ id: 'i1' }, { id: 'i2' }],
        concepts: [{ id: 'c1' }],
      })

      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('test')
      })

      await act(async () => {
        await result.current.search()
      })

      expect(result.current.totalResults).toBe(4) // 1 + 2 + 1
    })

    it('counts pdfMatches for scope "currentPdf"', () => {
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setScope('currentPdf')
        result.current.setPdfMatches([
          { pageNumber: 1, text: 'a', index: 0 },
          { pageNumber: 2, text: 'b', index: 1 },
          { pageNumber: 3, text: 'c', index: 2 },
        ])
      })

      expect(result.current.totalResults).toBe(3)
    })

    it('returns 0 when no results', () => {
      const { result } = renderHook(() => useSearch())

      expect(result.current.totalResults).toBe(0)
    })
  })
})
