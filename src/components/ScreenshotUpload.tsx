import { useState, useRef } from 'react'
import type { ArtistData, ScreenshotData } from '../types'
import { analyzeScreenshot } from '../utils/anthropicApi'

interface ScreenshotUploadProps {
  artistData: ArtistData
  onUpdateData: (data: ArtistData) => void
  apiKey: string
}

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      // Remove data URL prefix to get pure base64
      const base64 = result.split(',')[1]
      resolve({ base64, mimeType: file.type || 'image/png' })
    }
    reader.onerror = () => reject(new Error('Kunde inte läsa bilden'))
    reader.readAsDataURL(file)
  })
}

function applyScreenshotData(
  data: ScreenshotData,
  artistData: ArtistData,
): ArtistData {
  if (data.type === 'demographics') {
    return {
      ...artistData,
      demographics: {
        gender: data.gender,
        age_groups: data.age_groups as ArtistData['demographics'] extends undefined
          ? never
          : NonNullable<ArtistData['demographics']>['age_groups'],
      },
    }
  }

  if (data.type === 'location') {
    return {
      ...artistData,
      locations: data.countries,
    }
  }

  if (data.type === 'songs') {
    const updatedSongs = [...artistData.songs]
    for (const screenshotSong of data.songs) {
      const existingIdx = updatedSongs.findIndex(
        (s) => s.title.toLowerCase() === screenshotSong.title.toLowerCase(),
      )
      if (existingIdx >= 0) {
        updatedSongs[existingIdx] = {
          ...updatedSongs[existingIdx],
          streams_28d: screenshotSong.streams || updatedSongs[existingIdx].streams_28d,
          listeners: screenshotSong.listeners || updatedSongs[existingIdx].listeners,
          saves: screenshotSong.saves || updatedSongs[existingIdx].saves,
        }
      } else {
        updatedSongs.push({
          id: crypto.randomUUID(),
          title: screenshotSong.title,
          streams_28d: screenshotSong.streams || 0,
          listeners: screenshotSong.listeners || 0,
          saves: screenshotSong.saves || 0,
          daily_budget_sek: 0,
          release_date: screenshotSong.first_released,
        })
      }
    }
    return { ...artistData, songs: updatedSongs }
  }

  if (data.type === 'song_sources') {
    const updatedSongs = artistData.songs.map((s) => {
      if (s.title.toLowerCase() === data.song_title.toLowerCase()) {
        return {
          ...s,
          programmed_pct: data.programmed_pct,
          active_pct: data.active_pct,
        }
      }
      return s
    })
    return { ...artistData, songs: updatedSongs }
  }

  return artistData
}

type AnalysisResult = {
  data: ScreenshotData
  preview: string
  applied: boolean
}

export default function ScreenshotUpload({
  artistData,
  onUpdateData,
  apiKey,
}: ScreenshotUploadProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<AnalysisResult[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (!apiKey) {
      setError('Du behöver ange din Anthropic API-nyckel under Inställningar.')
      return
    }

    setLoading(true)
    setError('')
    setResults([])
    setPreviewUrls([])

    const urls: string[] = []
    const newResults: AnalysisResult[] = []

    for (const file of Array.from(files)) {
      try {
        const url = URL.createObjectURL(file)
        urls.push(url)

        const { base64, mimeType } = await fileToBase64(file)
        const data = await analyzeScreenshot(base64, mimeType, apiKey)

        let preview = ''
        if (data.type === 'songs') {
          preview = `${data.songs.length} låtar hittades`
        } else if (data.type === 'demographics') {
          preview = `Demografidata: ${data.gender.male}% man, ${data.gender.female}% kvinna`
        } else if (data.type === 'location') {
          preview = `${data.countries.length} länder hittades`
        } else if (data.type === 'song_sources') {
          preview = `${data.song_title}: ${data.programmed_pct}% prog, ${data.active_pct}% aktiv`
        }

        newResults.push({ data, preview, applied: false })
      } catch (e) {
        setError(
          `Fel vid analys av ${file.name}: ${e instanceof Error ? e.message : 'Okänt fel'}`,
        )
      }
    }

    setPreviewUrls(urls)
    setResults(newResults)
    setLoading(false)
  }

  const applyResult = (idx: number) => {
    const result = results[idx]
    if (!result) return
    const updated = applyScreenshotData(result.data, artistData)
    onUpdateData(updated)
    setResults((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, applied: true } : r)),
    )
  }

  const applyAll = () => {
    let current = artistData
    for (const result of results) {
      current = applyScreenshotData(result.data, current)
    }
    onUpdateData(current)
    setResults((prev) => prev.map((r) => ({ ...r, applied: true })))
  }

  return (
    <div>
      {!apiKey && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-5">
          <p className="text-amber-400 text-sm">
            ⚠ Ange din Anthropic API-nyckel under{' '}
            <strong>Inställningar</strong> för att använda skärmdumpsanalys.
          </p>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={(e) => {
          e.preventDefault()
          handleFiles(e.dataTransfer.files)
        }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className={`card border-2 border-dashed transition-colors cursor-pointer text-center py-10 mb-5 ${
          apiKey
            ? 'border-bg-border hover:border-violet-500/50'
            : 'border-bg-border opacity-50 cursor-not-allowed'
        }`}
      >
        <div className="text-3xl mb-2">📸</div>
        <p className="text-slate-300 font-medium">Dra och släpp skärmdumpar hit</p>
        <p className="text-slate-500 text-sm mt-1">
          eller klicka för att välja bilder
        </p>
        <p className="text-slate-600 text-xs mt-3">
          Stöder: Songs-vy, Audience-vy, Location-vy, Song Sources-vy
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={!apiKey}
        />
      </div>

      {loading && (
        <div className="card mb-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin shrink-0" />
            <div>
              <p className="text-slate-200 text-sm font-medium">
                Analyserar skärmdumpar...
              </p>
              <p className="text-slate-500 text-xs">
                Claude analyserar bilderna och extraherar data
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Preview images + results */}
      {results.length > 0 && (
        <div className="space-y-4 mb-4">
          {results.map((result, i) => (
            <div key={i} className="card">
              <div className="flex gap-3">
                {previewUrls[i] && (
                  <img
                    src={previewUrls[i]}
                    alt={`Screenshot ${i + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-bg-border shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        result.data.type === 'songs'
                          ? 'bg-violet-500/15 border-violet-500/30 text-violet-400'
                          : result.data.type === 'demographics'
                            ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                            : result.data.type === 'location'
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                              : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      }`}
                    >
                      {result.data.type}
                    </span>
                    {result.applied && (
                      <span className="text-xs text-emerald-400">✓ Tillämpat</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300">{result.preview}</p>

                  {/* Extracted data preview */}
                  {result.data.type === 'songs' && (
                    <div className="mt-2 space-y-1">
                      {result.data.songs.slice(0, 3).map((s, j) => (
                        <div key={j} className="text-xs text-slate-500">
                          {s.title}: {s.streams?.toLocaleString('sv-SE')} streams
                        </div>
                      ))}
                      {result.data.songs.length > 3 && (
                        <div className="text-xs text-slate-600">
                          +{result.data.songs.length - 3} fler...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {!result.applied && (
                <button
                  onClick={() => applyResult(i)}
                  className="btn-primary w-full mt-3 text-sm py-1.5"
                >
                  Tillämpa denna data
                </button>
              )}
            </div>
          ))}

          {results.some((r) => !r.applied) && (
            <button onClick={applyAll} className="btn-primary w-full">
              Tillämpa alla ({results.filter((r) => !r.applied).length} kvar)
            </button>
          )}
        </div>
      )}

      {/* Info box */}
      <div className="card bg-bg-surface">
        <h4 className="text-sm font-semibold text-slate-400 mb-2">
          📸 Vad kan analyseras?
        </h4>
        <ul className="text-xs text-slate-500 space-y-1.5">
          <li>
            <strong className="text-slate-400">Songs-vy</strong> — streams, lyssnare,
            saves per låt
          </li>
          <li>
            <strong className="text-slate-400">Audience-vy</strong> — ålder och
            könsfördelning
          </li>
          <li>
            <strong className="text-slate-400">Location-vy</strong> — länder och
            lyssnare
          </li>
          <li>
            <strong className="text-slate-400">Song Sources-vy</strong> — programmerad
            % och aktiv % per låt
          </li>
        </ul>
      </div>
    </div>
  )
}
