import { useMemo, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { buildShapes, matchDistricts, riskColor, type GeoCollection } from '../../utils/geo'
import { layerValue, type MapLayer } from '../../utils/mapLayers'
import type { DistrictVulnerability } from '../../api/vulnerability'
import type { District } from '../../types'

export type RiskLayer = MapLayer | 'vulnerability'

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

const W = 520, H = 460

export default function RiskMap({ geo, districts, layer, lang, activeCode, onHover, onSelect, vuln }: Props) {
  const { t } = useTranslation()
  const shapes = useMemo(() => buildShapes(geo, W, H), [geo])
  const match = useMemo(() => matchDistricts(shapes.map((s) => s.name), districts), [shapes, districts])
  const byCode = useMemo(() => new Map(districts.map((d) => [d.code, d])), [districts])

  const codeAt = useMemo(() => {
    const m = new Map<number, string>()
    match.byCode.forEach((idx, code) => m.set(idx, code))
    return m
  }, [match])

  // Value shown for a district on the current layer (percent), or null if unknown.
  const valueOf = (d: District): number | null => {
    if (layer === 'vulnerability') {
      const v = vuln?.[d.code]
      return v ? Math.round(v.share_exposed * 100) : null
    }
    return layerValue(d, layer)
  }

  const range = useMemo(() => {
    const vals = districts.map((d) => valueOf(d)).filter((v): v is number => v !== null)
    return vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districts, layer, vuln])

  const fillFor = (code: string | undefined): string => {
    const d = code ? byCode.get(code) : undefined
    const v = d ? valueOf(d) : null
    if (v === null || !range) return '#e2e8f0'
    if (layer === 'double') return v === 1 ? '#dc2626' : '#cbd5e1'
    return riskColor(range.max === range.min ? 0.5 : (v - range.min) / (range.max - range.min))
  }

  const onKey = (e: KeyboardEvent, code: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(code)
    }
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label={t('map.aria')}>
        {shapes.map((s) => {
          const code = codeAt.get(s.index)
          const d = code ? byCode.get(code) : undefined
          const v = d ? valueOf(d) : null
          const name = d ? (lang === 'rw' && d.nameRw ? d.nameRw : d.nameEn) : s.name ?? ''
          const active = code !== undefined && code === activeCode
          return (
            <path
              key={s.index}
              d={s.d}
              fill={fillFor(code)}
              stroke={active ? '#0f172a' : '#ffffff'}
              strokeWidth={active ? 2.5 : 0.8}
              strokeLinejoin="round"
              tabIndex={code ? 0 : -1}
              role={code ? 'button' : undefined}
              aria-label={code ? `${name}: ${v === null ? t('dashboard.pending') : layer === 'double' ? (v === 1 ? t('map.flagged') : t('map.notFlagged')) : `${v}%`}` : undefined}
              onMouseEnter={() => code && onHover(code)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => code && onHover(code)}
              onBlur={() => onHover(null)}
              onClick={() => code && onSelect(code === activeCode ? null : code)}
              onKeyDown={(e) => code && onKey(e, code)}
              style={{ cursor: code ? 'pointer' : 'default', outline: 'none' }}
            />
          )
        })}
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
        {range && layer !== 'double' ? (
          <div className="flex items-center gap-2">
            <span className="tabular-nums">{range.min}%</span>
            <span aria-hidden="true" className="h-2.5 w-32 rounded" style={{ background: `linear-gradient(to right, ${riskColor(0)}, ${riskColor(0.5)}, ${riskColor(1)})` }} />
            <span className="tabular-nums">{range.max}%</span>
            {layer === 'vulnerability' && <span>{t('map.vulnLegend', 'of households poor or at risk')}</span>}
          </div>
        ) : layer === 'double' ? (
          <span>■ {t('map.flagged')} &nbsp; <span className="text-slate-400">■</span> {t('map.notFlagged')}</span>
        ) : null}
        <span><span className="text-slate-300">■</span> {t('map.noData')}</span>
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