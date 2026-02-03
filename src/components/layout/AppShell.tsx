import type { ReactNode } from 'react'

interface AppShellProps {
  toolbar: ReactNode
  sidebar: ReactNode
  main: ReactNode
  inspector: ReactNode
}

export default function AppShell({ toolbar, sidebar, main, inspector }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-titlebar app-toolbar">
        <div className="app-toolbar-content">
          {toolbar}
        </div>
      </header>
      <div className="app-grid">
        <aside className="app-sidebar">
          {sidebar}
        </aside>
        <main className="app-main">
          {main}
        </main>
        <aside className="app-inspector">
          {inspector}
        </aside>
      </div>
    </div>
  )
}
