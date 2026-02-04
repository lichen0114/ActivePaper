import { useEffect, useMemo, useRef, useState } from 'react'
import type { HighlightData } from '../../hooks/useHighlights'
import type { PDFOutlineItem } from '../../types/pdf'
import { getHighlightBgClass } from '../highlights/HighlightColorPicker'

type NavigatorSection = 'thumbnails' | 'toc' | 'annotations'

interface DocumentNavigatorProps {
  isOpen: boolean
  documentKey?: string | null
  totalPages: number
  outline: PDFOutlineItem[]
  highlights: HighlightData[]
  currentPage?: number
  onJumpToPage: (pageNumber: number) => void
  onClose: () => void
  getThumbnail?: (pageNumber: number, targetWidth?: number) => Promise<string | null>
}

const COLOR_FILTERS: Array<{ value: HighlightColor | 'all'; label: string; className: string }> = [
  { value: 'all', label: 'All', className: 'bg-gray-600/50' },
  { value: 'yellow', label: 'Yellow', className: 'bg-yellow-400/60' },
  { value: 'green', label: 'Green', className: 'bg-green-400/60' },
  { value: 'blue', label: 'Blue', className: 'bg-blue-400/60' },
  { value: 'pink', label: 'Pink', className: 'bg-pink-400/60' },
  { value: 'purple', label: 'Purple', className: 'bg-purple-400/60' },
]

function DocumentNavigator({
  isOpen,
  documentKey,
  totalPages,
  outline,
  highlights,
  currentPage,
  onJumpToPage,
  onClose,
  getThumbnail,
}: DocumentNavigatorProps) {
  const [section, setSection] = useState<NavigatorSection>('thumbnails')
  const [filterText, setFilterText] = useState('')
  const [notesOnly, setNotesOnly] = useState(false)
  const [colorFilter, setColorFilter] = useState<HighlightColor | 'all'>('all')
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({})
  const thumbnailsRef = useRef<Record<number, string>>({})

  useEffect(() => {
    thumbnailsRef.current = thumbnails
  }, [thumbnails])

  useEffect(() => {
    setThumbnails({})
    setFilterText('')
    setNotesOnly(false)
    setColorFilter('all')
  }, [documentKey])

  useEffect(() => {
    if (!isOpen || !getThumbnail || totalPages === 0) return
    let cancelled = false

    const loadThumbnails = async () => {
      for (let page = 1; page <= totalPages; page++) {
        if (cancelled) return
        if (thumbnailsRef.current[page]) continue
        const url = await getThumbnail(page, 140)
        if (cancelled) return
        if (url) {
          setThumbnails(prev => ({ ...prev, [page]: url }))
        }
      }
    }

    loadThumbnails()

    return () => {
      cancelled = true
    }
  }, [isOpen, totalPages, getThumbnail, documentKey])

  const filteredHighlights = useMemo(() => {
    const query = filterText.trim().toLowerCase()
    return highlights
      .filter(h => !notesOnly || !!h.note)
      .filter(h => colorFilter === 'all' || h.color === colorFilter)
      .filter(h => {
        if (!query) return true
        const text = h.selected_text.toLowerCase()
        const note = (h.note || '').toLowerCase()
        return text.includes(query) || note.includes(query)
      })
      .sort((a, b) => {
        if (a.page_number === b.page_number) {
          return a.start_offset - b.start_offset
        }
        return a.page_number - b.page_number
      })
  }, [highlights, filterText, notesOnly, colorFilter])

  if (!isOpen) return null

  return (
    <div className="absolute left-0 top-0 bottom-0 w-72 bg-gray-800 border-r border-gray-700/60 z-20 flex flex-col shadow-2xl">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <h3 className="font-medium text-gray-100">Navigator</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-700/50 text-xs">
        {(['thumbnails', 'toc', 'annotations'] as NavigatorSection[]).map((value) => (
          <button
            key={value}
            onClick={() => setSection(value)}
            className={`
              flex-1 px-2 py-1 rounded transition-colors
              ${section === value
                ? 'bg-blue-600/30 text-blue-300'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/40'}
            `}
          >
            {value === 'thumbnails' && 'Thumbnails'}
            {value === 'toc' && 'Contents'}
            {value === 'annotations' && 'Annotations'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {section === 'thumbnails' && (
          <div className="p-3 space-y-2">
            {totalPages === 0 ? (
              <div className="text-center text-sm text-gray-500 py-6">No pages yet</div>
            ) : (
              Array.from({ length: totalPages }, (_, idx) => {
                const pageNumber = idx + 1
                const thumb = thumbnails[pageNumber]
                const isActive = currentPage === pageNumber
                return (
                  <button
                    key={`thumb-${pageNumber}`}
                    onClick={() => onJumpToPage(pageNumber)}
                    className={`
                      group w-full flex items-center gap-3 p-2 rounded-lg border transition-colors
                      ${isActive ? 'border-blue-500/70 bg-blue-600/20' : 'border-gray-700/60 hover:bg-gray-700/30'}
                    `}
                  >
                    <div className="w-16 h-20 bg-gray-700/40 rounded border border-gray-600/40 flex items-center justify-center overflow-hidden">
                      {thumb ? (
                        <img src={thumb} alt={`Page ${pageNumber}`} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full animate-pulse bg-gray-700/50" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-gray-300">Page {pageNumber}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}

        {section === 'toc' && (
          <div className="p-3">
            {outline.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-6">No table of contents</div>
            ) : (
              <OutlineList items={outline} onJumpToPage={onJumpToPage} />
            )}
          </div>
        )}

        {section === 'annotations' && (
          <div className="p-3 space-y-3">
            <div className="space-y-2">
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter highlights & notes..."
                className="w-full px-3 py-2 rounded-lg bg-gray-700/50 border border-gray-600/50 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNotesOnly((prev) => !prev)}
                  className={`
                    px-2 py-1 rounded text-xs transition-colors
                    ${notesOnly ? 'bg-purple-600/30 text-purple-300' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/40'}
                  `}
                >
                  Notes only
                </button>
                <div className="flex items-center gap-1 ml-auto">
                  {COLOR_FILTERS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setColorFilter(color.value)}
                      className={`
                        w-5 h-5 rounded-full border transition-all ${color.className}
                        ${colorFilter === color.value ? 'border-white scale-110' : 'border-transparent hover:border-white/50'}
                      `}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            {filteredHighlights.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-6">No annotations match</div>
            ) : (
              <div className="space-y-2">
                {filteredHighlights.map((highlight) => (
                  <button
                    key={highlight.id}
                    onClick={() => onJumpToPage(highlight.page_number)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700/40 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1 ${getHighlightBgClass(highlight.color)}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Page {highlight.page_number}</span>
                          {highlight.note && (
                            <span className="text-purple-300">Note</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-200 line-clamp-2">
                          {highlight.selected_text}
                        </p>
                        {highlight.note && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {highlight.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface OutlineListProps {
  items: PDFOutlineItem[]
  depth?: number
  onJumpToPage: (pageNumber: number) => void
}

function OutlineList({ items, depth = 0, onJumpToPage }: OutlineListProps) {
  return (
    <div className="space-y-1">
      {items.map((item, index) => {
        const key = `${item.title}-${item.pageNumber ?? 'x'}-${depth}-${index}`
        const hasPage = typeof item.pageNumber === 'number'
        return (
          <div key={key}>
            <button
              onClick={() => item.pageNumber && onJumpToPage(item.pageNumber)}
              disabled={!hasPage}
              className={`
                w-full text-left px-2 py-1 rounded transition-colors
                ${hasPage ? 'hover:bg-gray-700/40 text-gray-200' : 'text-gray-500'}
              `}
              style={{ paddingLeft: `${8 + depth * 12}px` }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm line-clamp-1">{item.title}</span>
                {hasPage && (
                  <span className="text-xs text-gray-500">p. {item.pageNumber}</span>
                )}
              </div>
            </button>
            {item.items.length > 0 && (
              <OutlineList items={item.items} depth={depth + 1} onJumpToPage={onJumpToPage} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default DocumentNavigator
