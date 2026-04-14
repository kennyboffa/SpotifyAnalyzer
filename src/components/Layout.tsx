import type { ReactNode } from 'react'
import type { ViewTab } from '../types'

interface NavItem {
  id: ViewTab
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'trends', label: 'Trend', icon: '📈' },
  { id: 'demographics', label: 'Demo', icon: '👥' },
  { id: 'live', label: 'Live', icon: '🎸' },
  { id: 'input', label: 'Data', icon: '➕' },
  { id: 'settings', label: 'Inst.', icon: '⚙️' },
]

interface LayoutProps {
  currentView: ViewTab
  onViewChange: (view: ViewTab) => void
  children: ReactNode
}

export default function Layout({ currentView, onViewChange, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {/* Header */}
      <header className="bg-bg-surface border-b border-bg-border sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-violet-400 tracking-wide">WATC</span>
            <span className="text-slate-500 text-sm hidden sm:block">Analytics</span>
          </div>
          {/* Desktop tabs */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  currentView === item.id
                    ? 'bg-violet-600/20 text-violet-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-bg-hover'
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 pb-24 sm:pb-6">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-bg-surface border-t border-bg-border z-50">
        <div className="flex items-center justify-around px-2 py-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg min-w-0 flex-1 transition-colors duration-150 ${
                currentView === item.id
                  ? 'text-violet-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] font-medium truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
