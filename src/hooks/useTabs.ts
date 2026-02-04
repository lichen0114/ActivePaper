import { useState, useCallback, useRef, useEffect } from 'react'
import type { TabState } from '../types/tabs'

const SCALE_DEFAULT = 1.5

function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function useTabs() {
  const [tabs, setTabs] = useState<TabState[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)

  // Use refs for lookups in callbacks to avoid dependency on full tabs array
  const tabsRef = useRef(tabs)
  const activeTabIdRef = useRef(activeTabId)

  useEffect(() => {
    tabsRef.current = tabs
  }, [tabs])

  useEffect(() => {
    activeTabIdRef.current = activeTabId
  }, [activeTabId])

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null

  const openTab = useCallback(async (filePath: string): Promise<TabState | null> => {
    // Check if file is already open (use ref for lookup)
    const existingTab = tabsRef.current.find(t => t.filePath === filePath)
    if (existingTab) {
      // If the existing tab has data and no error, just switch to it
      if (existingTab.pdfData && !existingTab.loadError) {
        setActiveTabId(existingTab.id)
        return existingTab
      }
      // Otherwise, the tab needs to reload (stale or error state) - remove it and create fresh
      setTabs(prev => prev.filter(t => t.id !== existingTab.id))
    }

    const fileName = filePath.split('/').pop() || 'document.pdf'
    const newTab: TabState = {
      id: generateTabId(),
      filePath,
      fileName,
      documentId: null,
      pdfData: null,
      scrollPosition: 0,
      scale: SCALE_DEFAULT,
      isLoading: true,
      loadError: null,
    }

    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)

    // Load PDF data
    if (window.api) {
      try {
        const arrayBuffer = await window.api.readFile(filePath)
        const doc = await window.api.getOrCreateDocument({
          filename: fileName,
          filepath: filePath,
        })

        setTabs(prev => prev.map(t =>
          t.id === newTab.id
            ? { ...t, pdfData: arrayBuffer, documentId: doc.id, isLoading: false }
            : t
        ))

        return { ...newTab, pdfData: arrayBuffer, documentId: doc.id, isLoading: false }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to open file'
        setTabs(prev => prev.map(t =>
          t.id === newTab.id
            ? { ...t, isLoading: false, loadError: message }
            : t
        ))
        return null
      }
    }

    return null
  }, []) // Use tabsRef for lookups instead of tabs array

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const tabIndex = prev.findIndex(t => t.id === tabId)
      if (tabIndex === -1) return prev

      // Clean up pdfData before removing to free memory
      const tabToClose = prev.find(t => t.id === tabId)
      if (tabToClose) {
        tabToClose.pdfData = null
      }

      const newTabs = prev.filter(t => t.id !== tabId)

      // If closing the active tab, switch to adjacent tab (use ref for current activeTabId)
      if (activeTabIdRef.current === tabId && newTabs.length > 0) {
        const newActiveIndex = Math.min(tabIndex, newTabs.length - 1)
        setActiveTabId(newTabs[newActiveIndex].id)
      } else if (newTabs.length === 0) {
        setActiveTabId(null)
      }

      return newTabs
    })
  }, []) // Use activeTabIdRef instead of activeTabId

  const selectTab = useCallback((tabId: string) => {
    const tab = tabsRef.current.find(t => t.id === tabId)
    if (tab) {
      setActiveTabId(tabId)
    }
  }, []) // Use tabsRef for lookup

  const updateTab = useCallback((tabId: string, updates: Partial<TabState>) => {
    setTabs(prev => prev.map(t =>
      t.id === tabId ? { ...t, ...updates } : t
    ))
  }, [])

  const reloadTab = useCallback(async (tabId: string): Promise<void> => {
    const tab = tabsRef.current.find(t => t.id === tabId)
    if (!tab || !window.api) return

    // Reset to loading state
    setTabs(prev => prev.map(t =>
      t.id === tabId
        ? { ...t, pdfData: null, loadError: null, isLoading: true }
        : t
    ))

    try {
      const arrayBuffer = await window.api.readFile(tab.filePath)
      const doc = await window.api.getOrCreateDocument({
        filename: tab.fileName,
        filepath: tab.filePath,
      })

      setTabs(prev => prev.map(t =>
        t.id === tabId
          ? { ...t, pdfData: arrayBuffer, documentId: doc.id, isLoading: false }
          : t
      ))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open file'
      setTabs(prev => prev.map(t =>
        t.id === tabId
          ? { ...t, isLoading: false, loadError: message }
          : t
      ))
    }
  }, []) // Use tabsRef for lookup

  const selectPreviousTab = useCallback(() => {
    const currentTabs = tabsRef.current
    const currentActiveId = activeTabIdRef.current
    if (currentTabs.length <= 1 || !currentActiveId) return
    const currentIndex = currentTabs.findIndex(t => t.id === currentActiveId)
    const newIndex = currentIndex === 0 ? currentTabs.length - 1 : currentIndex - 1
    setActiveTabId(currentTabs[newIndex].id)
  }, []) // Use refs for lookups

  const selectNextTab = useCallback(() => {
    const currentTabs = tabsRef.current
    const currentActiveId = activeTabIdRef.current
    if (currentTabs.length <= 1 || !currentActiveId) return
    const currentIndex = currentTabs.findIndex(t => t.id === currentActiveId)
    const newIndex = currentIndex === currentTabs.length - 1 ? 0 : currentIndex + 1
    setActiveTabId(currentTabs[newIndex].id)
  }, []) // Use refs for lookups

  const selectTabByIndex = useCallback((index: number) => {
    const currentTabs = tabsRef.current
    if (index >= 0 && index < currentTabs.length) {
      setActiveTabId(currentTabs[index].id)
    }
  }, []) // Use tabsRef for lookup

  const closeCurrentTab = useCallback(() => {
    const currentActiveId = activeTabIdRef.current
    if (currentActiveId) {
      closeTab(currentActiveId)
    }
  }, [closeTab]) // closeTab is now stable

  return {
    tabs,
    activeTabId,
    activeTab,
    openTab,
    closeTab,
    selectTab,
    updateTab,
    reloadTab,
    selectPreviousTab,
    selectNextTab,
    selectTabByIndex,
    closeCurrentTab,
  }
}
