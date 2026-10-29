import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { VulnerabilityData } from '../../api/vulnerability'

const COLORS = { poor: '#d97706', close: '#fcd34d', stable: '#a7f3d0' }
const pct = (v: number) => `${Math.round(v * 100)}%`

interface Props {
  data: VulnerabilityData
  nameFor: (code: string, fallback: string) => string
  onSelect?: (code: string) => void
}

export default function RiskCharts({ data, nameFor, onSelect }: Props) {
  const { t } = useTranslation()

  const { national, top } = useMemo(() => {
    const rows = data.districts
    const total = rows.reduce((s, d) => s + d.households, 0) || 1
    const w = (k: 'share_poor_now' | 'share_at_risk' | 'share_stable') => rows.reduce((s, d) => s + d.households * d[k], 0) / total
    return {
      national: { poor: w('share_poor_now'), close: w('share_at_risk'), stable: w('share_stable') },
      top: [...rows].sort((a, b) => b.share_exposed - a.share_exposed).slice(0, 10),
    }
  }, [data])

  const labels = {
    poor: t('home.charts.poor', 'Likely poor now'),
    close: t('home.charts.close', 'Close to falling into poverty'),
    stable: t('home.charts.stable', 'Stable'),
  }
  const segs = [
    { key: 'poor' as const, value: national.poor },
    { key: 'close' as const, value: national.close },
    { key: 'stable' as const, value: national.stable },
  ]
  let acc = 0

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">{t('home.charts.title', 'Families by level of need')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('home.charts.subtitle', 'How many families are poor now, close to poverty, or stable.')}</p>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
        {segs.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: COLORS[s.key] }} />
            {labels[s.key]} <span className="font-medium text-slate-900">{pct(s.value)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="mx-auto w-full max-w-[16rem]">
          <svg
            viewBox="0 0 42 42"
            role="img"
            aria-label={`${labels.poor} ${pct(national.poor)}, ${labels.close} ${pct(national.close)}, ${labels.stable} ${pct(national.stable)}`}
          >
            <circle cx="21" cy="21" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="6" />
            {segs.map((s) => {
              const el = (
                <circle
                  key={s.key}
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="none"
                  stroke={COLORS[s.key]}
                  strokeWidth="6"
                  strokeDasharray={`${s.value * 100} ${100 - s.value * 100}`}
                  strokeDashoffset={25 - acc * 100}
                />
              )
              acc += s.value
              return el
            })}
            <text x="21" y="21.5" textAnchor="middle" fontSize="7" fontWeight="600" fill="#0f172a">
              {pct(national.poor + national.close)}
            </text>
            <text x="21" y="26.5" textAnchor="middle" fontSize="2.6" fill="#64748b">
              {t('home.charts.center', 'poor or close to poverty')}
            </text>
          </svg>
        </div>

        <div className="lg:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('home.charts.topTitle', 'Ten districts with the most families in need')}</h3>
          <ol className="space-y-1">
            {top.map((d) => {
              const name = nameFor(d.district_code, d.district_name_en ?? d.district_code)
              return (
                <li key={d.district_code}>
                  <button
                    type="button"
                    onClick={() => onSelect?.(d.district_code)}
                    title={`${labels.poor} ${pct(d.share_poor_now)}, ${labels.close} ${pct(d.share_at_risk)}`}
                    className="grid w-full grid-cols-[7rem_1fr_3rem] items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
                  >
                    <span className="truncate text-slate-800">{name}</span>
                    <span className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                      <span style={{ width: `${d.share_poor_now * 100}%`, background: COLORS.poor }} />
                      <span style={{ width: `${d.share_at_risk * 100}%`, background: COLORS.close }} />
                      <span style={{ width: `${d.share_stable * 100}%`, background: COLORS.stable }} />
                    </span>
                    <span className="text-right font-medium tabular-nums text-slate-900">{pct(d.share_exposed)}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      <p className="mt-5 text-xs text-slate-400">
        {t('home.charts.note', 'Demonstration data. Each bar covers all families in the district. Select a row to see it on the map.')}
      </p>
    </div>
  )
}