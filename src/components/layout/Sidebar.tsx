import SegmentedControl from '../ui/SegmentedControl'

type AppView = 'dashboard' | 'reader'

interface SidebarProps {
  currentView: AppView
  onViewChange: (view: AppView) => void
  onOpenDocument: () => void
  openTabsCount: number
}

const VIEW_OPTIONS = [
  { value: 'dashboard' as const, label: 'Dashboard' },
  { value: 'reader' as const, label: 'Reader' },
]

export default function Sidebar({
  currentView,
  onViewChange,
  onOpenDocument,
  openTabsCount,
}: SidebarProps) {
  return (
    <>
      <div className="sidebar-section">
        <div className="sidebar-title">Synapse Reader</div>
        <div className="text-tertiary text-xs">
          {openTabsCount} open {openTabsCount === 1 ? 'tab' : 'tabs'}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">View</div>
        <SegmentedControl
          options={VIEW_OPTIONS}
          value={currentView}
          onChange={onViewChange}
        />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Library</div>
        <button className="sidebar-action" onClick={onOpenDocument}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Open PDF
        </button>
      </div>
    </>
  )
}
