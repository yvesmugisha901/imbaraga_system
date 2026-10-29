import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { doubleClass, formalAccessPct, type DoubleClass } from '../../utils/officialLayers'
import type { District, DistrictIndicators } from '../../types'

type Props = { districts: District[]; nameOf: (d: District) => string; onSelect: (code: string) => void }

type Indicator = {
  id: string
  tKey: string
  label: string
  /** Completes "Districts with higher ..." */
  what: string
  unit: '%' | ''
  get: (d: District) => number | null
}

const fromInd = (k: keyof DistrictIndicators) => (d: District) => d.indicators?.[k] ?? null

const INDICATORS: Indicator[] = [
  { id: 'dependency', tKey: 'drivers.dependency', label: 'Dependency ratio', what: 'dependency ratios', unit: '', get: fromInd('dependencyRatio') },
  { id: 'literacy', tKey: 'drivers.literacy', label: 'Youth literacy', what: 'youth literacy', unit: '%', get: fromInd('youthLiteracyPct') },
  { id: 'livestock', tKey: 'drivers.livestock', label: 'No livestock', what: 'shares of households with no livestock', unit: '%', get: fromInd('noLivestockPct') },
  { id: 'neet', tKey: 'drivers.neet', label: 'Youth not in work or school', what: 'shares of youth not in education, employment or training', unit: '%', get: fromInd('neetPct') },
  { id: 'phone', tKey: 'drivers.phone', label: 'Mobile phone', what: 'mobile phone ownership', unit: '%', get: fromInd('mobilePhonePct') },
  { id: 'agri', tKey: 'drivers.agri', label: 'Agricultural work', what: 'shares of workers in agriculture', unit: '%', get: fromInd('agriWorkersPct') },
  { id: 'formal', tKey: 'drivers.formal', label: 'Formal finance', what: 'use of formal financial services', unit: '%', get: formalAccessPct },
  { id: 'sanitation', tKey: 'drivers.sanitation', label: 'Sanitation', what: 'access to improved sanitation', unit: '%', get: fromInd('improvedSanitationPct') },
  { id: 'water', tKey: 'drivers.water', label: 'Drinking water', what: 'access to improved drinking water', unit: '%', get: fromInd('improvedWaterPct') },
  { id: 'electricity', tKey: 'drivers.electricity', label: 'Electricity', what: 'access to electricity', unit: '%', get: fromInd('electricityPct') },
  { id: 'land', tKey: 'drivers.land', label: 'Small landholdings', what: 'shares of households with under 0.5 ha of land', unit: '%', get: fromInd('landBelowHalfHaPct') },
]

const FILL: Record<DoubleClass | 'null', string> = { both: '#b91c1c', one: '#f59e0b', none: '#94a3b8', null: '#94a3b8' }

const ranks = (xs: number[]): number[] => {
  const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0])
  const out = new Array<number>(xs.length)
  for (let i = 0; i < idx.length; ) {
    let j = i
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++
    const r = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) out[idx[k][1]] = r
    i = j + 1
  }
  return out
}
const pearson = (a: number[], b: number[]) => {
  const n = a.length
  const ma = a.reduce((s, v) => s + v, 0) / n
  const mb = b.reduce((s, v) => s + v, 0) / n
  let sab = 0, saa = 0, sbb = 0
  for (let i = 0; i < n; i++) {
    sab += (a[i] - ma) * (b[i] - mb)
    saa += (a[i] - ma) ** 2
    sbb += (b[i] - mb) ** 2
  }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0
}
const spearman = (x: number[], y: number[]) => pearson(ranks(x), ranks(y))

const W = 560
const H = 340
const M = { l: 48, r: 16, t: 14, b: 46 }
const minus = '\u2212'
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'

/** Poverty against one living-condition indicator, one dot per district. Official figures only. */
export default function DriversChart({ districts, nameOf, onSelect }: Props) {
  const { t } = useTranslation()

  const stats = useMemo(
    () =>
      INDICATORS.map((ind) => {
        const pts = districts
          .map((d) => ({ d, x: ind.get(d), y: d.povertyRate }))
          .filter((p): p is { d: District; x: number; y: number } => p.x !== null && p.y !== null && p.y !== undefined)
        const r = pts.length > 4 ? spearman(pts.map((p) => p.x), pts.map((p) => p.y)) : 0
        return { ind, pts, r }
      }).filter((s) => s.pts.length > 4),
    [districts],
  )

  const strongest = useMemo(() => stats.reduce((best, s) => (Math.abs(s.r) > Math.abs(best?.r ?? -1) ? s : best), stats[0])?.ind.id, [stats])
  const [pick, setPick] = useState<string | null>(null)
  const current = stats.find((s) => s.ind.id === (pick ?? strongest)) ?? stats[0]
  if (!current) return null

  const { ind, pts, r } = current
  const xs = pts.map((p) => p.x)
  const x0 = Math.floor(Math.min(...xs) / 5) * 5
  const x1 = Math.ceil(Math.max(...xs) / 5) * 5 || x0 + 5
  const y1 = Math.ceil(Math.max(...pts.map((p) => p.y)) / 10) * 10
  const sx = (v: number) => M.l + ((v - x0) / (x1 - x0)) * (W - M.l - M.r)
  const sy = (v: number) => H - M.b - (v / y1) * (H - M.t - M.b)
  const xTicks = Array.from({ length: 5 }, (_, i) => x0 + ((x1 - x0) * i) / 4)
  const yTicks = Array.from({ length: y1 / 10 + 1 }, (_, i) => i * 10)

  // least-squares line, drawn faint, to show the direction of the pattern
  const mx = xs.reduce((s, v) => s + v, 0) / xs.length
  const my = pts.reduce((s, p) => s + p.y, 0) / pts.length
  const sxx = xs.reduce((s, v) => s + (v - mx) ** 2, 0)
  const slope = sxx ? pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / sxx : 0
  const lineY = (x: number) => Math.min(y1, Math.max(0, my + slope * (x - mx)))

  const abs = Math.abs(r)
  const strength = abs >= 0.6 ? t('drivers.strong', 'strong') : abs >= 0.3 ? t('drivers.moderate', 'moderate') : t('drivers.weak', 'weak')
  const fmtR = `${r < 0 ? minus : '+'}${abs.toFixed(2)}`
  const unit = ind.unit

  return (
    <div>
      <div role="group" aria-label={t('drivers.pick', 'Choose an indicator')} className="flex flex-wrap gap-2">
        {stats.map((s) => {
          const on = s.ind.id === current.ind.id
          return (
            <button
              key={s.ind.id}
              type="button"
              aria-pressed={on}
              onClick={() => setPick(s.ind.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${focus} ${
                on ? 'border-emerald-600 bg-emerald-50 font-medium text-emerald-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {t(s.ind.tKey, s.ind.label)}
              <span className={`text-xs tabular-nums ${on ? 'text-emerald-700' : 'text-slate-400'}`}>
                {s.r < 0 ? minus : '+'}
                {Math.abs(s.r).toFixed(2)}
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-4 max-w-3xl text-sm text-slate-700" aria-live="polite">
        {abs < 0.2
          ? t('drivers.none', { defaultValue: 'No clear pattern links {{what}} to district poverty.', what: ind.what })
          : t('drivers.sentence', {
              defaultValue: 'Districts with higher {{what}} tend to have {{dir}} poverty ({{strength}} link, rank correlation {{r}}).',
              what: ind.what,
              dir: r < 0 ? t('drivers.lower', 'lower') : t('drivers.higher', 'higher'),
              strength,
              r: fmtR,
            })}
      </p>

      <div className="mt-3 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[30rem]" role="group" aria-label={t('drivers.chartLabel', 'Poverty against the chosen indicator, one dot per district')}>
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke="#e2e8f0" />
              <text x={M.l - 8} y={sy(v) + 4} textAnchor="end" fontSize="11" fill="#64748b">{v}</text>
            </g>
          ))}
          {xTicks.map((v) => (
            <text key={v} x={sx(v)} y={H - M.b + 18} textAnchor="middle" fontSize="11" fill="#64748b">{Math.round(v)}{unit}</text>
          ))}
          <text x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle" fontSize="12" fill="#334155">{t(ind.tKey, ind.label)}</text>
          <text transform={`translate(12 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="#334155">{t('drivers.y', 'People in poverty (%)')}</text>
          <line x1={sx(x0)} x2={sx(x1)} y1={sy(lineY(x0))} y2={sy(lineY(x1))} stroke="#94a3b8" strokeDasharray="5 4" strokeWidth="1.5" />
          {pts.map((p) => {
            const c = doubleClass(p.d)
            const flagged = c === 'both'
            const label = `${nameOf(p.d)}: ${t(ind.tKey, ind.label)} ${Math.round(p.x)}${unit}, ${t('drivers.poverty', 'poverty')} ${p.y.toFixed(1)}%`
            return (
              <g
                key={p.d.code}
                role="button"
                tabIndex={0}
                aria-label={label}
                style={{ cursor: 'pointer', outline: 'none' }}
                onClick={() => onSelect(p.d.code)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(p.d.code)
                  }
                }}
              >
                <title>{label}</title>
                <circle cx={sx(p.x)} cy={sy(p.y)} r={flagged ? 7 : 6} fill={FILL[c ?? 'null']} fillOpacity={0.9} stroke="#fff" strokeWidth="1.5" />
                {(flagged || p.y === Math.max(...pts.map((q) => q.y))) && (
                  <text x={sx(p.x) + 9} y={sy(p.y) - 8} fontSize="11" fill="#0f172a" stroke="#fff" strokeWidth="3" paintOrder="stroke">{nameOf(p.d)}</text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
        {(['both', 'one', 'none'] as const).map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full" style={{ background: FILL[c] }} />
            {c === 'both' ? t('drivers.legend.both', 'Flagged on both measures') : c === 'one' ? t('drivers.legend.one', 'Flagged on one measure') : t('drivers.legend.none', 'Not flagged')}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {t('drivers.note', 'Each dot is a district. This shows association, not cause, and with 30 districts it is a guide rather than proof. Select a dot to open the district.')}
      </p>
    </div>
  )
}