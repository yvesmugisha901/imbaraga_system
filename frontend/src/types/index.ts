export type RiskLevel = 'Low' | 'Medium' | 'High'

/** Official NISR EICV7 (2023/24) district indicators, all in percent unless noted. */
export interface DistrictIndicators {
  dependencyRatio: number | null
  econDependency: number | null
  agriWorkersPct: number | null
  noLivestockPct: number | null
  landBelowHalfHaPct: number | null
  neetPct: number | null
  youthLiteracyPct: number | null
  improvedWaterPct: number | null
  improvedSanitationPct: number | null
  electricityPct: number | null
  mobilePhonePct: number | null
  smartphonePct: number | null
  cementFloorPct: number | null
}

/** FinScope 2024 financial access strand, % of adults 16+. Rounded, so rows can sum to 99-101. */
export interface DistrictFinancialAccess {
  bankedPct: number | null
  otherFormalPct: number | null
  informalOnlyPct: number | null
  excludedPct: number | null
}

export interface District {
  code: string
  nameEn: string
  nameRw: string | null
  province: string
  population: number
  densityPerKm2: number | null
  urbanPct: number | null
  povertyRate: number | null
  povertyRateSource: 'province_eicv7' | 'official_eicv7' | 'microdata' | 'modelled'
  financialAccessRate: number | null
  accessSource: 'pending' | 'finscope' | 'modelled'
  exclusionGap: number | null
  riskScore: number | null
  doubleExclusionFlag: boolean

  // Official data layer. Optional so older mocks and tests that build a District still compile.
  povertyRateModelled?: number | null
  povertyEicv5?: number | null
  povertyChangePoints?: number | null
  rankOfficial?: number | null
  accessIndex?: number | null
  highPovertyLowAccess?: boolean
  financialAccess?: DistrictFinancialAccess
  indicators?: DistrictIndicators
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