import type { HistoryEntry } from '../hooks/useHistory'

interface HistoryPanelProps {
  isOpen: boolean
  history: HistoryEntry[]
  onSelect: (entry: HistoryEntry) => void
  onClose: () => void
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString()
}

function getActionLabel(action: string): string {
  switch (action) {
    case 'explain': return 'Explained'
    case 'summarize': return 'Summarized'
    case 'define': return 'Defined'
    default: return action
  }
}

export default function HistoryPanel({ isOpen, history, onSelect, onClose }: HistoryPanelProps) {
  return (
    <div className={`
      absolute inset-0 bg-gray-800/95 backdrop-blur-sm z-10
      flex flex-col
      transition-opacity duration-200
      ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
    `}>
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-gray-100">History</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">No history yet</p>
            <p className="text-xs text-gray-600 mt-1">Your queries will appear here</p>
          </div>
        ) : (
          <ul className="py-2">
            {history.map(entry => (
              <li key={entry.id}>
                <button
                  onClick={() => onSelect(entry)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-200 line-clamp-2 flex-1">
                      {entry.selectedText}
                    </p>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                  <span className="inline-block mt-1.5 px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">
                    {getActionLabel(entry.action)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
