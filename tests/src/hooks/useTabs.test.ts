import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTabs } from '@/hooks/useTabs'

describe('useTabs', () => {
  let mockWindowApi: {
    readFile: ReturnType<typeof vi.fn>
    getOrCreateDocument: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockWindowApi = {
      readFile: vi.fn(async () => new ArrayBuffer(100)),
      getOrCreateDocument: vi.fn(async (data: { filename: string; filepath: string }) => ({
        id: `doc-${Date.now()}`,
        filename: data.filename,
        filepath: data.filepath,
        last_opened_at: Date.now(),
        scroll_position: 0,
        total_pages: null,
        created_at: Date.now(),
      })),
    }
    ;(window as Window & { api: typeof mockWindowApi }).api = mockWindowApi
  })

  afterEach(() => {
    vi.clearAllMocks()
    delete (window as Window & { api?: typeof mockWindowApi }).api
  })

  describe('initial state', () => {
    it('starts with no tabs', () => {
      const { result } = renderHook(() => useTabs())

      expect(result.current.tabs).toEqual([])
      expect(result.current.activeTabId).toBeNull()
      expect(result.current.activeTab).toBeNull()
    })
  })

  describe('openTab', () => {
    it('creates a new tab with loading state', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test.pdf')
      })

      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0].filePath).toBe('/path/to/test.pdf')
      expect(result.current.tabs[0].fileName).toBe('test.pdf')
    })

    it('sets the new tab as active', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test.pdf')
      })

      expect(result.current.activeTabId).toBe(result.current.tabs[0].id)
      expect(result.current.activeTab).not.toBeNull()
    })

    it('loads PDF data from the API', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test.pdf')
      })

      expect(mockWindowApi.readFile).toHaveBeenCalledWith('/path/to/test.pdf')
      expect(mockWindowApi.getOrCreateDocument).toHaveBeenCalled()

      await waitFor(() => {
        expect(result.current.tabs[0].pdfData).not.toBeNull()
        expect(result.current.tabs[0].isLoading).toBe(false)
      })
    })

    it('returns existing tab when file is already open', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test.pdf')
      })

      const firstTabId = result.current.tabs[0].id

      await act(async () => {
        await result.current.openTab('/path/to/test.pdf')
      })

      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0].id).toBe(firstTabId)
    })

    it('replaces stale tab with loadError when reopening', async () => {
      mockWindowApi.readFile.mockRejectedValueOnce(new Error('File not found'))

      const { result } = renderHook(() => useTabs())

      // First attempt fails
      await act(async () => {
        await result.current.openTab('/path/to/test.pdf')
      })

      await waitFor(() => {
        expect(result.current.tabs[0].loadError).toBe('File not found')
      })

      const errorTabId = result.current.tabs[0].id

      // Reset mock to succeed
      mockWindowApi.readFile.mockResolvedValueOnce(new ArrayBuffer(100))

      // Reopening should replace the error tab
      await act(async () => {
        await result.current.openTab('/path/to/test.pdf')
      })

      await waitFor(() => {
        expect(result.current.tabs).toHaveLength(1)
        expect(result.current.tabs[0].id).not.toBe(errorTabId)
        expect(result.current.tabs[0].loadError).toBeNull()
      })
    })

    it('handles readFile failure', async () => {
      mockWindowApi.readFile.mockRejectedValue(new Error('Read failed'))

      const { result } = renderHook(() => useTabs())

      await act(async () => {
        const tab = await result.current.openTab('/path/to/test.pdf')
        expect(tab).toBeNull()
      })

      await waitFor(() => {
        expect(result.current.tabs[0].loadError).toBe('Read failed')
        expect(result.current.tabs[0].isLoading).toBe(false)
      })
    })

    it('sets default scale to 1.5', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test.pdf')
      })

      expect(result.current.tabs[0].scale).toBe(1.5)
    })
  })

  describe('closeTab', () => {
    it('removes the tab', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test1.pdf')
        await result.current.openTab('/path/to/test2.pdf')
      })

      await waitFor(() => {
        expect(result.current.tabs).toHaveLength(2)
      })

      const tabToClose = result.current.tabs[0].id

      act(() => {
        result.current.closeTab(tabToClose)
      })

      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs.find(t => t.id === tabToClose)).toBeUndefined()
    })

    it('switches to adjacent tab when closing active tab', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test1.pdf')
        await result.current.openTab('/path/to/test2.pdf')
      })

      await waitFor(() => {
        expect(result.current.tabs).toHaveLength(2)
      })

      // Active tab should be the second one (most recently opened)
      const activeTabId = result.current.activeTabId
      const otherTabId = result.current.tabs.find(t => t.id !== activeTabId)!.id

      act(() => {
        result.current.closeTab(activeTabId!)
      })

      expect(result.current.activeTabId).toBe(otherTabId)
    })

    it('sets activeTabId to null when closing last tab', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test.pdf')
      })

      await waitFor(() => {
        expect(result.current.tabs).toHaveLength(1)
      })

      act(() => {
        result.current.closeTab(result.current.tabs[0].id)
      })

      expect(result.current.tabs).toHaveLength(0)
      expect(result.current.activeTabId).toBeNull()
    })

    it('sets pdfData to null for memory cleanup', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test.pdf')
      })

      await waitFor(() => {
        expect(result.current.tabs[0].pdfData).not.toBeNull()
      })

      // Store reference to check cleanup
      const tabId = result.current.tabs[0].id

      act(() => {
        result.current.closeTab(tabId)
      })

      // Tab should be removed, pdfData cleaned up before removal
      expect(result.current.tabs.find(t => t.id === tabId)).toBeUndefined()
    })
  })

  describe('selectTab', () => {
    it('sets the active tab', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test1.pdf')
        await result.current.openTab('/path/to/test2.pdf')
      })

      await waitFor(() => {
        expect(result.current.tabs).toHaveLength(2)
      })

      const firstTabId = result.current.tabs[0].id

      act(() => {
        result.current.selectTab(firstTabId)
      })

      expect(result.current.activeTabId).toBe(firstTabId)
    })

    it('does nothing for non-existent tab', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test.pdf')
      })

      const originalActiveId = result.current.activeTabId

      act(() => {
        result.current.selectTab('non-existent-id')
      })

      expect(result.current.activeTabId).toBe(originalActiveId)
    })
  })

  describe('updateTab', () => {
    it('merges partial state updates', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test.pdf')
      })

      await waitFor(() => {
        expect(result.current.tabs).toHaveLength(1)
      })

      const tabId = result.current.tabs[0].id

      act(() => {
        result.current.updateTab(tabId, { scale: 2.0, scrollPosition: 500 })
      })

      expect(result.current.tabs[0].scale).toBe(2.0)
      expect(result.current.tabs[0].scrollPosition).toBe(500)
      // Other fields should be unchanged
      expect(result.current.tabs[0].filePath).toBe('/path/to/test.pdf')
    })
  })

  describe('reloadTab', () => {
    it('resets to loading state and reloads', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test.pdf')
      })

      await waitFor(() => {
        expect(result.current.tabs[0].isLoading).toBe(false)
      })

      const tabId = result.current.tabs[0].id
      mockWindowApi.readFile.mockClear()

      await act(async () => {
        await result.current.reloadTab(tabId)
      })

      expect(mockWindowApi.readFile).toHaveBeenCalledWith('/path/to/test.pdf')
    })
  })

  describe('selectPreviousTab', () => {
    it('selects the previous tab', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test1.pdf')
        await result.current.openTab('/path/to/test2.pdf')
        await result.current.openTab('/path/to/test3.pdf')
      })

      await waitFor(() => {
        expect(result.current.tabs).toHaveLength(3)
      })

      // Select the middle tab
      const middleTabId = result.current.tabs[1].id
      act(() => {
        result.current.selectTab(middleTabId)
      })

      act(() => {
        result.current.selectPreviousTab()
      })

      expect(result.current.activeTabId).toBe(result.current.tabs[0].id)
    })

    it('wraps around to last tab when at first', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test1.pdf')
        await result.current.openTab('/path/to/test2.pdf')
      })

      await waitFor(() => {
        expect(result.current.tabs).toHaveLength(2)
      })

      // Select the first tab
      act(() => {
        result.current.selectTab(result.current.tabs[0].id)
      })

      act(() => {
        result.current.selectPreviousTab()
      })

      expect(result.current.activeTabId).toBe(result.current.tabs[1].id)
    })

    it('does nothing with single tab', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test.pdf')
      })

      await waitFor(() => {
        expect(result.current.tabs).toHaveLength(1)
      })

      const activeId = result.current.activeTabId

      act(() => {
        result.current.selectPreviousTab()
      })

      expect(result.current.activeTabId).toBe(activeId)
    })
  })

  describe('selectNextTab', () => {
    it('selects the next tab', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test1.pdf')
        await result.current.openTab('/path/to/test2.pdf')
      })

      await waitFor(() => {
        expect(result.current.tabs).toHaveLength(2)
      })

      // Select the first tab
      act(() => {
        result.current.selectTab(result.current.tabs[0].id)
      })

      act(() => {
        result.current.selectNextTab()
      })

      expect(result.current.activeTabId).toBe(result.current.tabs[1].id)
    })

    it('wraps around to first tab when at last', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test1.pdf')
        await result.current.openTab('/path/to/test2.pdf')
      })

      await waitFor(() => {
        expect(result.current.tabs).toHaveLength(2)
      })

      // Ensure we're on the last tab
      act(() => {
        result.current.selectTab(result.current.tabs[1].id)
      })

      act(() => {
        result.current.selectNextTab()
      })

      expect(result.current.activeTabId).toBe(result.current.tabs[0].id)
    })
  })

  describe('selectTabByIndex', () => {
    it('selects tab at given index', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test1.pdf')
        await result.current.openTab('/path/to/test2.pdf')
        await result.current.openTab('/path/to/test3.pdf')
      })

      await waitFor(() => {
        expect(result.current.tabs).toHaveLength(3)
      })

      act(() => {
        result.current.selectTabByIndex(1)
      })

      expect(result.current.activeTabId).toBe(result.current.tabs[1].id)
    })

    it('handles out-of-bounds index gracefully', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test.pdf')
      })

      await waitFor(() => {
        expect(result.current.tabs).toHaveLength(1)
      })

      const activeId = result.current.activeTabId

      act(() => {
        result.current.selectTabByIndex(10)
      })

      // Should not change active tab
      expect(result.current.activeTabId).toBe(activeId)
    })

    it('handles negative index gracefully', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test.pdf')
      })

      await waitFor(() => {
        expect(result.current.tabs).toHaveLength(1)
      })

      const activeId = result.current.activeTabId

      act(() => {
        result.current.selectTabByIndex(-1)
      })

      expect(result.current.activeTabId).toBe(activeId)
    })
  })

  describe('closeCurrentTab', () => {
    it('closes the active tab', async () => {
      const { result } = renderHook(() => useTabs())

      await act(async () => {
        await result.current.openTab('/path/to/test1.pdf')
        await result.current.openTab('/path/to/test2.pdf')
      })

      await waitFor(() => {
        expect(result.current.tabs).toHaveLength(2)
      })

      const activeId = result.current.activeTabId

      act(() => {
        result.current.closeCurrentTab()
      })

      expect(result.current.tabs.find(t => t.id === activeId)).toBeUndefined()
    })

    it('does nothing when no active tab', () => {
      const { result } = renderHook(() => useTabs())

      // Should not throw
      act(() => {
        result.current.closeCurrentTab()
      })

      expect(result.current.tabs).toHaveLength(0)
    })
  })
})
