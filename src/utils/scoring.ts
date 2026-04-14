import type { Song, PriorityCategory } from '../types'

export function calculateScore(song: Song): number {
  if (!song.streams_28d || !song.listeners || !song.saves) return 0

  const savesRatio = (song.saves / song.streams_28d) * 100
  const streamsPerListener = song.streams_28d / song.listeners
  const progPct = song.programmed_pct ?? 0

  const savesNorm = Math.min((savesRatio / 6) * 10, 10)
  const splNorm = Math.min((streamsPerListener / 2.5) * 10, 10)
  const progNorm = Math.min((progPct / 80) * 10, 10)

  const adPenalty = Math.min(song.daily_budget_sek / 150, 1.0) * 2

  const score =
    progNorm * 0.35 + savesNorm * 0.35 + splNorm * 0.3 - adPenalty

  return Math.round(score * 100) / 100
}

export function getPriorityCategory(
  song: Song,
  score: number,
  allSongs: Song[],
): PriorityCategory {
  const trend = song.trend_pct ?? 0
  const progPct = song.programmed_pct ?? 0
  const budget = song.daily_budget_sek

  if (score >= 6.5 || (progPct >= 55 && trend > 15)) return 'scale_up'

  // Anchor: top 3 by streams but with significant ad spend
  const sortedByStreams = [...allSongs].sort(
    (a, b) => b.streams_28d - a.streams_28d,
  )
  const top3Ids = sortedByStreams.slice(0, 3).map((s) => s.id)
  if (top3Ids.includes(song.id) && budget >= 100) return 'anchor'

  if (score < 4.5 || (trend < -10 && progPct < 30)) return 'low'

  if (score >= 5.0 && trend > 0) return 'test'

  return 'low'
}

export function enrichSong(song: Song, allSongs: Song[]): Song {
  const saves_ratio =
    song.streams_28d > 0
      ? Math.round((song.saves / song.streams_28d) * 10000) / 100
      : 0
  const streams_per_listener =
    song.listeners > 0
      ? Math.round((song.streams_28d / song.listeners) * 100) / 100
      : 0
  const active_streams_abs =
    song.active_pct != null
      ? Math.round(song.streams_28d * (song.active_pct / 100))
      : undefined

  const score = calculateScore(song)
  const priority_category = getPriorityCategory(song, score, allSongs)

  return {
    ...song,
    saves_ratio,
    streams_per_listener,
    active_streams_abs,
    score,
    priority_category,
  }
}

export function enrichAllSongs(songs: Song[]): Song[] {
  return songs.map((song) => enrichSong(song, songs))
}

export const CATEGORY_LABELS: Record<PriorityCategory, string> = {
  scale_up: 'Skala upp nu',
  test: 'Testa och bevaka',
  anchor: 'Varumärkesanker',
  low: 'Låg prioritet',
}

export const CATEGORY_COLORS: Record<PriorityCategory, string> = {
  scale_up: 'text-emerald-400',
  test: 'text-blue-400',
  anchor: 'text-amber-400',
  low: 'text-red-400',
}

export const CATEGORY_BG: Record<PriorityCategory, string> = {
  scale_up: 'bg-emerald-500/15 border-emerald-500/30',
  test: 'bg-blue-500/15 border-blue-500/30',
  anchor: 'bg-amber-500/15 border-amber-500/30',
  low: 'bg-red-500/15 border-red-500/30',
}

export const CATEGORY_DOT: Record<PriorityCategory, string> = {
  scale_up: '🟢',
  test: '🔵',
  anchor: '🟡',
  low: '🔴',
}
