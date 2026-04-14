export type PriorityCategory = 'scale_up' | 'test' | 'anchor' | 'low'
export type SongEra = 'new' | 'old' | 'classic'
export type SongCharacter = 'energetic' | 'ballad' | 'building' | 'mixed'

export interface TimelineEntry {
  date: string
  streams: number
}

export interface Song {
  id: string
  title: string
  streams_28d: number
  streams_90d?: number
  listeners: number
  saves: number
  programmed_pct?: number | null
  active_pct?: number | null
  daily_budget_sek: number
  release_date?: string
  era?: SongEra
  character?: SongCharacter
  timeline?: TimelineEntry[]
  trend_pct?: number
  avg_7day?: number
  // Computed fields
  saves_ratio?: number
  streams_per_listener?: number
  active_streams_abs?: number
  score?: number
  priority_category?: PriorityCategory
}

export interface Demographics {
  gender: {
    male: number
    female: number
    nonbinary: number
  }
  age_groups: {
    under18?: number
    '18-24'?: number
    '25-34'?: number
    '35-44'?: number
    '45-54'?: number
    '55-64'?: number
    '65plus'?: number
  }
}

export interface LocationEntry {
  country: string
  listeners: number
  streams_pct: number
}

export interface ArtistData {
  songs: Song[]
  demographics?: Demographics
  locations?: LocationEntry[]
  last_updated?: string
}

export interface Filters {
  category: PriorityCategory | 'all'
  era: SongEra | 'all'
  advertised: 'all' | 'yes' | 'no'
}

export type ViewTab = 'dashboard' | 'trends' | 'demographics' | 'live' | 'input' | 'settings'

// Anthropic API response types
export interface ScreenshotSongsData {
  type: 'songs'
  songs: {
    title: string
    streams: number
    listeners: number
    saves: number
    first_released?: string
  }[]
}

export interface ScreenshotDemographicsData {
  type: 'demographics'
  gender: { male: number; female: number; nonbinary: number }
  age_groups: Record<string, number>
}

export interface ScreenshotLocationData {
  type: 'location'
  countries: { country: string; listeners: number; streams_pct: number }[]
}

export interface ScreenshotSongSourcesData {
  type: 'song_sources'
  song_title: string
  programmed_pct: number
  active_pct: number
}

export type ScreenshotData =
  | ScreenshotSongsData
  | ScreenshotDemographicsData
  | ScreenshotLocationData
  | ScreenshotSongSourcesData
