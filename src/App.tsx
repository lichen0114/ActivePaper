import { useState, useEffect, useCallback } from 'react'
import PDFViewer from './components/PDFViewer'
import ResponsePanel from './components/ResponsePanel'
import ProviderSwitcher from './components/ProviderSwitcher'
import SettingsModal from './components/SettingsModal'
import SelectionPopover from './components/SelectionPopover'
import { useSelection } from './hooks/useSelection'
import { useAI } from './hooks/useAI'
import { useConversation } from './hooks/useConversation'
import { useHistory, type ActionType } from './hooks/useHistory'

function App() {
  const [pdfFile, setPdfFile] = useState<ArrayBuffer | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [providerRefreshKey, setProviderRefreshKey] = useState(0)
  const [currentAction, setCurrentAction] = useState<ActionType>('explain')

  const { selectedText, pageContext, selectionRect, clearSelection } = useSelection()
  const { response, isLoading, error, askAI, clearResponse } = useAI()
  const { conversation, startConversation, addMessage, appendToLastAssistantMessage, clearConversation } = useConversation()
  const { history, addEntry, getEntry } = useHistory()

  const handleKeyChange = useCallback(() => {
    setProviderRefreshKey(k => k + 1)
  }, [])

  // Handle file open from menu
  useEffect(() => {
    if (!window.api) return

    const unsubscribe = window.api.onFileOpened(async (filePath: string) => {
      try {
        setLoadError(null)
        const arrayBuffer = await window.api.readFile(filePath)
        setPdfFile(arrayBuffer)
        setFileName(filePath.split('/').pop() || 'document.pdf')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to open file'
        setLoadError(message)
        console.error('Failed to open file:', err)
      }
    })

    return () => unsubscribe()
  }, [])

  // Handle Cmd+J keyboard shortcut (default 'explain' action)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        if (selectedText) {
          handleAskAI('explain')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedText, pageContext])

  const handleAskAI = useCallback(async (action: ActionType = 'explain') => {
    if (!selectedText) return

    setIsPanelOpen(true)
    setCurrentAction(action)
    clearResponse()
    clearConversation()
    startConversation(selectedText, pageContext || '')

    // Add initial user message and empty assistant message for streaming
    const userMessage = selectedText
    addMessage('user', userMessage)
    addMessage('assistant', '')

    await askAI(selectedText, pageContext, action)
  }, [selectedText, pageContext, askAI, clearResponse, clearConversation, startConversation, addMessage])

  // Update conversation when response streams in
  useEffect(() => {
    if (response && conversation) {
      const messages = conversation.messages
      if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
        // Update the last assistant message with the current response
        appendToLastAssistantMessage('')
        // Actually just update through the response state directly
      }
    }
  }, [response])

  // Save to history when response completes
  useEffect(() => {
    if (!isLoading && response && selectedText && conversation) {
      addEntry({
        selectedText,
        action: currentAction,
        response,
      })
    }
  }, [isLoading, response])

  const handleFollowUp = useCallback(async (followUpText: string) => {
    if (!conversation || isLoading) return

    // Add the follow-up question and empty assistant response
    addMessage('user', followUpText)
    addMessage('assistant', '')

    // Build conversation history including the new follow-up
    const historyWithFollowUp = [
      ...conversation.messages,
      { role: 'user' as const, content: followUpText },
    ]

    clearResponse()
    await askAI(
      conversation.selectedText,
      conversation.pageContext,
      currentAction,
      historyWithFollowUp
    )
  }, [conversation, isLoading, addMessage, clearResponse, askAI, currentAction])

  const handleHistorySelect = useCallback((entry: ReturnType<typeof getEntry>) => {
    if (!entry) return
    // Restore the history entry view
    setCurrentAction(entry.action)
    clearResponse()
    clearConversation()
    startConversation(entry.selectedText, '')
    addMessage('user', entry.selectedText)
    addMessage('assistant', entry.response)
  }, [clearResponse, clearConversation, startConversation, addMessage])

  const handleClosePanel = () => {
    setIsPanelOpen(false)
    clearSelection()
    clearResponse()
    clearConversation()
  }

  // Handle drag and drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return

    const isPdf = file.type === 'application/pdf' ||
                  file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) return

    if (!window.api) return

    try {
      setLoadError(null)
      const filePath = window.api.getFilePath(file)
      const arrayBuffer = await window.api.readFile(filePath)
      setPdfFile(arrayBuffer)
      setFileName(file.name)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open file'
      setLoadError(message)
      console.error('Failed to open dropped file:', err)
    }
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Get messages for display (use conversation messages or response for display)
  const displayMessages = conversation?.messages.map((msg, idx) => {
    // For the last assistant message, use the streaming response
    if (idx === conversation.messages.length - 1 && msg.role === 'assistant') {
      return { ...msg, content: response || msg.content }
    }
    return msg
  }) || []

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Title bar / Top bar */}
      <div className="app-titlebar flex items-center justify-between px-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3 pl-16">
          <span className="text-sm text-gray-400 truncate max-w-md">
            {fileName || 'AI PDF Reader'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ProviderSwitcher onSettingsClick={() => setIsSettingsOpen(true)} refreshKey={providerRefreshKey} />
        </div>
      </div>

      {/* Main content area - horizontal flex */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF container - shrinks when sidebar opens */}
        <div
          className={`flex-1 relative overflow-hidden transition-all duration-300 ${isPanelOpen ? 'mr-[400px]' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {pdfFile ? (
            <PDFViewer data={pdfFile} onError={(msg) => setLoadError(msg)} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <svg
                className="w-24 h-24 mb-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-lg mb-2">Drop a PDF file here</p>
              <p className="text-sm">or use File - Open</p>
            </div>
          )}

          {/* Error display */}
          {loadError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/90 text-red-200 px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 max-w-md">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="truncate">{loadError}</span>
              <button
                onClick={() => setLoadError(null)}
                className="ml-2 p-1 hover:bg-red-800 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Selection toolbar */}
          <SelectionPopover
            selectionRect={selectionRect}
            onAction={handleAskAI}
            isVisible={!!selectedText && !isPanelOpen}
          />
        </div>

        {/* Response sidebar */}
        <ResponsePanel
          isOpen={isPanelOpen}
          response={response}
          isLoading={isLoading}
          error={error}
          selectedText={conversation?.selectedText || selectedText}
          messages={displayMessages}
          onClose={handleClosePanel}
          onFollowUp={handleFollowUp}
          history={history}
          onHistorySelect={handleHistorySelect}
          currentAction={currentAction}
        />
      </div>

      {/* Settings modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onKeyChange={handleKeyChange}
      />
    </div>
  )
}

export default App
