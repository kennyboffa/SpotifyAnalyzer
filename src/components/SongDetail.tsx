import { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import type { Song } from '../types'
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  CATEGORY_BG,
  CATEGORY_DOT,
} from '../utils/scoring'
import { analyzeSong } from '../utils/anthropicApi'

interface SongDetailProps {
  song: Song
  allSongs: Song[]
  apiKey: string
  onBack: () => void
  onUpdateSong: (song: Song) => void
  onDeleteSong: (id: string) => void
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div className="card">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${color ?? 'text-slate-100'}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

function CatalogComparison({
  song,
  allSongs,
}: {
  song: Song
  allSongs: Song[]
}) {
  const avg = {
    saves_ratio:
      allSongs.reduce((s, x) => s + (x.saves_ratio ?? 0), 0) / allSongs.length,
    streams_per_listener:
      allSongs.reduce((s, x) => s + (x.streams_per_listener ?? 0), 0) / allSongs.length,
    score: allSongs.reduce((s, x) => s + (x.score ?? 0), 0) / allSongs.length,
  }

  const metrics = [
    {
      label: 'Saves-ratio',
      value: song.saves_ratio ?? 0,
      avg: avg.saves_ratio,
      fmt: (v: number) => `${v.toFixed(2)}%`,
      threshold: 3,
    },
    {
      label: 'Streams / lyssnare',
      value: song.streams_per_listener ?? 0,
      avg: avg.streams_per_listener,
      fmt: (v: number) => v.toFixed(2),
      threshold: 2,
    },
    {
      label: 'Score',
      value: song.score ?? 0,
      avg: avg.score,
      fmt: (v: number) => v.toFixed(2),
      threshold: 5,
    },
  ]

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">
        Jämförelse mot katalogsnitt
      </h3>
      <div className="space-y-3">
        {metrics.map((m) => {
          const betterThanAvg = m.value > m.avg
          const aboveThreshold = m.value >= m.threshold
          return (
            <div key={m.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">{m.label}</span>
                <span className="tabular-nums">
                  <span
                    className={betterThanAvg ? 'text-emerald-400' : 'text-red-400'}
                  >
                    {m.fmt(m.value)}
                  </span>
                  <span className="text-slate-600 mx-1">vs</span>
                  <span className="text-slate-500">{m.fmt(m.avg)}</span>
                </span>
              </div>
              <div className="h-1.5 bg-bg-border rounded-full overflow-hidden relative">
                {/* avg line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-600 z-10"
                  style={{ left: `${Math.min((m.avg / (m.threshold * 2)) * 100, 100)}%` }}
                />
                <div
                  className={`h-full rounded-full ${aboveThreshold ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{
                    width: `${Math.min((m.value / (m.threshold * 2)) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EditSongModal({
  song,
  onSave,
  onClose,
}: {
  song: Song
  onSave: (s: Song) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({ ...song })

  const set = (key: keyof Song, value: string | number | null) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-bg-card border border-bg-border rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-slate-100">Redigera låt</h2>
          <button onClick={onClose} className="btn-ghost text-lg">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {(
            [
              { key: 'title', label: 'Titel', type: 'text' },
              { key: 'streams_28d', label: 'Streams (28d)', type: 'number' },
              { key: 'listeners', label: 'Lyssnare', type: 'number' },
              { key: 'saves', label: 'Saves', type: 'number' },
              { key: 'programmed_pct', label: 'Programmerad %', type: 'number' },
              { key: 'active_pct', label: 'Aktiv %', type: 'number' },
              { key: 'daily_budget_sek', label: 'Daglig budget (kr)', type: 'number' },
              { key: 'trend_pct', label: 'Trend %', type: 'number' },
            ] as { key: keyof Song; label: string; type: string }[]
          ).map(({ key, label, type }) => (
            <div key={key}>
              <label className="text-xs text-slate-400 mb-1 block">{label}</label>
              <input
                type={type}
                value={
                  form[key] != null && form[key] !== undefined
                    ? String(form[key])
                    : ''
                }
                onChange={(e) => {
                  const v = e.target.value
                  if (type === 'number') {
                    set(key, v === '' ? null : Number(v))
                  } else {
                    set(key, v)
                  }
                }}
                className="input w-full"
              />
            </div>
          ))}

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Karaktär</label>
            <select
              value={form.character ?? ''}
              onChange={(e) =>
                set(
                  'character',
                  e.target.value as Song['character'] || undefined as unknown as null,
                )
              }
              className="input w-full"
            >
              <option value="">Välj...</option>
              <option value="energetic">Energisk</option>
              <option value="ballad">Ballad</option>
              <option value="building">Byggande</option>
              <option value="mixed">Blandad</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={() => onSave(form)} className="btn-primary flex-1">
            Spara
          </button>
          <button onClick={onClose} className="btn-secondary flex-1">
            Avbryt
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SongDetail({
  song,
  allSongs,
  apiKey,
  onBack,
  onUpdateSong,
  onDeleteSong,
}: SongDetailProps) {
  const [aiAnalysis, setAiAnalysis] = useState<string>('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string>('')
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const cat = song.priority_category ?? 'low'

  const handleAnalyze = async () => {
    if (!apiKey) {
      setAiError('Ange din Anthropic API-nyckel under Inställningar.')
      return
    }
    setAiLoading(true)
    setAiError('')
    try {
      const result = await analyzeSong(song, allSongs, apiKey)
      setAiAnalysis(result)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Okänt fel')
    } finally {
      setAiLoading(false)
    }
  }

  // Source donut data
  const progPct = song.programmed_pct ?? 0
  const activePct = song.active_pct ?? 0
  const otherPct = Math.max(0, 100 - progPct - activePct)
  const sourceData = [
    { name: 'Programmerad', value: progPct, color: '#7c3aed' },
    { name: 'Aktiv', value: activePct, color: '#10b981' },
    ...(otherPct > 0
      ? [{ name: 'Övrigt', value: otherPct, color: '#334155' }]
      : []),
  ]

  return (
    <div>
      {/* Back button */}
      <button onClick={onBack} className="btn-ghost mb-4 flex items-center gap-2">
        ← Tillbaka
      </button>

      {/* Title + category */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{song.title}</h1>
          <div
            className={`inline-flex items-center gap-1.5 mt-1.5 text-sm font-medium px-2.5 py-1 rounded-full border ${CATEGORY_BG[cat]}`}
          >
            <span>{CATEGORY_DOT[cat]}</span>
            <span className={CATEGORY_COLORS[cat]}>{CATEGORY_LABELS[cat]}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setEditing(true)} className="btn-secondary text-sm py-1.5">
            Redigera
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg px-3 py-1.5 text-sm transition-colors"
          >
            Ta bort
          </button>
        </div>
      </div>

      {/* Core stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="Streams 28d"
          value={song.streams_28d.toLocaleString('sv-SE')}
          color="text-violet-400"
        />
        <StatCard
          label="Lyssnare"
          value={song.listeners.toLocaleString('sv-SE')}
          color="text-slate-100"
        />
        <StatCard
          label="Saves"
          value={song.saves.toLocaleString('sv-SE')}
          sub={`${song.saves_ratio?.toFixed(2) ?? '–'}% ratio`}
          color="text-emerald-400"
        />
        <StatCard
          label="Score"
          value={`${song.score?.toFixed(2) ?? '–'} / 10`}
          color={
            (song.score ?? 0) >= 6.5
              ? 'text-emerald-400'
              : (song.score ?? 0) >= 5
                ? 'text-blue-400'
                : (song.score ?? 0) >= 4
                  ? 'text-amber-400'
                  : 'text-red-400'
          }
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Streams/lyssnare"
          value={song.streams_per_listener?.toFixed(2) ?? '–'}
          sub={
            (song.streams_per_listener ?? 0) >= 2 ? '✓ Sticky' : 'Under 2.0 mål'
          }
          color={
            (song.streams_per_listener ?? 0) >= 2 ? 'text-emerald-400' : 'text-slate-300'
          }
        />
        <StatCard
          label="Aktiva streams"
          value={song.active_streams_abs?.toLocaleString('sv-SE') ?? '–'}
          sub={`${song.active_pct ?? '?'}% av totalt`}
          color="text-blue-400"
        />
        <StatCard
          label="Programmerad %"
          value={song.programmed_pct != null ? `${song.programmed_pct}%` : '–'}
          sub={
            song.programmed_pct != null && song.programmed_pct >= 55
              ? '✓ Organisk signal'
              : ''
          }
          color={
            song.programmed_pct != null && song.programmed_pct >= 55
              ? 'text-emerald-400'
              : 'text-slate-300'
          }
        />
        <StatCard
          label="Daglig budget"
          value={
            song.daily_budget_sek > 0 ? `${song.daily_budget_sek} kr` : 'Ej annonserad'
          }
          color={song.daily_budget_sek > 0 ? 'text-amber-400' : 'text-slate-400'}
        />
      </div>

      {/* Charts row */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        {/* Source donut */}
        {(song.programmed_pct != null || song.active_pct != null) && (
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              Källfördelning
            </h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {sourceData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {sourceData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="text-slate-400">{d.name}</span>
                    <span className="text-slate-100 font-medium tabular-nums ml-auto">
                      {d.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Trend indicator */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Trend</h3>
          {song.trend_pct != null ? (
            <div className="flex items-center gap-3">
              <span
                className={`text-4xl font-bold tabular-nums ${
                  song.trend_pct > 15
                    ? 'text-emerald-400'
                    : song.trend_pct > 0
                      ? 'text-blue-400'
                      : song.trend_pct > -10
                        ? 'text-amber-400'
                        : 'text-red-400'
                }`}
              >
                {song.trend_pct > 0 ? '+' : ''}
                {song.trend_pct.toFixed(1)}%
              </span>
              <div className="text-sm text-slate-500">
                {song.trend_pct > 15
                  ? 'Stark uppgång — god timing för annonsering'
                  : song.trend_pct > 0
                    ? 'Svagt positiv trend'
                    : song.trend_pct > -10
                      ? 'Svagt negativ trend'
                      : 'Fallande trend — bevaka noga'}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Ingen trenddata tillgänglig</p>
          )}
        </div>
      </div>

      {/* Timeline chart */}
      {song.timeline && song.timeline.length > 0 && (
        <div className="card mb-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            Streamtrend (från CSV)
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={song.timeline}
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
                itemStyle={{ color: '#a78bfa' }}
              />
              <Line
                type="monotone"
                dataKey="streams"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#a78bfa' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Catalog comparison */}
      <div className="mb-4">
        <CatalogComparison song={song} allSongs={allSongs} />
      </div>

      {/* AI Analysis */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300">AI-analys</h3>
          <button
            onClick={handleAnalyze}
            disabled={aiLoading}
            className={`btn-primary text-sm py-1.5 px-3 ${aiLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {aiLoading ? 'Analyserar...' : 'Analysera'}
          </button>
        </div>

        {aiError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-3">
            {aiError}
          </div>
        )}

        {aiAnalysis ? (
          <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
            {aiAnalysis}
          </div>
        ) : !aiLoading ? (
          <p className="text-slate-500 text-sm">
            Klicka på "Analysera" för att få en AI-driven rekommendation för den här låten.
            {!apiKey && (
              <span className="text-amber-400">
                {' '}
                (Kräver Anthropic API-nyckel under Inställningar)
              </span>
            )}
          </p>
        ) : (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            Genererar analys...
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <EditSongModal
          song={song}
          onSave={(updated) => {
            onUpdateSong(updated)
            setEditing(false)
          }}
          onClose={() => setEditing(false)}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card border border-bg-border rounded-xl p-5 max-w-sm w-full">
            <h2 className="font-bold text-lg text-slate-100 mb-2">Ta bort låt?</h2>
            <p className="text-slate-400 text-sm mb-4">
              Är du säker på att du vill ta bort "{song.title}"? Detta kan inte ångras.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onDeleteSong(song.id)}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg px-4 py-2 transition-colors"
              >
                Ta bort
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
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
