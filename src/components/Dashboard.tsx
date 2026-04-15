import { useState } from 'react'
import type { ArtistData, Filters, PriorityCategory, Song } from '../types'
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  CATEGORY_BG,
  CATEGORY_DOT,
} from '../utils/scoring'
import {
  driveSignal,
  savesSignal,
  trendSignal,
  stickySignal,
  scoreLabel,
  type Signal,
} from '../utils/signals'

interface DashboardProps {
  artistData: ArtistData
  filters: Filters
  onFiltersChange: (f: Filters) => void
  onSelectSong: (id: string) => void
}

function fmt(n: number) {
  return n.toLocaleString('sv-SE')
}

function SignalChip({ signal }: { signal: Signal }) {
  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded border ${signal.bg} ${signal.color}`}
      title={signal.tip}
    >
      {signal.label}
    </span>
  )
}

function ScoreBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100))
  const color =
    value >= 6.5
      ? 'bg-emerald-500'
      : value >= 5
        ? 'bg-blue-500'
        : value >= 4
          ? 'bg-amber-500'
          : 'bg-red-500'
  const lbl = scoreLabel(value)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[11px] font-medium tabular-nums shrink-0 ${lbl.color}`}>
        {lbl.text} {value.toFixed(1)}
      </span>
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

  const drive = driveSignal(song.programmed_pct, song.active_pct, song.daily_budget_sek)
  const saves = savesSignal(song.saves_ratio)
  const trend = trendSignal(song.trend_pct)
  const sticky = stickySignal(song.streams_per_listener)

  const chips = [drive, saves, trend, sticky].filter(Boolean) as Signal[]

  // Streams bar width
  const streamsPct = Math.max(0, Math.min(100, (song.streams_28d / maxStreams) * 100))

  return (
    <button
      onClick={onSelect}
      className="w-full text-left card hover:bg-bg-hover active:bg-bg-border transition-colors duration-150 cursor-pointer group"
    >
      {/* Row: title + streams count */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm shrink-0">{CATEGORY_DOT[cat]}</span>
          <span className="font-semibold text-slate-100 truncate group-hover:text-white">
            {song.title}
          </span>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-slate-100 font-semibold tabular-nums text-sm">
            {fmt(song.streams_28d)}
          </div>
          <div className="text-[11px] text-slate-500">streams / 28d</div>
        </div>
      </div>

      {/* Score bar */}
      <ScoreBar value={song.score ?? 0} />

      {/* Streams bar */}
      <div className="mt-1.5 mb-2.5 h-1 bg-bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-violet-500/50"
          style={{ width: `${streamsPct}%` }}
        />
      </div>

      {/* Signal chips */}
      <div className="flex flex-wrap gap-1">
        {chips.slice(0, 3).map((chip) => (
          <SignalChip key={chip.label} signal={chip} />
        ))}
        {song.daily_budget_sek > 0 && song.daily_budget_sek < 100 && (
          <span className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded border bg-amber-500/8 border-amber-500/20 text-amber-500/70">
            {song.daily_budget_sek} kr/dag i annonser
          </span>
        )}
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
  const lbl = scoreLabel(avgScore)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <div className="card">
        <div className="text-xs text-slate-500 mb-1">Streams senaste 28d</div>
        <div className="text-xl font-bold tabular-nums text-violet-400">
          {fmt(totalStreams)}
        </div>
        <div className="text-[11px] text-slate-600 mt-0.5">antal gånger spelad</div>
      </div>
      <div className="card">
        <div className="text-xs text-slate-500 mb-1">Fans som sparade</div>
        <div className="text-xl font-bold tabular-nums text-emerald-400">
          {fmt(totalSaves)}
        </div>
        <div className="text-[11px] text-slate-600 mt-0.5">lade i sin playlist</div>
      </div>
      <div className="card">
        <div className="text-xs text-slate-500 mb-1">Genomsnittspoäng</div>
        <div className={`text-xl font-bold tabular-nums ${lbl.color}`}>
          {avgScore.toFixed(1)} / 10
        </div>
        <div className={`text-[11px] mt-0.5 ${lbl.color} opacity-70`}>{lbl.text} organisk potential</div>
      </div>
      <div className="card">
        <div className="text-xs text-slate-500 mb-1">Låtar analyserade</div>
        <div className="text-xl font-bold tabular-nums text-blue-400">{songs.length}</div>
        <div className="text-[11px] text-slate-600 mt-0.5">i katalogen</div>
      </div>
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

// Short explanations shown in the category overview
const CATEGORY_DESCRIPTIONS: Record<PriorityCategory, string> = {
  scale_up: 'Öka annonsbudget nu',
  test: 'Kör liten test-budget',
  anchor: 'Håller varumärket uppe',
  low: 'Avvakta eller pausa',
}

export default function Dashboard({
  artistData,
  filters,
  onFiltersChange,
  onSelectSong,
}: DashboardProps) {
  const [sortBy, setSortBy] = useState<'score' | 'streams' | 'saves_ratio' | 'trend'>(
    'score',
  )
  const [showGuide, setShowGuide] = useState(false)

  const { songs } = artistData

  const filtered = songs.filter((s) => {
    if (filters.category !== 'all' && s.priority_category !== filters.category)
      return false
    if (filters.era !== 'all' && s.era !== filters.era) return false
    if (filters.advertised === 'yes' && s.daily_budget_sek === 0) return false
    if (filters.advertised === 'no' && s.daily_budget_sek > 0) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'score') return (b.score ?? 0) - (a.score ?? 0)
    if (sortBy === 'streams') return b.streams_28d - a.streams_28d
    if (sortBy === 'saves_ratio') return (b.saves_ratio ?? 0) - (a.saves_ratio ?? 0)
    if (sortBy === 'trend') return (b.trend_pct ?? -999) - (a.trend_pct ?? -999)
    return 0
  })

  const maxStreams = Math.max(...songs.map((s) => s.streams_28d), 1)

  const catGroups: Record<PriorityCategory, number> = {
    scale_up: 0, test: 0, anchor: 0, low: 0,
  }
  songs.forEach((s) => {
    if (s.priority_category) catGroups[s.priority_category]++
  })

  return (
    <div>
      <SummaryCards songs={songs} />

      {/* Category overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
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
              className={`card text-left py-2.5 px-3 transition-all duration-150 border ${
                filters.category === cat
                  ? CATEGORY_BG[cat]
                  : 'border-bg-border hover:border-bg-hover'
              }`}
            >
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl font-bold ${CATEGORY_COLORS[cat]}`}>{count}</span>
                <span className="text-xs text-slate-400">{CATEGORY_LABELS[cat]}</span>
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">
                {CATEGORY_DESCRIPTIONS[cat]}
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
            onFiltersChange({ ...filters, category: e.target.value as Filters['category'] })
          }
          className="input text-sm py-1.5 flex-1 min-w-[120px]"
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={filters.advertised}
          onChange={(e) =>
            onFiltersChange({ ...filters, advertised: e.target.value as Filters['advertised'] })
          }
          className="input text-sm py-1.5 flex-1 min-w-[120px]"
        >
          <option value="all">Alla låtar</option>
          <option value="yes">Med annonsbudget</option>
          <option value="no">Utan annonsbudget</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="input text-sm py-1.5 flex-1 min-w-[120px]"
        >
          <option value="score">Sortera: Organisk poäng</option>
          <option value="streams">Sortera: Flest streams</option>
          <option value="saves_ratio">Sortera: Sparandegrad</option>
          <option value="trend">Sortera: Snabbast växande</option>
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
        <p className="text-center text-slate-600 text-xs mt-3">
          Klicka på en låt för djupare analys
        </p>
      )}

      {/* Signal guide toggle */}
      <div className="mt-5">
        <button
          onClick={() => setShowGuide((v) => !v)}
          className="w-full text-xs text-slate-600 hover:text-slate-400 py-2 flex items-center justify-center gap-1 transition-colors"
        >
          {showGuide ? '▲' : '▼'} Vad innebär märkena?
        </button>

        {showGuide && (
          <div className="card mt-2 space-y-2.5 text-sm">
            <div>
              <span className="font-semibold text-slate-300">🤖 Algoritm-driven</span>
              <p className="text-slate-500 text-xs mt-0.5">
                Mer än 55% av streams kommer från Spotifys automatiska rekommendationer
                (Discover Weekly, Radio, autoplay). Stark signal — algoritmen gillar låten.
              </p>
            </div>
            <div>
              <span className="font-semibold text-slate-300">👥 Fans-driven</span>
              <p className="text-slate-500 text-xs mt-0.5">
                Mer än 55% är aktiva val — folk söker upp låten eller spelar den från sin
                egen playlist. Bra för live, men begränsad organisk räckvidd.
              </p>
            </div>
            <div>
              <span className="font-semibold text-slate-300">💸 Annonsdriven</span>
              <p className="text-slate-500 text-xs mt-0.5">
                Hög daglig annonsbudget (≥100 kr/dag). Streams beror till stor del på
                betald trafik, vilket sänker poängen eftersom det inte är organisk tillväxt.
              </p>
            </div>
            <div>
              <span className="font-semibold text-slate-300">💚 Konverterar fans</span>
              <p className="text-slate-500 text-xs mt-0.5">
                Mer än 3% av lyssnarna sparar låten i sin playlist. Visar att folk
                verkligen gillar låten och väljer att behålla den.
              </p>
            </div>
            <div>
              <span className="font-semibold text-slate-300">💔 Lågt sparande</span>
              <p className="text-slate-500 text-xs mt-0.5">
                Under 1.5% sparar låten. Folk streamer men väljer inte att behålla den.
              </p>
            </div>
            <div>
              <span className="font-semibold text-slate-300">🔄 Lyssnar om</span>
              <p className="text-slate-500 text-xs mt-0.5">
                Mer än 2 streams per unik lyssnare — folk återkommer och lyssnar flera
                gånger. Stark signal på en "sticky" låt.
              </p>
            </div>
            <div>
              <span className="font-semibold text-slate-300">📈 / 📉 Trend</span>
              <p className="text-slate-500 text-xs mt-0.5">
                Procentuell förändring i streams under senaste 28 dagarna (jämför första
                halvan mot andra halvan).
              </p>
            </div>
            <div className="pt-1 border-t border-bg-border">
              <span className="font-semibold text-slate-300">Organisk poäng (0–10)</span>
              <p className="text-slate-500 text-xs mt-0.5">
                Sammansatt mått: algoritm-andel (35%) + sparandegrad (35%) + hur många gånger folk lyssnar om (30%), minus straff för annonsbudget.
                Högt = bra kandidat att skala upp utan att öka annonser.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
