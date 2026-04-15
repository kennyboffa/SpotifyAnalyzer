// Shared signal interpretation logic used in Dashboard and SongDetail

export interface Signal {
  label: string
  color: string   // Tailwind text color
  bg: string      // Tailwind bg+border
  tip: string     // Plain-language explanation
}

export function driveSignal(
  progPct: number | null | undefined,
  activePct: number | null | undefined,
  budget: number,
): Signal {
  // What's primarily driving streams?
  if (budget >= 100) {
    return {
      label: '💸 Annonsdriven',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/25',
      tip: 'Majoriteten av streams beror på betald annonsering',
    }
  }
  if (progPct != null && progPct >= 55) {
    return {
      label: '🤖 Algoritm-driven',
      color: 'text-violet-400',
      bg: 'bg-violet-500/10 border-violet-500/25',
      tip: `${progPct}% av streams kommer från Spotifys egna rekommendationer (Discover Weekly, Radio, autoplay)`,
    }
  }
  if (activePct != null && activePct >= 55) {
    return {
      label: '👥 Fans-driven',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/25',
      tip: `${activePct}% av streams är aktiva val — fans söker upp låten eller spelar den från sin playlist`,
    }
  }
  return {
    label: '⚖️ Blandat',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10 border-slate-500/25',
    tip: 'Mix av algoritm och aktiva lyssnare',
  }
}

export function savesSignal(savesRatio: number | undefined): Signal | null {
  if (savesRatio == null) return null
  if (savesRatio >= 3) {
    return {
      label: '💚 Konverterar fans',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/25',
      tip: `${savesRatio.toFixed(1)}% sparar låten — folk gillar den tillräckligt för att lägga den i sin playlist (mål: >3%)`,
    }
  }
  if (savesRatio < 1.5) {
    return {
      label: '💔 Lågt sparande',
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/25',
      tip: `Bara ${savesRatio.toFixed(1)}% sparar låten — lyssnare streamer men väljer inte aktivt att behålla den (mål: >3%)`,
    }
  }
  return null // neutral, don't show chip
}

export function trendSignal(trendPct: number | undefined): Signal | null {
  if (trendPct == null) return null
  if (trendPct > 15) {
    return {
      label: `📈 +${trendPct.toFixed(0)}% trend`,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/25',
      tip: `Låten växer kraftigt — streams ökade ${trendPct.toFixed(1)}% under senaste 28 dagarna`,
    }
  }
  if (trendPct < -10) {
    return {
      label: `📉 ${trendPct.toFixed(0)}% trend`,
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/25',
      tip: `Streams faller — ned ${Math.abs(trendPct).toFixed(1)}% under senaste 28 dagarna`,
    }
  }
  return null
}

export function stickySignal(spl: number | undefined): Signal | null {
  if (spl == null || spl < 2) return null
  return {
    label: '🔄 Lyssnar om',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/25',
    tip: `${spl.toFixed(2)} streams per lyssnare — folk kommer tillbaka och lyssnar flera gånger (mål: >2.0)`,
  }
}

export function scoreLabel(score: number): { text: string; color: string } {
  if (score >= 7.5) return { text: 'Excellent', color: 'text-emerald-400' }
  if (score >= 6.5) return { text: 'Stark', color: 'text-emerald-400' }
  if (score >= 5.5) return { text: 'God', color: 'text-blue-400' }
  if (score >= 4.5) return { text: 'Medel', color: 'text-amber-400' }
  if (score >= 3)   return { text: 'Svag', color: 'text-orange-400' }
  return { text: 'Låg', color: 'text-red-400' }
}
