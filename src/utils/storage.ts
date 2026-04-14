import type { ArtistData } from '../types'
import { DEFAULT_SONGS } from './defaultData'

const STORAGE_KEY = 'watc_artist_data'
const API_KEY_STORAGE = 'watc_anthropic_key'

export function loadArtistData(): ArtistData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ArtistData
      if (parsed.songs && Array.isArray(parsed.songs)) {
        return parsed
      }
    }
  } catch {
    // ignore parse errors
  }
  return { songs: DEFAULT_SONGS, last_updated: new Date().toISOString() }
}

export function saveArtistData(data: ArtistData): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...data, last_updated: new Date().toISOString() }),
  )
}

export function loadApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) ?? ''
}

export function saveApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE, key)
}

export function exportData(data: ArtistData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `watc-analytics-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importData(file: File): Promise<ArtistData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ArtistData
        resolve(data)
      } catch {
        reject(new Error('Ogiltig JSON-fil'))
      }
    }
    reader.onerror = () => reject(new Error('Kunde inte läsa filen'))
    reader.readAsText(file)
  })
}
