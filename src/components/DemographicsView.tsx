import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import type { ArtistData, Demographics, LocationEntry, Song } from '../types'

// Countries with known high bot-traffic risk
const HIGH_RISK_COUNTRIES = new Set([
  'Mexico',
  'Indonesia',
  'Brazil',
  'Bangladesh',
  'Pakistan',
  'Venezuela',
  'Bolivia',
])

interface DemographicsViewProps {
  demographics?: Demographics
  locations?: LocationEntry[]
  songs: Song[]
  onUpdateData: (data: ArtistData) => void
  artistData: ArtistData
}


export default function DemographicsView({
  demographics,
  locations,
  songs,
}: DemographicsViewProps) {
  const hasDemographics = demographics != null
  const hasLocations = locations != null && locations.length > 0

  // Age bar data
  const ageData = hasDemographics
    ? Object.entries(demographics.age_groups).map(([key, value]) => ({
        group: key,
        pct: value,
      }))
    : []

  // Gender pie data
  const genderData = hasDemographics
    ? [
        { name: 'Man', value: demographics.gender.male, color: '#7c3aed' },
        { name: 'Kvinna', value: demographics.gender.female, color: '#ec4899' },
        {
          name: 'Icke-binär',
          value: demographics.gender.nonbinary,
          color: '#06b6d4',
        },
      ].filter((d) => d.value > 0)
    : []

  // Top countries sorted
  const sortedLocations = hasLocations
    ? [...locations].sort((a, b) => b.listeners - a.listeners)
    : []

  const maxListeners = sortedLocations[0]?.listeners ?? 1

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-100 mb-4">Demografiöversikt</h2>

      {!hasDemographics && !hasLocations ? (
        <div className="card text-center py-10 text-slate-500">
          <div className="text-3xl mb-2">👥</div>
          <p className="mb-2">Ingen demografidata ännu</p>
          <p className="text-sm">
            Ladda upp en skärmdump från Spotify for Artists (audience-vyn eller location-vyn)
            under "Data → Skärmdump" för att se demografidata här.
          </p>
        </div>
      ) : null}

      {hasDemographics && (
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {/* Gender donut */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              Könsfördelning
            </h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {genderData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {genderData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full"
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

          {/* Age bars */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              Åldersfördelning
            </h3>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={ageData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a42" />
                <XAxis
                  dataKey="group"
                  tick={{ fontSize: 9, fill: '#64748b' }}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1c1c2e',
                    border: '1px solid #2a2a42',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(v: number) => [`${v}%`, 'Andel']}
                />
                <Bar dataKey="pct" fill="#7c3aed" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Locations */}
      {hasLocations && (
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            Toppmarknader
          </h3>
          <div className="space-y-2">
            {sortedLocations.map((loc) => {
              const isHighRisk = HIGH_RISK_COUNTRIES.has(loc.country)
              const pct = (loc.listeners / maxListeners) * 100

              return (
                <div key={loc.country}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300">{loc.country}</span>
                      {isHighRisk && (
                        <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">
                          ⚠ Riskmarknad
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 tabular-nums">
                      <span>{loc.listeners.toLocaleString('sv-SE')} lyssnare</span>
                      {loc.streams_pct > 0 && (
                        <span className="text-slate-500">{loc.streams_pct}%</span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isHighRisk ? 'bg-red-500/60' : 'bg-violet-500/70'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bot traffic warning */}
      {hasLocations && (() => {
        const suspicious = sortedLocations.filter(
          (loc) => HIGH_RISK_COUNTRIES.has(loc.country) && loc.streams_pct > 70,
        )
        return suspicious.length > 0 ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-2">
              <span className="text-red-400 text-lg shrink-0">⚠</span>
              <div>
                <h3 className="font-semibold text-red-400 mb-1">
                  Möjlig bottrafik detekterad
                </h3>
                <p className="text-red-300/80 text-sm">
                  Följande länder har hög streams-andel (&gt;70%) och är kända högriskmarknader:{' '}
                  {suspicious.map((l) => l.country).join(', ')}
                </p>
              </div>
            </div>
          </div>
        ) : null
      })()}

      {/* Songs listener-to-stream ratios */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          Streams per lyssnare — alla låtar
        </h3>
        <div className="space-y-2">
          {[...songs]
            .sort(
              (a, b) =>
                (b.streams_per_listener ?? 0) - (a.streams_per_listener ?? 0),
            )
            .map((song) => {
              const spl = song.streams_per_listener ?? 0
              const isGood = spl >= 2
              return (
                <div key={song.id} className="flex items-center gap-3">
                  <span className="text-sm text-slate-300 w-36 truncate shrink-0">
                    {song.title}
                  </span>
                  <div className="flex-1 h-2 bg-bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isGood ? 'bg-emerald-500' : 'bg-slate-600'}`}
                      style={{ width: `${Math.min((spl / 3) * 100, 100)}%` }}
                    />
                  </div>
                  <span
                    className={`text-sm font-medium tabular-nums w-10 text-right ${isGood ? 'text-emerald-400' : 'text-slate-400'}`}
                  >
                    {spl.toFixed(2)}
                  </span>
                </div>
              )
            })}
        </div>
        <p className="text-xs text-slate-600 mt-2">
          Mål: &gt;2.0 = sticky låt (folk lyssnar om)
        </p>
      </div>
    </div>
  )
}
