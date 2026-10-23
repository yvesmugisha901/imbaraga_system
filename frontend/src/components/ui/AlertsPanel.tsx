import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { DistrictVulnerability, VulnerabilityData } from '../../api/vulnerability'

// ---- Alert rules: edit these numbers to change when an alert appears ----
// Rules compare each district with the national average, so they stay meaningful if the data changes.
const RULES = {
  highAboveAverage: 0.1, // HIGH: share of families poor or close to poverty is 10+ points above average
  watchAboveAverage: 0.04, // WATCH: share close to falling into poverty is 4+ points above average
  maxAlerts: 6,
}

type Level = 'high' | 'watch'
interface Alert {
  d: DistrictVulnerability
  level: Level
}

interface Props {
  data: VulnerabilityData
  nameFor: (code: string, fallback: string) => string
  onSelect?: (code: string) => void
}

const inTen = (share: number) => Math.round(share * 10)
const pct = (share: number) => `${Math.round(share * 100)}%`

export default function AlertsPanel({ data, nameFor, onSelect }: Props) {
  const { t } = useTranslation()

  const { alerts, avgExposed } = useMemo(() => {
    const rows = data.districts
    const total = rows.reduce((s, d) => s + d.households, 0) || 1
    const avgExposed = rows.reduce((s, d) => s + d.households * d.share_exposed, 0) / total
    const avgAtRisk = rows.reduce((s, d) => s + d.households * d.share_at_risk, 0) / total

    const found: Alert[] = []
    for (const d of rows) {
      if (d.share_exposed >= avgExposed + RULES.highAboveAverage) found.push({ d, level: 'high' })
      else if (d.share_at_risk >= avgAtRisk + RULES.watchAboveAverage) found.push({ d, level: 'watch' })
    }
    found.sort((a, b) => (a.level === b.level ? b.d.share_exposed - a.d.share_exposed : a.level === 'high' ? -1 : 1))
    return { alerts: found.slice(0, RULES.maxAlerts), avgExposed }
  }, [data])

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="alerts-title">
      <h2 id="alerts-title" className="text-lg font-semibold text-slate-900">
        {t('home.alerts.title', 'Early warnings')}
      </h2>
      <p className="mb-3 text-sm text-slate-600">
        {t('home.alerts.subtitle', 'Districts where more families than usual are poor or close to falling into poverty, so help can start early.')}
      </p>

      {alerts.length === 0 ? (
        <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          {t('home.alerts.none', 'No district stands out from the national average right now.')}
        </p>
      ) : (
        <ul className="space-y-3">
          {alerts.map(({ d, level }) => {
            const name = nameFor(d.district_code, d.district_name_en ?? d.district_code)
            const high = level === 'high'
            return (
              <li
                key={d.district_code}
                className={`rounded-lg border border-l-4 border-slate-200 bg-white p-4 text-sm text-slate-700 ${high ? 'border-l-red-600' : 'border-l-amber-500'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-slate-900">
                    {name}
                    {d.province ? <span className="ml-2 font-normal opacity-70">{d.province}</span> : null}
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${high ? 'border-red-200 text-red-800' : 'border-amber-200 text-amber-800'}`}>
                    {high ? t('home.alerts.high', 'Act soon') : t('home.alerts.watch', 'Keep watching')}
                  </span>
                </div>

                <p className="mt-1">
                  {high
                    ? t('home.alerts.reasonHigh', {
                        tenth: inTen(d.share_exposed),
                        pct: pct(d.share_exposed),
                        avg: pct(avgExposed),
                        defaultValue:
                          'About {{tenth}} in 10 families here are poor or close to poverty ({{pct}}). The national average is {{avg}}.',
                      })
                    : t('home.alerts.reasonWatch', {
                        pct: pct(d.share_at_risk),
                        defaultValue: 'About {{pct}} of families are one setback away from poverty, more than in most districts.',
                      })}
                </p>

                <p className="mt-2">
                  <span className="font-medium">{t('home.alerts.suggest', 'Suggested next steps:')}</span>{' '}
                  {high
                    ? t('home.alerts.stepsHigh', 'Plan home visits to confirm which families need support, and consider temporary work, food or cash help. Check health insurance enrolment.')
                    : t('home.alerts.stepsWatch', 'Encourage savings groups and health insurance enrolment, and review this district again next quarter.')}
                </p>

                {onSelect && (
                  <button
                    type="button"
                    onClick={() => onSelect(d.district_code)}
                    className="mt-3 text-sm font-medium text-emerald-800 underline underline-offset-2"
                  >
                    {t('home.alerts.show', 'Show on the map')}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-3 text-xs text-slate-500">
        {t(
          'home.alerts.limit',
          'These warnings use demonstration data. Weather, food price and other shock alerts are not connected yet, and a person should confirm every warning before acting.',
        )}
      </p>
    </section>
  )
}