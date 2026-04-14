import { useState } from 'react'
import type { ArtistData, Filters, PriorityCategory, Song } from '../types'
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  CATEGORY_BG,
  CATEGORY_DOT,
} from '../utils/scoring'

interface DashboardProps {
  artistData: ArtistData
  filters: Filters
  onFiltersChange: (f: Filters) => void
  onSelectSong: (id: string) => void
}

function fmt(n: number) {
  return n.toLocaleString('sv-SE')
}

function ScoreBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const color =
    value >= 6.5
      ? 'bg-emerald-500'
      : value >= 5
        ? 'bg-blue-500'
        : value >= 4
          ? 'bg-amber-500'
          : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right tabular-nums">
        {value.toFixed(1)}
      </span>
    </div>
  )
}

function MiniBar({
  value,
  max,
  color,
}: {
  value: number
  max: number
  color: string
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="h-1 bg-bg-border rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function SongRow({
  song,
  maxStreams,
  onSelect,
}: {
  song: Song
  maxStreams: number
  onSelect: () => void
}) {
  const cat = song.priority_category ?? 'low'

  return (
    <button
      onClick={onSelect}
      className="w-full text-left card hover:bg-bg-hover active:bg-bg-border transition-colors duration-150 cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        {/* Category dot + title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">{CATEGORY_DOT[cat]}</span>
            <span className="font-semibold text-slate-100 truncate group-hover:text-white">
              {song.title}
            </span>
            {song.daily_budget_sek > 0 && (
              <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                {song.daily_budget_sek} kr/d
              </span>
            )}
          </div>

          {/* Score bar */}
          <ScoreBar value={song.score ?? 0} />

          {/* Streams bar */}
          <div className="mt-2">
            <MiniBar
              value={song.streams_28d}
              max={maxStreams}
              color="bg-violet-500/60"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="shrink-0 text-right space-y-1">
          <div className="text-slate-100 font-semibold tabular-nums text-sm">
            {fmt(song.streams_28d)}
          </div>
          <div className="text-[11px] text-slate-500 tabular-nums">
            {song.saves_ratio?.toFixed(1)}% saves
          </div>
          {song.programmed_pct != null && (
            <div className="text-[11px] text-slate-500 tabular-nums">
              {song.programmed_pct}% prog
            </div>
          )}
          {song.trend_pct != null && (
            <div
              className={`text-[11px] tabular-nums font-medium ${song.trend_pct > 0 ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {song.trend_pct > 0 ? '+' : ''}
              {song.trend_pct.toFixed(1)}%
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

function SummaryCards({ songs }: { songs: Song[] }) {
  const totalStreams = songs.reduce((s, x) => s + x.streams_28d, 0)
  const totalSaves = songs.reduce((s, x) => s + x.saves, 0)
  const avgScore =
    songs.length > 0
      ? songs.reduce((s, x) => s + (x.score ?? 0), 0) / songs.length
      : 0

  const cards = [
    {
      label: 'Streams 28d',
      value: fmt(totalStreams),
      icon: '🎵',
      color: 'text-violet-400',
    },
    {
      label: 'Totalt sparade',
      value: fmt(totalSaves),
      icon: '💚',
      color: 'text-emerald-400',
    },
    {
      label: 'Snittpoäng',
      value: avgScore.toFixed(2),
      icon: '⭐',
      color: 'text-amber-400',
    },
    {
      label: 'Låtar analyserade',
      value: String(songs.length),
      icon: '📋',
      color: 'text-blue-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="card">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{c.icon}</span>
            <span className="text-xs text-slate-500 truncate">{c.label}</span>
          </div>
          <div className={`text-xl font-bold tabular-nums ${c.color}`}>{c.value}</div>
        </div>
      ))}
    </div>
  )
}

const CATEGORY_OPTIONS: { value: PriorityCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Alla' },
  { value: 'scale_up', label: '🟢 Skala upp' },
  { value: 'test', label: '🔵 Testa' },
  { value: 'anchor', label: '🟡 Anker' },
  { value: 'low', label: '🔴 Låg prio' },
]

export default function Dashboard({
  artistData,
  filters,
  onFiltersChange,
  onSelectSong,
}: DashboardProps) {
  const [sortBy, setSortBy] = useState<'score' | 'streams' | 'saves_ratio' | 'trend'>(
    'score',
  )

  const { songs } = artistData

  // Apply filters
  const filtered = songs.filter((s) => {
    if (filters.category !== 'all' && s.priority_category !== filters.category)
      return false
    if (filters.era !== 'all' && s.era !== filters.era) return false
    if (filters.advertised === 'yes' && s.daily_budget_sek === 0) return false
    if (filters.advertised === 'no' && s.daily_budget_sek > 0) return false
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'score') return (b.score ?? 0) - (a.score ?? 0)
    if (sortBy === 'streams') return b.streams_28d - a.streams_28d
    if (sortBy === 'saves_ratio') return (b.saves_ratio ?? 0) - (a.saves_ratio ?? 0)
    if (sortBy === 'trend') return (b.trend_pct ?? -999) - (a.trend_pct ?? -999)
    return 0
  })

  const maxStreams = Math.max(...songs.map((s) => s.streams_28d), 1)

  // Group by category for overview
  const catGroups: Record<PriorityCategory, number> = {
    scale_up: 0,
    test: 0,
    anchor: 0,
    low: 0,
  }
  songs.forEach((s) => {
    if (s.priority_category) catGroups[s.priority_category]++
  })

  return (
    <div>
      <SummaryCards songs={songs} />

      {/* Category overview */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {(Object.entries(catGroups) as [PriorityCategory, number][]).map(
          ([cat, count]) => (
            <button
              key={cat}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  category: filters.category === cat ? 'all' : cat,
                })
              }
              className={`card text-center py-2 transition-all duration-150 border ${
                filters.category === cat
                  ? CATEGORY_BG[cat]
                  : 'border-bg-border hover:border-bg-hover'
              }`}
            >
              <div className={`text-lg font-bold ${CATEGORY_COLORS[cat]}`}>
                {count}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate px-1">
                {CATEGORY_LABELS[cat].split(' ')[0]}
              </div>
            </button>
          ),
        )}
      </div>

      {/* Filters + sort */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={filters.category}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              category: e.target.value as Filters['category'],
            })
          }
          className="input text-sm py-1.5 flex-1 min-w-[120px]"
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={filters.advertised}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              advertised: e.target.value as Filters['advertised'],
            })
          }
          className="input text-sm py-1.5 flex-1 min-w-[120px]"
        >
          <option value="all">Alla låtar</option>
          <option value="yes">Annonserade</option>
          <option value="no">Ej annonserade</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value as typeof sortBy)
          }
          className="input text-sm py-1.5 flex-1 min-w-[120px]"
        >
          <option value="score">Sortera: Poäng</option>
          <option value="streams">Sortera: Streams</option>
          <option value="saves_ratio">Sortera: Saves %</option>
          <option value="trend">Sortera: Trend</option>
        </select>
      </div>

      {/* Song list */}
      <div className="space-y-2">
        {sorted.length === 0 ? (
          <div className="card text-center text-slate-500 py-8">
            Inga låtar matchar filtret
          </div>
        ) : (
          sorted.map((song) => (
            <SongRow
              key={song.id}
              song={song}
              maxStreams={maxStreams}
              onSelect={() => onSelectSong(song.id)}
            />
          ))
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-center text-slate-600 text-xs mt-4">
          {filtered.length} av {songs.length} låtar visas • Klicka på en låt för detaljer
        </p>
      )}
    </div>
  )
}
