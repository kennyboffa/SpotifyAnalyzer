import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { Song } from '../types'

const LINE_COLORS = [
  '#7c3aed',
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#a855f7',
  '#f97316',
  '#14b8a6',
  '#6366f1',
  '#d946ef',
  '#78716c',
]

interface TrendViewProps {
  songs: Song[]
}

export default function TrendView({ songs: allSongs }: TrendViewProps) {
  // Songs with timeline data
  const songsWithTimeline = allSongs.filter(
    (s) => s.timeline && s.timeline.length > 0,
  )

  // Songs with trend_pct (no timeline data)
  const songsWithTrend = allSongs.filter(
    (s) => s.trend_pct != null && (!s.timeline || s.timeline.length === 0),
  )

  // Build combined date-keyed dataset
  const chartData = useMemo(() => {
    if (songsWithTimeline.length === 0) return []

    // Collect all unique dates
    const allDates = new Set<string>()
    songsWithTimeline.forEach((s) =>
      s.timeline!.forEach((t) => allDates.add(t.date)),
    )

    const sortedDates = [...allDates].sort()

    return sortedDates.map((date) => {
      const row: Record<string, string | number> = { date }
      songsWithTimeline.forEach((s) => {
        const entry = s.timeline!.find((t) => t.date === date)
        if (entry) row[s.title] = entry.streams
      })
      return row
    })
  }, [songsWithTimeline])

  const [enabled, setEnabled] = useState<Set<string>>(
    () => new Set(songsWithTimeline.map((s) => s.title)),
  )

  const toggleSong = (title: string) => {
    setEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-100 mb-4">Trendöversikt</h2>

      {/* Trend table for all songs */}
      <div className="card mb-6">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">
          Trend senaste 28d (% förändring)
        </h3>
        <div className="space-y-2">
          {[...allSongs]
            .filter((s) => s.trend_pct != null)
            .sort((a, b) => (b.trend_pct ?? 0) - (a.trend_pct ?? 0))
            .map((song) => {
              const pct = song.trend_pct ?? 0
              const barW = Math.min(Math.abs(pct) / 50, 1) * 100
              const positive = pct >= 0
              return (
                <div key={song.id} className="flex items-center gap-3">
                  <span className="text-sm text-slate-300 w-40 truncate shrink-0">
                    {song.title}
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-bg-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${positive ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                    <span
                      className={`text-sm font-medium tabular-nums w-16 text-right ${positive ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      {pct > 0 ? '+' : ''}
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )
            })}
        </div>
        {allSongs.every((s) => s.trend_pct == null) && (
          <p className="text-slate-500 text-sm">
            Ingen trenddata — importera CSV-filer för att se trender
          </p>
        )}
      </div>

      {/* Trend summary for non-CSV songs */}
      {songsWithTrend.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">
            Manuell trenddata (inga tidsserier)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {songsWithTrend.map((song) => {
              const pct = song.trend_pct ?? 0
              return (
                <div
                  key={song.id}
                  className="bg-bg-surface rounded-lg p-3 border border-bg-border"
                >
                  <div className="text-xs text-slate-500 truncate mb-1">
                    {song.title}
                  </div>
                  <div
                    className={`text-lg font-bold tabular-nums ${pct > 0 ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {pct > 0 ? '+' : ''}
                    {pct.toFixed(1)}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Multi-song chart */}
      {songsWithTimeline.length > 0 ? (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 mb-4">
            Tidsserie (CSV-data)
          </h3>

          {/* Toggle buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {songsWithTimeline.map((song, i) => (
              <button
                key={song.id}
                onClick={() => toggleSong(song.title)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-150 ${
                  enabled.has(song.title)
                    ? 'border-transparent text-white'
                    : 'border-bg-border text-slate-500 bg-transparent'
                }`}
                style={
                  enabled.has(song.title)
                    ? { backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }
                    : {}
                }
              >
                {song.title}
              </button>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a42" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(v: string) => v.slice(5)}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1c1c2e',
                  border: '1px solid #2a2a42',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                iconType="line"
              />
              {songsWithTimeline.map((song, i) =>
                enabled.has(song.title) ? (
                  <Line
                    key={song.id}
                    type="monotone"
                    dataKey={song.title}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    activeDot={{ r: 3 }}
                  />
                ) : null,
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="card text-center py-8 text-slate-500">
          <div className="text-3xl mb-2">📈</div>
          <p>Importera CSV-filer under "Data" för att se tidsseriegrafer per låt</p>
        </div>
      )}
    </div>
  )
}
