import type { ActionType } from '../hooks/useHistory'

interface SelectionToolbarProps {
  selectionRect: DOMRect | null
  onAction: (action: ActionType) => void
  isVisible: boolean
}

interface ToolbarButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
}

function ToolbarButton({ icon, label, onClick }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700/60 rounded-full transition-colors"
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default function SelectionPopover({ selectionRect, onAction, isVisible }: SelectionToolbarProps) {
  if (!isVisible || !selectionRect) return null

  // Position ABOVE selection
  const toolbarWidth = 280
  const toolbarHeight = 40
  const padding = 8
  const gap = 8

  let left = selectionRect.left + (selectionRect.width / 2) - (toolbarWidth / 2)
  let top = selectionRect.top - toolbarHeight - gap

  // Clamp to viewport bounds
  left = Math.max(padding, Math.min(left, window.innerWidth - toolbarWidth - padding))

  // Fallback to below if not enough space above
  if (top < padding) {
    top = selectionRect.bottom + gap
  }

  // Ensure it doesn't go off screen bottom
  top = Math.min(top, window.innerHeight - toolbarHeight - padding)

  return (
    <div
      className="selection-toolbar fixed z-50 flex items-center gap-1 px-2 py-1.5 bg-gray-800/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-700/50"
      style={{
        left: `${left}px`,
        top: `${top}px`,
      }}
    >
      <ToolbarButton
        icon={
          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        }
        label="Explain"
        onClick={() => onAction('explain')}
      />
      <ToolbarButton
        icon={
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        label="Summarize"
        onClick={() => onAction('summarize')}
      />
      <ToolbarButton
        icon={
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
        label="Define"
        onClick={() => onAction('define')}
      />
    </div>
  )
}
