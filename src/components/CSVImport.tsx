import { useState, useRef } from 'react'
import Papa from 'papaparse'
import type { ArtistData, Song, TimelineEntry } from '../types'

interface CSVImportProps {
  artistData: ArtistData
  onUpdateData: (data: ArtistData) => void
}

interface ParsedCSV {
  songTitle: string
  timeline: TimelineEntry[]
  streams_28d: number
  streams_90d?: number
  trend_pct: number
  avg_7day: number
  rowCount: number
}

function parseCSVFile(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    // Extract song title from filename
    const rawName = file.name.replace(/\.(csv|CSV)$/, '')
    const songTitle = rawName.replace(/-timeline$/i, '').replace(/_timeline$/i, '').trim()

    Papa.parse<{ date: string; streams: string }>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV-parsingsfel: ${results.errors[0].message}`))
          return
        }

        const rows = results.data
        if (rows.length === 0) {
          reject(new Error('CSV-filen är tom'))
          return
        }

        // Normalize columns (case-insensitive)
        const firstRow = rows[0]
        const keys = Object.keys(firstRow)
        const dateKey = keys.find((k) => k.toLowerCase().includes('date')) ?? keys[0]
        const streamsKey =
          keys.find((k) => k.toLowerCase().includes('stream')) ?? keys[1]

        const timeline: TimelineEntry[] = rows
          .map((row) => ({
            date: String(row[dateKey as keyof typeof row] ?? '').trim(),
            streams: Number(String(row[streamsKey as keyof typeof row] ?? '0').replace(/,/g, '')),
          }))
          .filter((e) => e.date && !isNaN(e.streams))
          .sort((a, b) => a.date.localeCompare(b.date))

        if (timeline.length === 0) {
          reject(new Error('Inga giltiga rader hittades i CSV-filen'))
          return
        }

        // Compute 28-day totals (last 28 entries)
        const last28 = timeline.slice(-28)
        const streams_28d = last28.reduce((s, e) => s + e.streams, 0)

        // 90-day total
        const last90 = timeline.slice(-90)
        const streams_90d =
          last90.length >= 28 ? last90.reduce((s, e) => s + e.streams, 0) : undefined

        // Trend: compare first half vs second half of 28d period
        const half = Math.floor(last28.length / 2)
        const firstHalf = last28
          .slice(0, half)
          .reduce((s, e) => s + e.streams, 0)
        const secondHalf = last28
          .slice(half)
          .reduce((s, e) => s + e.streams, 0)
        const trend_pct =
          firstHalf > 0
            ? Math.round(((secondHalf - firstHalf) / firstHalf) * 1000) / 10
            : 0

        // 7-day average
        const last7 = timeline.slice(-7)
        const avg_7day =
          last7.length > 0
            ? Math.round(last7.reduce((s, e) => s + e.streams, 0) / last7.length)
            : 0

        resolve({
          songTitle,
          timeline,
          streams_28d,
          streams_90d,
          trend_pct,
          avg_7day,
          rowCount: timeline.length,
        })
      },
      error: (err) => reject(err),
    })
  })
}

export default function CSVImport({ artistData, onUpdateData }: CSVImportProps) {
  const [results, setResults] = useState<
    { parsed: ParsedCSV; matched: Song | null; status: 'pending' | 'done' }[]
  >([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [applied, setApplied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setLoading(true)
    setErrors([])
    setResults([])
    setApplied(false)

    const newResults: typeof results = []
    const newErrors: string[] = []

    for (const file of Array.from(files)) {
      try {
        const parsed = await parseCSVFile(file)
        // Find matching song (case-insensitive)
        const matched =
          artistData.songs.find(
            (s) => s.title.toLowerCase() === parsed.songTitle.toLowerCase(),
          ) ?? null
        newResults.push({ parsed, matched, status: 'pending' })
      } catch (e) {
        newErrors.push(
          `${file.name}: ${e instanceof Error ? e.message : 'Okänt fel'}`,
        )
      }
    }

    setResults(newResults)
    setErrors(newErrors)
    setLoading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const applyAll = () => {
    let songs = [...artistData.songs]

    for (const { parsed, matched } of results) {
      if (matched) {
        // Update existing song
        songs = songs.map((s) =>
          s.id === matched.id
            ? {
                ...s,
                timeline: parsed.timeline,
                streams_28d: parsed.streams_28d,
                streams_90d: parsed.streams_90d,
                trend_pct: parsed.trend_pct,
                avg_7day: parsed.avg_7day,
              }
            : s,
        )
      } else {
        // Create new minimal song
        songs.push({
          id: crypto.randomUUID(),
          title: parsed.songTitle,
          streams_28d: parsed.streams_28d,
          streams_90d: parsed.streams_90d,
          listeners: Math.round(parsed.streams_28d / 1.5), // estimate
          saves: Math.round(parsed.streams_28d * 0.02), // estimate
          daily_budget_sek: 0,
          timeline: parsed.timeline,
          trend_pct: parsed.trend_pct,
          avg_7day: parsed.avg_7day,
        })
      }
    }

    onUpdateData({ ...artistData, songs })
    setResults((prev) => prev.map((r) => ({ ...r, status: 'done' })))
    setApplied(true)
  }

  return (
    <div>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="card border-2 border-dashed border-bg-border hover:border-violet-500/50 transition-colors cursor-pointer text-center py-10 mb-5"
      >
        <div className="text-3xl mb-2">📄</div>
        <p className="text-slate-300 font-medium">Dra och släpp CSV-filer hit</p>
        <p className="text-slate-500 text-sm mt-1">
          eller klicka för att välja filer
        </p>
        <p className="text-slate-600 text-xs mt-3">
          Filnamn används som låtnamn (ex. Roots-timeline.csv → "Roots")
        </p>
        <p className="text-slate-600 text-xs">Kolumner: date, streams</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          Parserar CSV-filer...
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
          <h4 className="text-red-400 font-medium mb-2">Parsningsfel</h4>
          {errors.map((e, i) => (
            <p key={i} className="text-red-300/80 text-sm">
              {e}
            </p>
          ))}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="card mb-4">
          <h3 className="font-semibold text-slate-200 mb-3">
            Parsade filer ({results.length})
          </h3>
          <div className="space-y-3">
            {results.map(({ parsed, matched, status }, i) => (
              <div
                key={i}
                className={`rounded-lg p-3 border ${
                  status === 'done'
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : matched
                      ? 'border-blue-500/30 bg-blue-500/10'
                      : 'border-amber-500/30 bg-amber-500/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-medium text-slate-200">{parsed.songTitle}</span>
                    {status === 'done' ? (
                      <span className="text-xs text-emerald-400 ml-2">✓ Tillämpat</span>
                    ) : matched ? (
                      <span className="text-xs text-blue-400 ml-2">
                        → Uppdaterar "{matched.title}"
                      </span>
                    ) : (
                      <span className="text-xs text-amber-400 ml-2">
                        → Ny låt skapas
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                  <span>📅 {parsed.rowCount} dagar</span>
                  <span>
                    🎵 {parsed.streams_28d.toLocaleString('sv-SE')} streams (28d)
                  </span>
                  <span
                    className={
                      parsed.trend_pct >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }
                  >
                    {parsed.trend_pct >= 0 ? '↗' : '↘'} {parsed.trend_pct > 0 ? '+' : ''}
                    {parsed.trend_pct}% trend
                  </span>
                  <span>⌀ {parsed.avg_7day}/dag (7d)</span>
                </div>
              </div>
            ))}
          </div>

          {!applied && (
            <button onClick={applyAll} className="btn-primary w-full mt-4">
              Tillämpa alla ({results.length} filer)
            </button>
          )}

          {applied && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mt-4 text-emerald-400 text-sm text-center">
              ✓ Alla CSV-filer tillämpade!
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="card bg-bg-surface">
        <h4 className="text-sm font-semibold text-slate-400 mb-2">💡 Tips</h4>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>• Exportera CSV från Spotify for Artists → Songs → välj låt → Download</li>
          <li>• Filnamnet används som låtnamn, ta bort "-timeline" suffixet</li>
          <li>• CSV ska ha kolumner "date" och "streams"</li>
          <li>• Trend beräknas automatiskt (första 14 vs sista 14 dagarna)</li>
        </ul>
      </div>
    </div>
  )
}
