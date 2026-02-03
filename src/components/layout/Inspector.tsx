import SegmentedControl from '../ui/SegmentedControl'

export type InspectorTab = 'copilot' | 'concepts' | 'bookmarks'

interface InspectorProps {
  activeTab: InspectorTab
  onTabChange: (tab: InspectorTab) => void
  copilot: React.ReactNode
  concepts: React.ReactNode
  bookmarks: React.ReactNode
}

const INSPECTOR_OPTIONS = [
  { value: 'copilot' as const, label: 'Copilot' },
  { value: 'concepts' as const, label: 'Concepts' },
  { value: 'bookmarks' as const, label: 'Bookmarks' },
]

export default function Inspector({
  activeTab,
  onTabChange,
  copilot,
  concepts,
  bookmarks,
}: InspectorProps) {
  return (
    <>
      <div className="inspector-tabs">
        <span className="inspector-title">Inspector</span>
        <SegmentedControl
          options={INSPECTOR_OPTIONS}
          value={activeTab}
          onChange={onTabChange}
        />
      </div>
      <div className="app-inspector-content">
        {activeTab === 'copilot' && copilot}
        {activeTab === 'concepts' && concepts}
        {activeTab === 'bookmarks' && bookmarks}
      </div>
    </>
  )
}
