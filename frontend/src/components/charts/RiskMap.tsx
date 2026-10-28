import { useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { buildShapes, matchDistricts, riskColor, type GeoCollection } from '../../utils/geo'
import { accessGapPct, doubleClass, type DoubleClass } from '../../utils/officialLayers'
import type { DistrictVulnerability } from '../../api/vulnerability'
import type { District } from '../../types'

export type RiskLayer = 'poverty' | 'vulnerability' | 'access' | 'double'

interface Props {
  geo: GeoCollection
  districts: District[]
  layer: RiskLayer
  lang: 'en' | 'rw'
  activeCode: string | null
  onHover: (code: string | null) => void
  onSelect: (code: string | null) => void
  vuln?: Record<string, DistrictVulnerability> | null
}

const W = 520
const H = 460
const NO_DATA = '#e2e8f0'
const DOUBLE_FILL: Record<DoubleClass, string> = { both: '#b91c1c', one: '#f59e0b', none: '#cbd5e1' }

export default function RiskMap({ geo, districts, layer, lang, activeCode, onHover, onSelect, vuln }: Props) {
  const { t } = useTranslation()
  const shapes = useMemo(() => buildShapes(geo, W, H), [geo])
  const match = useMemo(() => matchDistricts(shapes.map((s) => s.name), districts), [shapes, districts])
  const byCode = useMemo(() => new Map(districts.map((d) => [d.code, d])), [districts])
  const [tip, setTip] = useState<{ code: string; x: number; y: number } | null>(null)

  const codeAt = useMemo(() => {
    const m = new Map<number, string>()
    match.byCode.forEach((idx, code) => m.set(idx, code))
    return m
  }, [match])

  // Number shown for a district on continuous layers; null when unknown.
  const valueOf = (d: District): number | null => {
    if (layer === 'poverty') return d.povertyRate ?? null
    if (layer === 'access') return accessGapPct(d)
    if (layer === 'vulnerability') {
      const v = vuln?.[d.code]
      return v ? Math.round(v.share_exposed * 100) : null
    }
    return null
  }

  const range = useMemo(() => {
    if (layer === 'double') return null
    const vals = districts.map((d) => valueOf(d)).filter((v): v is number => v !== null)
    return vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districts, layer, vuln])

  const fillFor = (d: District | undefined): string => {
    if (!d) return NO_DATA
    if (layer === 'double') {
      const c = doubleClass(d)
      return c ? DOUBLE_FILL[c] : NO_DATA
    }
    const v = valueOf(d)
    if (v === null || !range) return NO_DATA
    return riskColor(range.max === range.min ? 0.5 : (v - range.min) / (range.max - range.min))
  }

  const classLabel = (c: DoubleClass | null): string => {
    if (c === 'both') return t('map.double.both', 'Poor, low services and financially excluded')
    if (c === 'one') return t('map.double.one', 'Poor and flagged on one measure')
    if (c === 'none') return t('map.double.none', 'Not flagged')
    return t('dashboard.pending')
  }

  const describe = (d: District): string => {
    if (layer === 'double') return classLabel(doubleClass(d))
    const v = valueOf(d)
    if (v === null) return t('dashboard.pending')
    if (layer === 'access') return t('map.tip.access', { defaultValue: '{{v}}% of adults without formal financial services', v })
    if (layer === 'vulnerability') return t('map.tip.vuln', { defaultValue: '{{v}}% close to poverty (demo)', v })
    return t('map.tip.poverty', { defaultValue: '{{v}}% of people in poverty', v })
  }

  const onKey = (e: KeyboardEvent, code: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(code)
    }
  }

  const move = (e: MouseEvent, code: string) => {
    const box = (e.currentTarget as SVGElement).ownerSVGElement?.parentElement?.getBoundingClientRect()
    if (box) setTip({ code, x: e.clientX - box.left, y: e.clientY - box.top })
  }

  const tipDistrict = tip ? byCode.get(tip.code) : undefined
  const noDataCount = districts.filter((d) => (layer === 'double' ? doubleClass(d) === null : valueOf(d) === null)).length

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label={t('map.aria')}>
          {shapes.map((s) => {
            const code = codeAt.get(s.index)
            const d = code ? byCode.get(code) : undefined
            const name = d ? (lang === 'rw' && d.nameRw ? d.nameRw : d.nameEn) : s.name ?? ''
            const active = code !== undefined && code === activeCode
            return (
              <path
                key={s.index}
                d={s.d}
                fill={fillFor(d)}
                stroke={active ? '#0f172a' : '#ffffff'}
                strokeWidth={active ? 2.5 : 0.8}
                strokeLinejoin="round"
                tabIndex={code ? 0 : -1}
                role={code ? 'button' : undefined}
                aria-label={d ? `${name}: ${describe(d)}` : undefined}
                onMouseEnter={(e) => {
                  if (code) {
                    onHover(code)
                    move(e, code)
                  }
                }}
                onMouseMove={(e) => code && move(e, code)}
                onMouseLeave={() => {
                  onHover(null)
                  setTip(null)
                }}
                onFocus={() => code && onHover(code)}
                onBlur={() => onHover(null)}
                onClick={() => code && onSelect(code === activeCode ? null : code)}
                onKeyDown={(e) => code && onKey(e, code)}
                style={{ cursor: code ? 'pointer' : 'default', outline: 'none', transition: 'fill 150ms' }}
              />
            )
          })}
        </svg>

        {tip && tipDistrict && (
          <div
            role="presentation"
            className="pointer-events-none absolute z-10 max-w-[14rem] rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: Math.min(tip.x + 12, 280), top: Math.max(tip.y - 8, 0) }}
          >
            <div className="font-semibold">{lang === 'rw' && tipDistrict.nameRw ? tipDistrict.nameRw : tipDistrict.nameEn}</div>
            <div className="mt-0.5 text-slate-200">{describe(tipDistrict)}</div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
        {layer === 'double' ? (
          <>
            {(['both', 'one', 'none'] as DoubleClass[]).map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: DOUBLE_FILL[c] }} />
                {classLabel(c)}
              </span>
            ))}
          </>
        ) : range ? (
          <div className="flex items-center gap-2">
            <span className="tabular-nums">{range.min}%</span>
            <span aria-hidden="true" className="h-2.5 w-32 rounded" style={{ background: `linear-gradient(to right, ${riskColor(0)}, ${riskColor(0.5)}, ${riskColor(1)})` }} />
            <span className="tabular-nums">{range.max}%</span>
            <span className="text-slate-500">
              {layer === 'access' && t('map.legend.access', 'of adults without formal financial services')}
              {layer === 'poverty' && t('map.legend.poverty', 'of people in poverty')}
              {layer === 'vulnerability' && t('map.vulnLegend', 'of households poor or at risk')}
            </span>
          </div>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: NO_DATA }} />
          {t('map.noData')}
          {noDataCount > 0 && <span className="text-slate-400">({noDataCount})</span>}
        </span>
      </div>

      {(match.unmatchedFeatures.length > 0 || match.unmatchedDistricts.length > 0) && (
        <p role="status" className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          {t('map.unmatched', { count: match.unmatchedDistricts.length })}
          {match.unmatchedDistricts.length > 0 && ` ${match.unmatchedDistricts.join(', ')}.`}
        </p>
      )}
    </div>
  )
}