import { useEffect, useCallback } from 'react'
import SearchInput from './SearchInput'
import SearchResults from './SearchResults'
import PDFSearchResults from './PDFSearchResults'
import { useSearch, type PDFSearchMatch } from '../../hooks/useSearch'

interface SearchModalProps {
  isOpen: boolean
  documentId?: string | null
  onClose: () => void
  onOpenDocument?: (filepath: string) => void
  onSearchPdf?: (query: string) => Promise<PDFSearchMatch[]>
  onJumpToPage?: (pageNumber: number) => void
}

function SearchModal({
  isOpen,
  documentId,
  onClose,
  onOpenDocument,
  onSearchPdf,
  onJumpToPage,
}: SearchModalProps) {
  const search = useSearch(documentId)

  // Run search when query or scope changes
  useEffect(() => {
    let cancelled = false
    const debounce = setTimeout(() => {
      const trimmed = search.query.trim()
      if (trimmed.length < 2) {
        if (search.scope === 'currentPdf') {
          search.setPdfMatches([])
        }
        return
      }

      if (search.scope === 'currentPdf') {
        if (!onSearchPdf) return
        search.setIsLoading(true)
        onSearchPdf(trimmed)
          .then((matches) => {
            if (!cancelled) {
              search.setPdfMatches(matches)
            }
          })
          .catch(() => {
            if (!cancelled) {
              search.setPdfMatches([])
            }
          })
        return
      }

      search.search()
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(debounce)
    }
  }, [search.query, search.scope, search.search, search.setPdfMatches, search.setIsLoading, onSearchPdf])

  // Clear search when modal closes
  useEffect(() => {
    if (!isOpen) {
      search.clearSearch()
    }
  }, [isOpen])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Jump to selected PDF match
  useEffect(() => {
    if (!isOpen || search.scope !== 'currentPdf') return
    const match = search.pdfMatches[search.selectedResultIndex]
    if (match) {
      onJumpToPage?.(match.pageNumber)
    }
  }, [isOpen, search.scope, search.pdfMatches, search.selectedResultIndex, onJumpToPage])

  const handleDocumentClick = useCallback((doc: DocumentSearchResult) => {
    onOpenDocument?.(doc.filepath)
    onClose()
  }, [onOpenDocument, onClose])

  const handleInteractionClick = useCallback((_interaction: InteractionSearchResult) => {
    // TODO: Navigate to interaction in document
    onClose()
  }, [onClose])

  const handleConceptClick = useCallback((_concept: ConceptSearchResult) => {
    // TODO: Show concept details
    onClose()
  }, [onClose])

  const handlePdfMatchClick = useCallback((match: PDFSearchMatch, index: number) => {
    search.setSelectedResultIndex(index)
    onJumpToPage?.(match.pageNumber)
  }, [search, onJumpToPage])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-20 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[600px] max-h-[70vh] bg-gray-800 rounded-xl shadow-2xl border border-gray-700/50 z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-4 py-3 border-b border-gray-700/50">
          <SearchInput
            query={search.query}
            scope={search.scope}
            onQueryChange={search.setQuery}
            onScopeChange={search.setScope}
            onSearch={search.search}
            isLoading={search.isLoading}
            totalResults={search.totalResults}
            selectedResultIndex={search.selectedResultIndex}
            onNextResult={search.selectNextResult}
            onPreviousResult={search.selectPreviousResult}
          />
        </header>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {search.scope === 'currentPdf' ? (
            <PDFSearchResults
              query={search.query}
              matches={search.pdfMatches}
              isLoading={search.isLoading}
              selectedIndex={search.selectedResultIndex}
              onResultClick={handlePdfMatchClick}
            />
          ) : (
            <SearchResults
              results={search.results}
              isLoading={search.isLoading}
              selectedIndex={search.selectedResultIndex}
              onDocumentClick={handleDocumentClick}
              onInteractionClick={handleInteractionClick}
              onConceptClick={handleConceptClick}
            />
          )}
        </div>

        {/* Footer */}
        <footer className="px-4 py-2 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">Enter</kbd>
              <span>Next</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">Shift+Enter</kbd>
              <span>Previous</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">Esc</kbd>
              <span>Close</span>
            </span>
          </div>
        </footer>
      </div>
    </>
  )
}

export default SearchModal
