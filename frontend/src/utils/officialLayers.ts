import type { District } from '../types'

const round1 = (n: number) => Math.round(n * 10) / 10

/** Share of adults using formal financial services (bank + other formal), from FinScope 2024. */
export function formalAccessPct(d: District): number | null {
  const f = d.financialAccess
  if (f && f.bankedPct != null && f.otherFormalPct != null) return round1(f.bankedPct + f.otherFormalPct)
  if (d.financialAccessRate != null && d.accessSource === 'finscope') return round1(d.financialAccessRate)
  return null
}

/** Share of adults WITHOUT formal financial access. This drives "Where support is missing". */
export function accessGapPct(d: District): number | null {
  const formal = formalAccessPct(d)
  return formal === null ? null : round1(Math.min(100, Math.max(0, 100 - formal)))
}

export type DoubleClass = 'both' | 'one' | 'none'

/** Poor and left out: both official flags, one flag, or neither. Null if no financial data. */
export function doubleClass(d: District): DoubleClass | null {
  if (accessGapPct(d) === null) return null
  const finance = !!d.doubleExclusionFlag
  const services = !!d.highPovertyLowAccess
  if (finance && services) return 'both'
  return finance || services ? 'one' : 'none'
}

/** Population-weighted national gap across the districts that have data. */
export function weightedAccessGap(list: District[]): number | null {
  let w = 0
  let s = 0
  for (const d of list) {
    const g = accessGapPct(d)
    if (g !== null && d.population > 0) {
      s += g * d.population
      w += d.population
    }
  }
  return w > 0 ? round1(s / w) : null
}