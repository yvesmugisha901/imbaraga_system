export type RiskLevel = 'Low' | 'Medium' | 'High'

export interface District {
  code: string
  nameEn: string
  nameRw: string | null
  province: string
  population: number
  densityPerKm2: number | null
  urbanPct: number | null
  povertyRate: number | null
  povertyRateSource: 'province_eicv7' | 'microdata' | 'modelled'
  financialAccessRate: number | null
  accessSource: 'pending' | 'finscope' | 'modelled'
  exclusionGap: number | null
  riskScore: number | null
  doubleExclusionFlag: boolean
}

export interface Kpis {
  povertyPct: number
  povertySource: string
  exclusionPct: number | null
  highRiskDistrictCount: number | null
  householdsScored: number
}