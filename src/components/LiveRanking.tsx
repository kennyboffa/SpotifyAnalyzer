import { useState } from 'react'
import type { Song, SongCharacter } from '../types'

const CHARACTER_LABELS: Record<SongCharacter, string> = {
  energetic: 'Energisk',
  ballad: 'Ballad',
  building: 'Byggande',
  mixed: 'Blandad',
}

const CHARACTER_ICONS: Record<SongCharacter, string> = {
  energetic: '🔥',
  ballad: '💙',
  building: '⬆️',
  mixed: '🎭',
}

interface LiveRankingProps {
  songs: Song[]
}

function liveScore(song: Song): number {
  const activeAbs = song.active_streams_abs ?? 0
  const maxActive = 5000
  const activeNorm = Math.min(activeAbs / maxActive, 1) * 5

  const savesRatio = song.saves_ratio ?? 0
  const savesNorm = Math.min(savesRatio / 6, 1) * 5

  return Math.round((activeNorm + savesNorm) * 10) / 10
}

export default function LiveRanking({ songs }: LiveRankingProps) {
  const [characterFilter, setCharacterFilter] = useState<SongCharacter | 'all'>('all')

  const ranked = [...songs]
    .filter((s) => {
      if (characterFilter === 'all') return true
      return s.character === characterFilter
    })
    .map((s) => ({ ...s, liveScore: liveScore(s) }))
    .sort((a, b) => b.liveScore - a.liveScore)

  const maxLiveScore = Math.max(...ranked.map((s) => s.liveScore), 1)

  const setlistOrder = ranked.filter((s) => s.character !== 'ballad')
  const ballads = ranked.filter((s) => s.character === 'ballad')

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-100 mb-1">Live-ranking</h2>
      <p className="text-slate-500 text-sm mb-4">
        Baserad på aktiva streams och saves-ratio
      </p>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'energetic', 'ballad', 'building', 'mixed'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCharacterFilter(c)}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors duration-150 ${
              characterFilter === c
                ? 'bg-violet-600 border-violet-600 text-white'
                : 'border-bg-border text-slate-400 hover:text-slate-200'
            }`}
          >
            {c === 'all'
              ? 'Alla'
              : `${CHARACTER_ICONS[c]} ${CHARACTER_LABELS[c]}`}
          </button>
        ))}
      </div>

      {/* Setlist tip */}
      {ballads.length > 0 && characterFilter === 'all' && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mb-4 flex items-start gap-2">
          <span className="text-blue-400 shrink-0">💡</span>
          <p className="text-sm text-blue-300/80">
            Du har {ballads.length} ballad{ballads.length > 1 ? 'er' : ''} i din katalog.
            Ballader kräver rätt placering i setlistan — placera dem helst efter en energisk
            låt för maximal emotionell effekt.
          </p>
        </div>
      )}

      {/* Ranked list */}
      <div className="space-y-2 mb-6">
        {ranked.map((song, idx) => {
          const isBallad = song.character === 'ballad'
          return (
            <div
              key={song.id}
              className={`card flex items-center gap-4 ${isBallad ? 'border-blue-500/20' : ''}`}
            >
              {/* Rank */}
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-bold bg-bg-surface text-slate-400">
                {idx + 1}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-100 truncate">
                    {song.title}
                  </span>
                  {song.character && (
                    <span className="text-[10px] text-slate-500 bg-bg-surface px-1.5 py-0.5 rounded shrink-0">
                      {CHARACTER_ICONS[song.character]} {CHARACTER_LABELS[song.character]}
                    </span>
                  )}
                  {isBallad && (
                    <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded shrink-0">
                      ⚠ Setlist-placering viktig
                    </span>
                  )}
                </div>

                {/* Live score bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{ width: `${(song.liveScore / maxLiveScore) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 tabular-nums w-8 text-right">
                    {song.liveScore.toFixed(1)}
                  </span>
                </div>

                {/* Sub metrics */}
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                  <span>
                    🎧 {song.active_streams_abs?.toLocaleString('sv-SE') ?? '–'} aktiva
                  </span>
                  <span>💚 {song.saves_ratio?.toFixed(2) ?? '–'}% saves</span>
                  {song.streams_per_listener != null && (
                    <span>
                      🔄 {song.streams_per_listener.toFixed(2)}x per lyssnare
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {ranked.length === 0 && (
          <div className="card text-center py-8 text-slate-500">
            Inga låtar matchar filtret
          </div>
        )}
      </div>

      {/* Suggested setlist */}
      {characterFilter === 'all' && setlistOrder.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            💡 Föreslagen setlista-ordning
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Baserat på karaktär och livescore — öppna starkt, bygg mot klimax, avsluta med en stark låt.
          </p>
          <ol className="space-y-1.5">
            {setlistOrder.slice(0, 8).map((song, i) => (
              <li key={song.id} className="flex items-center gap-3 text-sm">
                <span className="text-slate-600 w-4 text-right shrink-0">{i + 1}.</span>
                <span className="text-slate-300">{song.title}</span>
                {song.character && (
                  <span className="text-slate-600 text-xs">
                    {CHARACTER_ICONS[song.character]}
                  </span>
                )}
              </li>
            ))}
          </ol>
          {ballads.length > 0 && (
            <div className="mt-3 pt-3 border-t border-bg-border">
              <p className="text-xs text-slate-500 mb-2">
                Ballader (placeras strategiskt i mitten av setlistan):
              </p>
              {ballads.slice(0, 3).map((song) => (
                <div key={song.id} className="flex items-center gap-2 text-sm text-blue-400">
                  <span>💙</span>
                  <span>{song.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
