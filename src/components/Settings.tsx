import { useState } from 'react'
import type { ArtistData } from '../types'
import { exportData, importData } from '../utils/storage'
import { DEFAULT_SONGS } from '../utils/defaultData'

interface SettingsProps {
  apiKey: string
  onApiKeyChange: (key: string) => void
  artistData: ArtistData
  onUpdateData: (data: ArtistData) => void
}

export default function Settings({
  apiKey,
  onApiKeyChange,
  artistData,
  onUpdateData,
}: SettingsProps) {
  const [showKey, setShowKey] = useState(false)
  const [localKey, setLocalKey] = useState(apiKey)
  const [keySaved, setKeySaved] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const saveKey = () => {
    onApiKeyChange(localKey.trim())
    setKeySaved(true)
    setTimeout(() => setKeySaved(false), 2000)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')
    setImportSuccess(false)
    try {
      const data = await importData(file)
      onUpdateData(data)
      setImportSuccess(true)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Kunde inte importera filen')
    }
    // Reset input
    e.target.value = ''
  }

  const handleReset = () => {
    onUpdateData({
      songs: DEFAULT_SONGS,
      demographics: undefined,
      locations: undefined,
      last_updated: new Date().toISOString(),
    })
    setConfirmReset(false)
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-100 mb-4">Inställningar</h2>

      {/* API Key */}
      <div className="card mb-4">
        <h3 className="font-semibold text-slate-200 mb-1">Anthropic API-nyckel</h3>
        <p className="text-xs text-slate-500 mb-3">
          Krävs för skärmdumpsanalys och AI-rekommendationer. Nyckeln sparas lokalt i
          webbläsaren.
        </p>

        <div className="flex gap-2 mb-2">
          <div className="flex-1 relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              placeholder="sk-ant-..."
              className="input w-full pr-20"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
            >
              {showKey ? 'Dölj' : 'Visa'}
            </button>
          </div>
          <button onClick={saveKey} className="btn-primary shrink-0">
            {keySaved ? '✓ Sparad' : 'Spara'}
          </button>
        </div>

        {apiKey && (
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <span>✓</span>
            <span>API-nyckel konfigurerad</span>
          </div>
        )}

        <div className="mt-3 p-3 bg-bg-surface rounded-lg">
          <p className="text-xs text-slate-500">
            Hämta din nyckel på{' '}
            <span className="text-violet-400">console.anthropic.com</span>. API-anrop
            görs direkt från webbläsaren — nyckeln lämnar aldrig din enhet.
          </p>
        </div>
      </div>

      {/* Data management */}
      <div className="card mb-4">
        <h3 className="font-semibold text-slate-200 mb-3">Data</h3>

        <div className="flex items-center justify-between py-3 border-b border-bg-border">
          <div>
            <div className="text-sm text-slate-300">Exportera som JSON</div>
            <div className="text-xs text-slate-500">
              Spara all data för backup eller delning
            </div>
          </div>
          <button
            onClick={() => exportData(artistData)}
            className="btn-secondary text-sm shrink-0"
          >
            Exportera
          </button>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-bg-border">
          <div>
            <div className="text-sm text-slate-300">Importera JSON</div>
            <div className="text-xs text-slate-500">
              Återställ från en tidigare export
            </div>
          </div>
          <label className="btn-secondary text-sm shrink-0 cursor-pointer">
            Importera
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </label>
        </div>

        {importError && (
          <div className="mt-2 text-red-400 text-sm">{importError}</div>
        )}
        {importSuccess && (
          <div className="mt-2 text-emerald-400 text-sm">
            ✓ Data importerad!
          </div>
        )}

        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm text-slate-300">Återställ till demo-data</div>
            <div className="text-xs text-slate-500">
              Laddar in WATC:s standarddata (kan inte ångras)
            </div>
          </div>
          <button
            onClick={() => setConfirmReset(true)}
            className="text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg px-3 py-1.5 transition-colors shrink-0"
          >
            Återställ
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="card mb-4">
        <h3 className="font-semibold text-slate-200 mb-3">Statistik</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>Antal låtar</span>
            <span className="text-slate-200">{artistData.songs.length}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Demografidata</span>
            <span className={artistData.demographics ? 'text-emerald-400' : 'text-slate-600'}>
              {artistData.demographics ? '✓ Tillgänglig' : '✗ Saknas'}
            </span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Platsdata</span>
            <span className={artistData.locations ? 'text-emerald-400' : 'text-slate-600'}>
              {artistData.locations
                ? `✓ ${artistData.locations.length} länder`
                : '✗ Saknas'}
            </span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Senast uppdaterad</span>
            <span className="text-slate-400 text-xs">
              {artistData.last_updated
                ? new Date(artistData.last_updated).toLocaleDateString('sv-SE')
                : '–'}
            </span>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card bg-bg-surface">
        <h3 className="font-semibold text-slate-400 mb-2">Om appen</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          WATC Analytics är ett privat verktyg för We Are The Catalyst för att analysera
          Spotify for Artists-statistik. All data sparas lokalt i webbläsaren (localStorage).
          Inga data skickas till externa servrar förutom Anthropic API för AI-analys.
        </p>
        <p className="text-xs text-slate-700 mt-2">
          Modell: claude-sonnet-4-20250514
        </p>
      </div>

      {/* Reset confirm modal */}
      {confirmReset && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card border border-bg-border rounded-xl p-5 max-w-sm w-full">
            <h2 className="font-bold text-lg text-slate-100 mb-2">
              Återställ till demo-data?
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              All befintlig data (låtar, demografi, platsdata) ersätts med WATC:s
              standarddata. Kan inte ångras.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg px-4 py-2 transition-colors"
              >
                Återställ
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 btn-secondary"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
