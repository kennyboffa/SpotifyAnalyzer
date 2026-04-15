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
import {
  driveSignal,
  savesSignal,
  trendSignal,
  stickySignal,
  scoreLabel,
  type Signal,
} from '../utils/signals'
import { analyzeSong } from '../utils/anthropicApi'

interface SongDetailProps {
  song: Song
  allSongs: Song[]
  apiKey: string
  onBack: () => void
  onUpdateSong: (song: Song) => void
  onDeleteSong: (id: string) => void
}

// A stat card with label, big number, and a plain-language interpretation line
function StatCard({
  label,
  value,
  interpretation,
  interpretationColor,
  goal,
}: {
  label: string
  value: string
  interpretation?: string
  interpretationColor?: string
  goal?: string
}) {
  return (
    <div className="card flex flex-col gap-0.5">
      <div className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-xl font-bold tabular-nums text-slate-100">{value}</div>
      {interpretation && (
        <div className={`text-xs font-medium ${interpretationColor ?? 'text-slate-400'}`}>
          {interpretation}
        </div>
      )}
      {goal && <div className="text-[11px] text-slate-600">{goal}</div>}
    </div>
  )
}

function SignalChip({ signal }: { signal: Signal }) {
  return (
    <div className={`rounded-lg border p-3 ${signal.bg}`}>
      <div className={`text-sm font-semibold mb-1 ${signal.color}`}>{signal.label}</div>
      <div className="text-xs text-slate-400 leading-relaxed">{signal.tip}</div>
    </div>
  )
}

function CatalogComparison({ song, allSongs }: { song: Song; allSongs: Song[] }) {
  const avg = {
    saves_ratio: allSongs.reduce((s, x) => s + (x.saves_ratio ?? 0), 0) / allSongs.length,
    streams_per_listener:
      allSongs.reduce((s, x) => s + (x.streams_per_listener ?? 0), 0) / allSongs.length,
    score: allSongs.reduce((s, x) => s + (x.score ?? 0), 0) / allSongs.length,
  }

  const metrics = [
    {
      label: 'Sparandegrad',
      sublabel: 'andel lyssnare som sparar låten',
      value: song.saves_ratio ?? 0,
      avg: avg.saves_ratio,
      fmt: (v: number) => `${v.toFixed(2)}%`,
      threshold: 3,
      goalText: 'Mål: >3%',
    },
    {
      label: 'Lyssnar om',
      sublabel: 'genomsnittliga streams per unik lyssnare',
      value: song.streams_per_listener ?? 0,
      avg: avg.streams_per_listener,
      fmt: (v: number) => `${v.toFixed(2)}x`,
      threshold: 2,
      goalText: 'Mål: >2.0',
    },
    {
      label: 'Organisk poäng',
      sublabel: 'sammansatt mått på potential utan annonser',
      value: song.score ?? 0,
      avg: avg.score,
      fmt: (v: number) => `${v.toFixed(1)} / 10`,
      threshold: 5,
      goalText: 'Mål: >6.5 för att skala upp',
    },
  ]

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">
        Jämförelse mot katalogsnitt
      </h3>
      <div className="space-y-4">
        {metrics.map((m) => {
          const betterThanAvg = m.value > m.avg
          const aboveThreshold = m.value >= m.threshold
          return (
            <div key={m.label}>
              <div className="flex justify-between items-baseline mb-1">
                <div>
                  <span className="text-sm text-slate-300">{m.label}</span>
                  <span className="text-[11px] text-slate-600 ml-1.5">{m.sublabel}</span>
                </div>
                <div className="flex items-center gap-2 text-sm tabular-nums shrink-0 ml-2">
                  <span className={betterThanAvg ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                    {m.fmt(m.value)}
                  </span>
                  <span className="text-slate-600 text-xs">snitt: {m.fmt(m.avg)}</span>
                </div>
              </div>
              <div className="h-2 bg-bg-border rounded-full overflow-hidden relative">
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-500 z-10"
                  style={{ left: `${Math.min((m.avg / (m.threshold * 2)) * 100, 100)}%` }}
                />
                <div
                  className={`h-full rounded-full ${aboveThreshold ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min((m.value / (m.threshold * 2)) * 100, 100)}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">{m.goalText}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EditSongModal({ song, onSave, onClose }: {
  song: Song; onSave: (s: Song) => void; onClose: () => void
}) {
  const [form, setForm] = useState({ ...song })
  const set = (key: keyof Song, value: string | number | null) =>
    setForm((f) => ({ ...f, [key]: value }))

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-bg-card border border-bg-border rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-slate-100">Redigera låt</h2>
          <button onClick={onClose} className="btn-ghost text-lg">✕</button>
        </div>
        <div className="space-y-3">
          {([
            { key: 'title', label: 'Titel', type: 'text' },
            { key: 'streams_28d', label: 'Streams (28d)', type: 'number' },
            { key: 'listeners', label: 'Lyssnare', type: 'number' },
            { key: 'saves', label: 'Saves', type: 'number' },
            { key: 'programmed_pct', label: 'Algoritm-andel %', type: 'number' },
            { key: 'active_pct', label: 'Aktiv-andel %', type: 'number' },
            { key: 'daily_budget_sek', label: 'Daglig annonsbudget (kr)', type: 'number' },
            { key: 'trend_pct', label: 'Trend %', type: 'number' },
          ] as { key: keyof Song; label: string; type: string }[]).map(({ key, label, type }) => (
            <div key={key}>
              <label className="text-xs text-slate-400 mb-1 block">{label}</label>
              <input
                type={type}
                value={form[key] != null ? String(form[key]) : ''}
                onChange={(e) => {
                  const v = e.target.value
                  set(key, type === 'number' ? (v === '' ? null : Number(v)) : v)
                }}
                className="input w-full"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Karaktär</label>
            <select
              value={form.character ?? ''}
              onChange={(e) => set('character', e.target.value as Song['character'] || undefined as unknown as null)}
              className="input w-full"
            >
              <option value="">Välj...</option>
              <option value="energetic">🔥 Energisk</option>
              <option value="ballad">💙 Ballad</option>
              <option value="building">⬆️ Byggande</option>
              <option value="mixed">🎭 Blandad</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={() => onSave(form)} className="btn-primary flex-1">Spara</button>
          <button onClick={onClose} className="btn-secondary flex-1">Avbryt</button>
        </div>
      </div>
    </div>
  )
}

export default function SongDetail({
  song, allSongs, apiKey, onBack, onUpdateSong, onDeleteSong,
}: SongDetailProps) {
  const [aiAnalysis, setAiAnalysis] = useState<string>('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string>('')
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const cat = song.priority_category ?? 'low'
  const lbl = scoreLabel(song.score ?? 0)

  const handleAnalyze = async () => {
    if (!apiKey) { setAiError('Ange din Anthropic API-nyckel under Inställningar.'); return }
    setAiLoading(true); setAiError('')
    try {
      setAiAnalysis(await analyzeSong(song, allSongs, apiKey))
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Okänt fel')
    } finally {
      setAiLoading(false)
    }
  }

  // Signals
  const drive = driveSignal(song.programmed_pct, song.active_pct, song.daily_budget_sek)
  const saves = savesSignal(song.saves_ratio)
  const trend = trendSignal(song.trend_pct)
  const sticky = stickySignal(song.streams_per_listener)
  const signals = [drive, saves, sticky, trend].filter(Boolean) as Signal[]

  // Source donut
  const progPct = song.programmed_pct ?? 0
  const activePct = song.active_pct ?? 0
  const otherPct = Math.max(0, 100 - progPct - activePct)
  const sourceData = [
    { name: 'Algoritm-driven', value: progPct, color: '#7c3aed', desc: 'Discover Weekly, Radio, autoplay' },
    { name: 'Aktiv / fans', value: activePct, color: '#10b981', desc: 'Söker upp låten eller spelar från playlist' },
    ...(otherPct > 0 ? [{ name: 'Övrigt', value: otherPct, color: '#334155', desc: '' }] : []),
  ]

  return (
    <div>
      <button onClick={onBack} className="btn-ghost mb-4 flex items-center gap-2">
        ← Tillbaka
      </button>

      {/* Title + category + actions */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{song.title}</h1>
          <div className={`inline-flex items-center gap-1.5 mt-1.5 text-sm font-medium px-2.5 py-1 rounded-full border ${CATEGORY_BG[cat]}`}>
            <span>{CATEGORY_DOT[cat]}</span>
            <span className={CATEGORY_COLORS[cat]}>{CATEGORY_LABELS[cat]}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setEditing(true)} className="btn-secondary text-sm py-1.5">Redigera</button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg px-3 py-1.5 text-sm transition-colors"
          >
            Ta bort
          </button>
        </div>
      </div>

      {/* Signal cards — plain language summary of what's happening */}
      <div className="mb-5">
        <h3 className="text-xs text-slate-500 uppercase tracking-wide mb-2">
          Vad signalerna säger
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {signals.map((sig) => <SignalChip key={sig.label} signal={sig} />)}
        </div>
      </div>

      {/* Core stats — with plain language interpretation */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <StatCard
          label="Streams senaste 28 dagarna"
          value={song.streams_28d.toLocaleString('sv-SE')}
          interpretation="antal gånger låten spelats"
          interpretationColor="text-violet-400"
        />
        <StatCard
          label="Unika lyssnare"
          value={song.listeners.toLocaleString('sv-SE')}
          interpretation="olika personer som hört låten"
          interpretationColor="text-slate-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <StatCard
          label="Sparade låten"
          value={song.saves.toLocaleString('sv-SE')}
          interpretation={
            song.saves_ratio != null
              ? song.saves_ratio >= 3
                ? `✓ ${song.saves_ratio.toFixed(1)}% av lyssnarna — bra konvertering`
                : `${song.saves_ratio.toFixed(1)}% av lyssnarna sparade`
              : undefined
          }
          interpretationColor={
            (song.saves_ratio ?? 0) >= 3 ? 'text-emerald-400' : 'text-amber-400'
          }
          goal="Mål: >3% för stark fanskonvertering"
        />
        <StatCard
          label="Organisk poäng"
          value={`${song.score?.toFixed(1) ?? '–'} / 10`}
          interpretation={lbl.text + ' potential utan annonsbudget'}
          interpretationColor={lbl.color}
          goal="Baserat på algoritm, sparande och återlyssning"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard
          label="Algoritm-andel"
          value={song.programmed_pct != null ? `${song.programmed_pct}%` : 'Okänd'}
          interpretation={
            song.programmed_pct == null ? 'Hämta från Spotify for Artists' :
            song.programmed_pct >= 55 ? '✓ Algoritmen prioriterar låten' :
            song.programmed_pct >= 30 ? 'Viss algoritmspridning' :
            'Liten organisk spridning'
          }
          interpretationColor={
            song.programmed_pct != null && song.programmed_pct >= 55
              ? 'text-emerald-400'
              : song.programmed_pct != null && song.programmed_pct >= 30
                ? 'text-amber-400'
                : 'text-slate-500'
          }
          goal="Mål: >55% för stark organisk signal"
        />
        <StatCard
          label="Aktiv-andel"
          value={song.active_pct != null ? `${song.active_pct}%` : 'Okänd'}
          interpretation={
            song.active_pct == null ? 'Hämta från Spotify for Artists' :
            song.active_pct >= 55 ? 'Fans söker aktivt upp låten' :
            song.active_pct >= 35 ? 'God mix av aktiva lyssnare' :
            'Passiv lyssning dominerar'
          }
          interpretationColor={
            song.active_pct != null && song.active_pct >= 55 ? 'text-blue-400' : 'text-slate-400'
          }
          goal={`Aktiva streams: ca ${(song.active_streams_abs ?? 0).toLocaleString('sv-SE')}`}
        />
      </div>

      {/* Charts */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        {/* Source donut */}
        {(song.programmed_pct != null || song.active_pct != null) && (
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-300 mb-1">
              Varifrån kommer streams?
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Algoritm = Spotify sprider organiskt. Aktiv = fans väljer själva.
            </p>
            <div className="flex items-center gap-3">
              <ResponsiveContainer width={110} height={110}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={30} outerRadius={52} dataKey="value" strokeWidth={0}>
                    {sourceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {sourceData.map((d) => (
                  <div key={d.name}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-sm text-slate-300 font-medium">{d.value}%</span>
                      <span className="text-xs text-slate-400">{d.name}</span>
                    </div>
                    {d.desc && <div className="text-[10px] text-slate-600 ml-4">{d.desc}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Streams per listener + trend */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Återlyssning & trend</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className={`text-2xl font-bold tabular-nums ${(song.streams_per_listener ?? 0) >= 2 ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {song.streams_per_listener?.toFixed(2) ?? '–'}x
                </span>
                <span className="text-xs text-slate-500">streams per lyssnare</span>
              </div>
              <p className="text-xs text-slate-500">
                {(song.streams_per_listener ?? 0) >= 2
                  ? '✓ Sticky — folk lyssnar om flera gånger'
                  : 'Under 2.0 — de flesta lyssnar bara en gång'}
              </p>
              <p className="text-[11px] text-slate-600">Mål: &gt;2.0 betyder en &quot;sticky&quot; låt</p>
            </div>

            {song.trend_pct != null && (
              <div>
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className={`text-2xl font-bold tabular-nums ${song.trend_pct > 15 ? 'text-emerald-400' : song.trend_pct > 0 ? 'text-blue-400' : song.trend_pct > -10 ? 'text-amber-400' : 'text-red-400'}`}>
                    {song.trend_pct > 0 ? '+' : ''}{song.trend_pct.toFixed(1)}%
                  </span>
                  <span className="text-xs text-slate-500">trend 28d</span>
                </div>
                <p className="text-xs text-slate-500">
                  {song.trend_pct > 15 ? 'Stark uppgång — bra tid att öka annonserna'
                    : song.trend_pct > 0 ? 'Svagt växande'
                    : song.trend_pct > -10 ? 'Svagt fallande — bevaka'
                    : 'Tydligt fallande — pausa eller ompröva budget'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {song.timeline && song.timeline.length > 0 && (
        <div className="card mb-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-1">Streams per dag</h3>
          <p className="text-xs text-slate-500 mb-3">Från importerad CSV-fil</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={song.timeline} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a42" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1c1c2e', border: '1px solid #2a2a42', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#a78bfa' }}
              />
              <Line type="monotone" dataKey="streams" stroke="#7c3aed" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#a78bfa' }} />
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
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-300">AI-rekommendation</h3>
            <p className="text-xs text-slate-500">Konkret handlingsplan baserad på datan</p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={aiLoading}
            className={`btn-primary text-sm py-1.5 px-3 shrink-0 ${aiLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {aiLoading ? 'Analyserar...' : 'Analysera'}
          </button>
        </div>

        {aiError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-3">{aiError}</div>
        )}

        {aiAnalysis ? (
          <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed mt-3 pt-3 border-t border-bg-border">
            {aiAnalysis}
          </div>
        ) : !aiLoading ? (
          <p className="text-slate-500 text-sm mt-2">
            Genererar en analys med WATC-kontext och konkreta nästa steg.
            {!apiKey && <span className="text-amber-400"> (Kräver API-nyckel under Inställningar)</span>}
          </p>
        ) : (
          <div className="flex items-center gap-2 text-slate-500 text-sm mt-2">
            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            Genererar analys...
          </div>
        )}
      </div>

      {editing && (
        <EditSongModal song={song} onSave={(updated) => { onUpdateSong(updated); setEditing(false) }} onClose={() => setEditing(false)} />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card border border-bg-border rounded-xl p-5 max-w-sm w-full">
            <h2 className="font-bold text-lg text-slate-100 mb-2">Ta bort låt?</h2>
            <p className="text-slate-400 text-sm mb-4">
              Är du säker på att du vill ta bort "{song.title}"? Detta kan inte ångras.
            </p>
            <div className="flex gap-2">
              <button onClick={() => onDeleteSong(song.id)} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg px-4 py-2 transition-colors">Ta bort</button>
              <button onClick={() => setConfirmDelete(false)} className="flex-1 btn-secondary">Avbryt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
