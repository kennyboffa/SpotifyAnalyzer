import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { ArtistData, Song, SongCharacter, SongEra } from '../types'

interface ManualEntryProps {
  artistData: ArtistData
  onUpdateData: (data: ArtistData) => void
}

type FormState = {
  title: string
  streams_28d: string
  listeners: string
  saves: string
  programmed_pct: string
  active_pct: string
  daily_budget_sek: string
  release_date: string
  trend_pct: string
  era: SongEra | ''
  character: SongCharacter | ''
}

const EMPTY_FORM: FormState = {
  title: '',
  streams_28d: '',
  listeners: '',
  saves: '',
  programmed_pct: '',
  active_pct: '',
  daily_budget_sek: '0',
  release_date: '',
  trend_pct: '',
  era: '',
  character: '',
}

export default function ManualEntry({ artistData, onUpdateData }: ManualEntryProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState<string | null>(null)

  const set = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setSuccess(false)
    setError('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('Låttitel krävs')
      return
    }
    if (!form.streams_28d || !form.listeners || !form.saves) {
      setError('Streams, lyssnare och saves krävs')
      return
    }

    const song: Song = {
      id: editMode ?? uuidv4(),
      title: form.title.trim(),
      streams_28d: Number(form.streams_28d),
      listeners: Number(form.listeners),
      saves: Number(form.saves),
      programmed_pct: form.programmed_pct !== '' ? Number(form.programmed_pct) : null,
      active_pct: form.active_pct !== '' ? Number(form.active_pct) : null,
      daily_budget_sek: Number(form.daily_budget_sek) || 0,
      release_date: form.release_date || undefined,
      trend_pct: form.trend_pct !== '' ? Number(form.trend_pct) : undefined,
      era: (form.era as SongEra) || undefined,
      character: (form.character as SongCharacter) || undefined,
    }

    if (editMode) {
      onUpdateData({
        ...artistData,
        songs: artistData.songs.map((s) => (s.id === editMode ? song : s)),
      })
      setEditMode(null)
    } else {
      onUpdateData({ ...artistData, songs: [...artistData.songs, song] })
    }

    setForm(EMPTY_FORM)
    setSuccess(true)
    setError('')
  }

  const startEdit = (song: Song) => {
    setEditMode(song.id)
    setForm({
      title: song.title,
      streams_28d: String(song.streams_28d),
      listeners: String(song.listeners),
      saves: String(song.saves),
      programmed_pct: song.programmed_pct != null ? String(song.programmed_pct) : '',
      active_pct: song.active_pct != null ? String(song.active_pct) : '',
      daily_budget_sek: String(song.daily_budget_sek),
      release_date: song.release_date ?? '',
      trend_pct: song.trend_pct != null ? String(song.trend_pct) : '',
      era: song.era ?? '',
      character: song.character ?? '',
    })
    setSuccess(false)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditMode(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  return (
    <div>
      <div className="card mb-5">
        <h3 className="font-semibold text-slate-200 mb-4">
          {editMode ? '✏️ Redigera låt' : '➕ Lägg till ny låt'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Låttitel <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="t.ex. The Awakening"
              className="input w-full"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Streams 28d <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.streams_28d}
                onChange={(e) => set('streams_28d', e.target.value)}
                placeholder="22407"
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Lyssnare <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.listeners}
                onChange={(e) => set('listeners', e.target.value)}
                placeholder="10898"
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Saves <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.saves}
                onChange={(e) => set('saves', e.target.value)}
                placeholder="388"
                className="input w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Programmerad %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.programmed_pct}
                onChange={(e) => set('programmed_pct', e.target.value)}
                placeholder="66"
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Aktiv %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.active_pct}
                onChange={(e) => set('active_pct', e.target.value)}
                placeholder="30"
                className="input w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Daglig budget (kr)
              </label>
              <input
                type="number"
                min="0"
                value={form.daily_budget_sek}
                onChange={(e) => set('daily_budget_sek', e.target.value)}
                placeholder="150"
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Trend %</label>
              <input
                type="number"
                value={form.trend_pct}
                onChange={(e) => set('trend_pct', e.target.value)}
                placeholder="28.5"
                className="input w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Karaktär</label>
              <select
                value={form.character}
                onChange={(e) => set('character', e.target.value)}
                className="input w-full"
              >
                <option value="">Välj...</option>
                <option value="energetic">🔥 Energisk</option>
                <option value="ballad">💙 Ballad</option>
                <option value="building">⬆️ Byggande</option>
                <option value="mixed">🎭 Blandad</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Era</label>
              <select
                value={form.era}
                onChange={(e) => set('era', e.target.value)}
                className="input w-full"
              >
                <option value="">Välj...</option>
                <option value="new">Ny</option>
                <option value="old">Gammal</option>
                <option value="classic">Klassiker</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Släppdatum</label>
            <input
              type="date"
              value={form.release_date}
              onChange={(e) => set('release_date', e.target.value)}
              className="input w-full"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 text-sm">
              ✓ Låt {editMode ? 'uppdaterad' : 'tillagd'}!
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-primary flex-1">
              {editMode ? 'Uppdatera' : 'Lägg till'}
            </button>
            {editMode && (
              <button type="button" onClick={cancelEdit} className="btn-secondary flex-1">
                Avbryt
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Existing songs list */}
      <div className="card">
        <h3 className="font-semibold text-slate-200 mb-3">
          Befintliga låtar ({artistData.songs.length})
        </h3>
        <div className="space-y-2">
          {artistData.songs.map((song) => (
            <div
              key={song.id}
              className="flex items-center justify-between py-2 border-b border-bg-border last:border-0"
            >
              <div className="min-w-0">
                <div className="text-sm text-slate-200 truncate">{song.title}</div>
                <div className="text-xs text-slate-500">
                  {song.streams_28d.toLocaleString('sv-SE')} streams •{' '}
                  {song.saves} saves
                </div>
              </div>
              <button
                onClick={() => startEdit(song)}
                className="text-xs btn-ghost ml-2 shrink-0"
              >
                Redigera
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
