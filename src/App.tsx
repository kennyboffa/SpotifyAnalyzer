import { useState, useEffect, useCallback } from 'react'
import type { ArtistData, ViewTab, Song, Filters } from './types'
import { enrichAllSongs } from './utils/scoring'
import { loadArtistData, saveArtistData, loadApiKey, saveApiKey } from './utils/storage'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import TrendView from './components/TrendView'
import DemographicsView from './components/DemographicsView'
import LiveRanking from './components/LiveRanking'
import DataInput from './components/DataInput'
import Settings from './components/Settings'
import SongDetail from './components/SongDetail'

const DEFAULT_FILTERS: Filters = {
  category: 'all',
  era: 'all',
  advertised: 'all',
}

export default function App() {
  const [artistData, setArtistData] = useState<ArtistData>(() => loadArtistData())
  const [currentView, setCurrentView] = useState<ViewTab>('dashboard')
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [apiKey, setApiKey] = useState<string>(() => loadApiKey())

  // Enrich songs with computed fields whenever data changes
  const enrichedData: ArtistData = {
    ...artistData,
    songs: enrichAllSongs(artistData.songs),
  }

  const handleUpdateData = useCallback((newData: ArtistData) => {
    setArtistData(newData)
    saveArtistData(newData)
  }, [])

  const handleUpdateSong = useCallback((updatedSong: Song) => {
    setArtistData((prev) => {
      const updated = {
        ...prev,
        songs: prev.songs.map((s) => (s.id === updatedSong.id ? updatedSong : s)),
      }
      saveArtistData(updated)
      return updated
    })
  }, [])

  const handleDeleteSong = useCallback((songId: string) => {
    setArtistData((prev) => {
      const updated = { ...prev, songs: prev.songs.filter((s) => s.id !== songId) }
      saveArtistData(updated)
      return updated
    })
    setSelectedSongId(null)
  }, [])

  const handleApiKeyChange = useCallback((key: string) => {
    setApiKey(key)
    saveApiKey(key)
  }, [])

  // Save on every change
  useEffect(() => {
    saveArtistData(artistData)
  }, [artistData])

  const selectedSong = enrichedData.songs.find((s) => s.id === selectedSongId) ?? null

  return (
    <Layout
      currentView={currentView}
      onViewChange={(view) => {
        setCurrentView(view)
        if (view !== 'dashboard') setSelectedSongId(null)
      }}
    >
      {selectedSong && currentView === 'dashboard' ? (
        <SongDetail
          song={selectedSong}
          allSongs={enrichedData.songs}
          apiKey={apiKey}
          onBack={() => setSelectedSongId(null)}
          onUpdateSong={handleUpdateSong}
          onDeleteSong={handleDeleteSong}
        />
      ) : currentView === 'dashboard' ? (
        <Dashboard
          artistData={enrichedData}
          filters={filters}
          onFiltersChange={setFilters}
          onSelectSong={(id) => {
            setSelectedSongId(id)
          }}
        />
      ) : currentView === 'trends' ? (
        <TrendView songs={enrichedData.songs} />
      ) : currentView === 'demographics' ? (
        <DemographicsView
          demographics={enrichedData.demographics}
          locations={enrichedData.locations}
          songs={enrichedData.songs}
          onUpdateData={handleUpdateData}
          artistData={enrichedData}
        />
      ) : currentView === 'live' ? (
        <LiveRanking songs={enrichedData.songs} />
      ) : currentView === 'input' ? (
        <DataInput
          artistData={enrichedData}
          onUpdateData={handleUpdateData}
          apiKey={apiKey}
        />
      ) : currentView === 'settings' ? (
        <Settings
          apiKey={apiKey}
          onApiKeyChange={handleApiKeyChange}
          artistData={enrichedData}
          onUpdateData={handleUpdateData}
        />
      ) : null}
    </Layout>
  )
}
