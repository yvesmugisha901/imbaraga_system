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

export interface Bilingual {
  en: string
  rw: string
}

export interface Driver {
  feature: string
  label: Bilingual
  value: number | string
  shap: number
  direction: 'raises' | 'lowers'
  sentence: Bilingual
}

export interface ScoredHousehold {
  id: string
  districtCode: string | null
  probability: number
  riskLevel: RiskLevel
  rank: number
  drivers: Driver[]
  protective: Driver | null
}

export interface ScoreResponse {
  batchId: number
  modelVersion: string
  isMock: boolean
  count: number
  summary: Record<RiskLevel, number>
  results: ScoredHousehold[]
}

export interface ApiErrorDetail {
  row: number
  field: string
  message: string
  text: string
}