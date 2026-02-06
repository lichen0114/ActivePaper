import { useState, useEffect, useRef } from 'react'
import type { DocumentAIContext } from '../types/ai-customization'

interface DocumentContextEditorProps {
  documentId: string | null
  documentContext: DocumentAIContext | null
  onSave: (docId: string, instructions: string, enabled?: number) => void
  onDelete: (docId: string) => void
}

export default function DocumentContextEditor({
  documentId,
  documentContext,
  onSave,
  onDelete,
}: DocumentContextEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [text, setText] = useState('')
  const [enabled, setEnabled] = useState(true)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (documentContext) {
      setText(documentContext.context_instructions)
      setEnabled(!!documentContext.enabled)
    } else {
      setText('')
      setEnabled(true)
    }
  }, [documentContext])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  if (!documentId) return null

  const hasContext = !!documentContext?.context_instructions

  const handleSave = () => {
    if (!documentId || !text.trim()) return
    onSave(documentId, text.trim(), enabled ? 1 : 0)
    setIsOpen(false)
  }

  const handleDelete = () => {
    if (!documentId) return
    onDelete(documentId)
    setText('')
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 rounded transition-colors ${
          hasContext && enabled
            ? 'bg-purple-600/30 text-purple-300'
            : 'hover:bg-gray-700/50 text-gray-400 hover:text-gray-200'
        }`}
        title="Document AI context"
        aria-label="Set AI context for this document"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-1 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-300">Document AI Context</h4>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                enabled ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g., This is a quantum mechanics textbook, chapter 7"
            className="w-full h-20 px-2 py-1.5 bg-gray-700/50 border border-gray-600 rounded text-xs text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500"
            autoFocus
          />

          <div className="flex items-center justify-between mt-2">
            {hasContext ? (
              <button
                onClick={handleDelete}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={handleSave}
              disabled={!text.trim()}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
