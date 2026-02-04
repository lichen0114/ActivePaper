import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useHighlights } from '@/hooks/useHighlights'

describe('useHighlights', () => {
  let mockWindowApi: {
    getHighlightsByDocument: ReturnType<typeof vi.fn>
    createHighlight: ReturnType<typeof vi.fn>
    updateHighlight: ReturnType<typeof vi.fn>
    deleteHighlight: ReturnType<typeof vi.fn>
  }

  const mockHighlights = [
    {
      id: 'hl-1',
      document_id: 'doc-1',
      page_number: 1,
      start_offset: 0,
      end_offset: 10,
      selected_text: 'First highlight',
      color: 'yellow',
      note: null,
      created_at: Date.now() - 1000,
      updated_at: Date.now() - 1000,
    },
    {
      id: 'hl-2',
      document_id: 'doc-1',
      page_number: 1,
      start_offset: 20,
      end_offset: 30,
      selected_text: 'Second highlight',
      color: 'blue',
      note: 'A note',
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    {
      id: 'hl-3',
      document_id: 'doc-1',
      page_number: 2,
      start_offset: 5,
      end_offset: 15,
      selected_text: 'Page 2 highlight',
      color: 'green',
      note: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    },
  ]

  beforeEach(() => {
    mockWindowApi = {
      getHighlightsByDocument: vi.fn(async () => [...mockHighlights]),
      createHighlight: vi.fn(async (data) => ({
        id: `hl-${Date.now()}`,
        document_id: data.document_id,
        page_number: data.page_number,
        start_offset: data.start_offset,
        end_offset: data.end_offset,
        selected_text: data.selected_text,
        color: data.color || 'yellow',
        note: data.note || null,
        created_at: Date.now(),
        updated_at: Date.now(),
      })),
      updateHighlight: vi.fn(async (data) => {
        const original = mockHighlights.find(h => h.id === data.id)
        if (!original) return null
        return {
          ...original,
          color: data.color ?? original.color,
          note: data.note !== undefined ? data.note : original.note,
          updated_at: Date.now(),
        }
      }),
      deleteHighlight: vi.fn(async () => true),
    }
    ;(window as Window & { api: typeof mockWindowApi }).api = mockWindowApi
  })

  afterEach(() => {
    vi.clearAllMocks()
    delete (window as Window & { api?: typeof mockWindowApi }).api
  })

  describe('initial state', () => {
    it('starts with empty highlights when no documentId', () => {
      const { result } = renderHook(() => useHighlights(null))

      expect(result.current.highlights).toEqual([])
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('loading highlights', () => {
    it('loads highlights when documentId is provided', async () => {
      const { result } = renderHook(() => useHighlights('doc-1'))

      await waitFor(() => {
        expect(result.current.highlights).toHaveLength(3)
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockWindowApi.getHighlightsByDocument).toHaveBeenCalledWith('doc-1')
    })

    it('clears highlights when documentId becomes null', async () => {
      const { result, rerender } = renderHook(
        ({ documentId }) => useHighlights(documentId),
        { initialProps: { documentId: 'doc-1' as string | null } }
      )

      await waitFor(() => {
        expect(result.current.highlights).toHaveLength(3)
      })

      rerender({ documentId: null })

      expect(result.current.highlights).toEqual([])
    })

    it('reloads highlights when documentId changes', async () => {
      const { result, rerender } = renderHook(
        ({ documentId }) => useHighlights(documentId),
        { initialProps: { documentId: 'doc-1' } }
      )

      await waitFor(() => {
        expect(result.current.highlights).toHaveLength(3)
      })

      mockWindowApi.getHighlightsByDocument.mockResolvedValueOnce([
        { id: 'hl-other', document_id: 'doc-2', page_number: 1, start_offset: 0, end_offset: 5, selected_text: 'Other', color: 'yellow', note: null, created_at: Date.now(), updated_at: Date.now() },
      ])

      rerender({ documentId: 'doc-2' })

      await waitFor(() => {
        expect(result.current.highlights).toHaveLength(1)
        expect(result.current.highlights[0].document_id).toBe('doc-2')
      })
    })

    it('handles load error gracefully', async () => {
      mockWindowApi.getHighlightsByDocument.mockRejectedValue(new Error('Load failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useHighlights('doc-1'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.highlights).toEqual([])
      consoleSpy.mockRestore()
    })
  })

  describe('createHighlight', () => {
    it('creates highlight via API and adds to local state', async () => {
      const { result } = renderHook(() => useHighlights('doc-1'))

      await waitFor(() => {
        expect(result.current.highlights).toHaveLength(3)
      })

      let newHighlight: unknown

      await act(async () => {
        newHighlight = await result.current.createHighlight(
          3, // pageNumber
          0, // startOffset
          20, // endOffset
          'New highlight text',
          'pink',
          'My note'
        )
      })

      expect(mockWindowApi.createHighlight).toHaveBeenCalledWith({
        document_id: 'doc-1',
        page_number: 3,
        start_offset: 0,
        end_offset: 20,
        selected_text: 'New highlight text',
        color: 'pink',
        note: 'My note',
      })

      expect(newHighlight).not.toBeNull()
      expect(result.current.highlights).toHaveLength(4)
    })

    it('returns null when no documentId', async () => {
      const { result } = renderHook(() => useHighlights(null))

      let highlight: unknown

      await act(async () => {
        highlight = await result.current.createHighlight(1, 0, 10, 'Text')
      })

      expect(highlight).toBeNull()
      expect(mockWindowApi.createHighlight).not.toHaveBeenCalled()
    })

    it('uses default color yellow when not specified', async () => {
      const { result } = renderHook(() => useHighlights('doc-1'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.createHighlight(1, 0, 10, 'Text')
      })

      expect(mockWindowApi.createHighlight).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'yellow' })
      )
    })

    it('handles create error gracefully', async () => {
      mockWindowApi.createHighlight.mockRejectedValue(new Error('Create failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useHighlights('doc-1'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let highlight: unknown

      await act(async () => {
        highlight = await result.current.createHighlight(1, 0, 10, 'Text')
      })

      expect(highlight).toBeNull()
      consoleSpy.mockRestore()
    })
  })

  describe('updateHighlight', () => {
    it('updates highlight via API and local state', async () => {
      const { result } = renderHook(() => useHighlights('doc-1'))

      await waitFor(() => {
        expect(result.current.highlights).toHaveLength(3)
      })

      await act(async () => {
        await result.current.updateHighlight('hl-1', { color: 'purple', note: 'Updated note' })
      })

      expect(mockWindowApi.updateHighlight).toHaveBeenCalledWith({
        id: 'hl-1',
        color: 'purple',
        note: 'Updated note',
      })

      const updated = result.current.highlights.find(h => h.id === 'hl-1')
      expect(updated!.color).toBe('purple')
      expect(updated!.note).toBe('Updated note')
    })

    it('returns null for non-existent highlight', async () => {
      mockWindowApi.updateHighlight.mockResolvedValue(null)

      const { result } = renderHook(() => useHighlights('doc-1'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let updated: unknown

      await act(async () => {
        updated = await result.current.updateHighlight('non-existent', { color: 'blue' })
      })

      expect(updated).toBeNull()
    })
  })

  describe('deleteHighlight', () => {
    it('deletes highlight via API and removes from local state', async () => {
      const { result } = renderHook(() => useHighlights('doc-1'))

      await waitFor(() => {
        expect(result.current.highlights).toHaveLength(3)
      })

      let success: boolean

      await act(async () => {
        success = await result.current.deleteHighlight('hl-1')
      })

      expect(success!).toBe(true)
      expect(mockWindowApi.deleteHighlight).toHaveBeenCalledWith('hl-1')
      expect(result.current.highlights).toHaveLength(2)
      expect(result.current.highlights.find(h => h.id === 'hl-1')).toBeUndefined()
    })

    it('handles delete failure', async () => {
      mockWindowApi.deleteHighlight.mockResolvedValue(false)

      const { result } = renderHook(() => useHighlights('doc-1'))

      await waitFor(() => {
        expect(result.current.highlights).toHaveLength(3)
      })

      let success: boolean

      await act(async () => {
        success = await result.current.deleteHighlight('hl-1')
      })

      expect(success!).toBe(false)
      // Should not remove from local state
      expect(result.current.highlights).toHaveLength(3)
    })
  })

  describe('getHighlightsForPage', () => {
    it('filters highlights by page number', async () => {
      const { result } = renderHook(() => useHighlights('doc-1'))

      await waitFor(() => {
        expect(result.current.highlights).toHaveLength(3)
      })

      const page1Highlights = result.current.getHighlightsForPage(1)
      expect(page1Highlights).toHaveLength(2)
      expect(page1Highlights.every(h => h.page_number === 1)).toBe(true)

      const page2Highlights = result.current.getHighlightsForPage(2)
      expect(page2Highlights).toHaveLength(1)
      expect(page2Highlights[0].id).toBe('hl-3')
    })

    it('returns empty array for page with no highlights', async () => {
      const { result } = renderHook(() => useHighlights('doc-1'))

      await waitFor(() => {
        expect(result.current.highlights).toHaveLength(3)
      })

      const page99Highlights = result.current.getHighlightsForPage(99)
      expect(page99Highlights).toEqual([])
    })
  })
})
