import type { Song, ScreenshotData } from '../types'

const API_BASE = 'https://api.anthropic.com/v1'
const MODEL = 'claude-sonnet-4-20250514'

async function callAnthropic(
  messages: object[],
  systemPrompt: string,
  apiKey: string,
): Promise<string> {
  const response = await fetch(`${API_BASE}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API-fel (${response.status}): ${err}`)
  }

  const data = (await response.json()) as {
    content: { type: string; text: string }[]
  }
  return data.content[0]?.text ?? ''
}

export async function analyzeScreenshot(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
): Promise<ScreenshotData> {
  const prompt = `Du analyserar en skärmdump från Spotify for Artists.
Extrahera ALL synlig data och returnera ENDAST ett JSON-objekt.
Inga förklaringar, inga kommentarer, bara JSON.

För songs-vy, returnera:
{
  "type": "songs",
  "songs": [
    {
      "title": string,
      "streams": number,
      "listeners": number,
      "saves": number,
      "first_released": string
    }
  ]
}

För audience/demographics-vy, returnera:
{
  "type": "demographics",
  "gender": { "male": number, "female": number, "nonbinary": number },
  "age_groups": { "under18": number, "18-24": number, "25-34": number, "35-44": number, "45-54": number, "55-64": number, "65plus": number }
}

För location-vy, returnera:
{
  "type": "location",
  "countries": [
    { "country": string, "listeners": number, "streams_pct": number }
  ]
}

För enskild låt source-vy (programmerat/aktivt), returnera:
{
  "type": "song_sources",
  "song_title": string,
  "programmed_pct": number,
  "active_pct": number
}`

  const text = await callAnthropic(
    [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: imageBase64,
            },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
    'Du är ett precist data-extraheringsverktyg. Returnera alltid och bara valid JSON.',
    apiKey,
  )

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Kunde inte parsa JSON från API-svaret')
  return JSON.parse(jsonMatch[0]) as ScreenshotData
}

const SYSTEM_PROMPT = `Du är musikmarknadsföringsanalytiker specialiserad på oberoende rock/metal-band.
Du analyserar Spotify for Artists-data för We Are The Catalyst, ett svenskt alternative metal-band.

Band-kontext:
- Grundat 2012, frontat av Cat Fey
- Genre: Alternative metal / atmospheric rock
- Primär demografigrupp: män 25–44
- Starkaste marknader: USA, Tyskland, UK, Frankrike
- Jämförbara artister: Evanescence, Within Temptation, Paramore, Spiritbox
- Emotionella/atmosfäriska låtar presterar bättre algoritmiskt än raka rocklåtar
- Kör Spotify-annonser och Meta-annonser parallellt
- Helt oberoende band, ingen label

Nyckelsignaler att tolka:
- Programmerad % > 55% = algoritmen sprider låten organiskt, stark signal
- Saves-ratio > 3% = publiken konverterar till riktiga fans
- Streams per lyssnare > 2.0 = sticky låt, folk återkommer
- Hög aktiv % + hög volym = djupa fans, bra för live
- Hög prog% + fallande trend = algoritmen testar men publiken engagerar sig mindre
- Hög aktiv% + låg prog% = driven av befintliga fans/annonser, inte organisk tillväxt

Var konkret och kortfattad. Ge alltid ett tydligt handlingsrekommendation. Svara på svenska.`

export async function analyzeSong(
  song: Song,
  allSongs: Song[],
  apiKey: string,
): Promise<string> {
  const catalogAvg = {
    streams: Math.round(
      allSongs.reduce((s, x) => s + x.streams_28d, 0) / allSongs.length,
    ),
    savesRatio:
      Math.round(
        (allSongs.reduce(
          (s, x) => s + (x.saves / x.streams_28d) * 100,
          0,
        ) /
          allSongs.length) *
          10,
      ) / 10,
    streamsPerListener:
      Math.round(
        (allSongs.reduce(
          (s, x) => s + x.streams_28d / x.listeners,
          0,
        ) /
          allSongs.length) *
          100,
      ) / 100,
  }

  const songData = `
Låt: ${song.title}
Streams (28d): ${song.streams_28d.toLocaleString('sv-SE')}
Lyssnare: ${song.listeners.toLocaleString('sv-SE')}
Saves: ${song.saves.toLocaleString('sv-SE')}
Saves-ratio: ${song.saves_ratio?.toFixed(2) ?? 'N/A'}%
Streams per lyssnare: ${song.streams_per_listener?.toFixed(2) ?? 'N/A'}
Programmerad %: ${song.programmed_pct ?? 'okänd'}%
Aktiv %: ${song.active_pct ?? 'okänd'}%
Aktiva streams (abs): ${song.active_streams_abs?.toLocaleString('sv-SE') ?? 'N/A'}
Daglig annonsbudget: ${song.daily_budget_sek} kr
Trend: ${song.trend_pct != null ? `${song.trend_pct > 0 ? '+' : ''}${song.trend_pct}%` : 'ingen data'}
Score: ${song.score ?? 'N/A'}/10

Katalogsnitt för jämförelse:
- Snittstreams: ${catalogAvg.streams.toLocaleString('sv-SE')}
- Snitt saves-ratio: ${catalogAvg.savesRatio}%
- Snitt streams/lyssnare: ${catalogAvg.streamsPerListener}
`

  return callAnthropic(
    [
      {
        role: 'user',
        content: `Analysera denna låt och ge mig:
1. Tolkning av signalerna (2–3 meningar)
2. Rekommenderad annonsbudget och målgrupp
3. Varningssignaler (om några)
4. Liverekommendation
5. En konkret handlingsplan (bullet points)

${songData}`,
      },
    ],
    SYSTEM_PROMPT,
    apiKey,
  )
}
