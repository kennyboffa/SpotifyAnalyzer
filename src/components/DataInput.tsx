import { useState } from 'react'
import type { ArtistData } from '../types'
import CSVImport from './CSVImport'
import ScreenshotUpload from './ScreenshotUpload'
import ManualEntry from './ManualEntry'

type InputTab = 'csv' | 'screenshot' | 'manual'

interface DataInputProps {
  artistData: ArtistData
  onUpdateData: (data: ArtistData) => void
  apiKey: string
}

export default function DataInput({ artistData, onUpdateData, apiKey }: DataInputProps) {
  const [activeTab, setActiveTab] = useState<InputTab>('manual')

  const tabs: { id: InputTab; label: string; icon: string }[] = [
    { id: 'manual', label: 'Manuell', icon: '✏️' },
    { id: 'csv', label: 'CSV-import', icon: '📄' },
    { id: 'screenshot', label: 'Skärmdump', icon: '📸' },
  ]

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-100 mb-4">Lägg till data</h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-surface rounded-xl p-1 mb-5 border border-bg-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
              activeTab === tab.id
                ? 'bg-bg-card text-slate-100 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'manual' && (
        <ManualEntry artistData={artistData} onUpdateData={onUpdateData} />
      )}
      {activeTab === 'csv' && (
        <CSVImport artistData={artistData} onUpdateData={onUpdateData} />
      )}
      {activeTab === 'screenshot' && (
        <ScreenshotUpload
          artistData={artistData}
          onUpdateData={onUpdateData}
          apiKey={apiKey}
        />
      )}
    </div>
  )
}
