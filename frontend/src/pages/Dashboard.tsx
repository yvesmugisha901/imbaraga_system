import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useDistricts, useGeoJson, useKpis } from '../api/hooks'
import { useVulnerability } from '../api/useVulnerability'
import ErrorState from '../components/ui/ErrorState'
import AlertsPanel from '../components/ui/AlertsPanel'
import DistrictTable from '../components/ui/DistrictTable'
import RiskMap, { type RiskLayer } from '../components/charts/RiskMap'
import type { District } from '../types'

type Tab = 'map' | 'alerts' | 'districts'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
      <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-slate-400">
        <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 3.5a1 1 0 110 2 1 1 0 010-2zM9 9h2v6H9V9z" />
      </svg>
      <span>{children}</span>
    </p>
  )
}

function Stat({ label, value, note, loading, pending }: { label: string; value: string | null; note?: string; loading: boolean; pending: string }) {
  return (
    <div className="bg-white px-5 py-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
        {loading ? <span className="block h-9 w-20 animate-pulse rounded bg-slate-200" /> : value ?? <span className="text-xl font-normal text-slate-400">{pending}</span>}
      </dd>
      {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const lang: 'en' | 'rw' = i18n.language === 'rw' ? 'rw' : 'en'
  const kpis = useKpis()
  const districts = useDistricts()
  const geo = useGeoJson()
  const vuln = useVulnerability()
  const fmt = new Intl.NumberFormat(lang === 'rw' ? 'en-RW' : 'en-US')
  const pending = t('dashboard.pending')

  const [tab, setTab] = useState<Tab>('map')
  const [layer, setLayer] = useState<RiskLayer>('poverty')
  const [hover, setHover] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const list = districts.data ?? []
  const sorted = useMemo(() => [...list].sort((a, b) => (b.povertyRate ?? 0) - (a.povertyRate ?? 0)), [list])
  const maxPoverty = sorted[0]?.povertyRate ?? 1
  const accessAvailable = list.some((d) => d.exclusionGap !== null)
  const nameOf = (d: District) => (lang === 'rw' && d.nameRw ? d.nameRw : d.nameEn)

  const activeCode = hover ?? selected
  const active = list.find((d) => d.code === activeCode)
  const activeVuln = active ? vuln.byCode?.[active.code] : undefined

  const topAtRisk = useMemo(() => {
    if (!vuln.data) return null
    return vuln.data.districts
      .slice(0, 3)
      .map((v) => {
        const d = list.find((x) => x.code === v.district_code)
        return d ? nameOf(d) : v.district_name_en ?? v.district_code
      })
      .join(', ')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vuln.data, list, lang])

  const showOnMap = (code: string, nextLayer?: RiskLayer) => {
    setSelected(code)
    if (nextLayer) setLayer(nextLayer)
    setTab('map')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const layers: { key: RiskLayer; label: string; enabled: boolean }[] = [
    { key: 'poverty', label: t('home.layer.poverty', 'Where poverty is highest'), enabled: true },
    { key: 'vulnerability', label: t('home.layer.vulnerability', 'Families close to poverty'), enabled: vuln.byCode !== null },
    { key: 'access', label: t('home.layer.access', 'Where support is missing'), enabled: accessAvailable },
    { key: 'double', label: t('home.layer.double', 'Poor and left out'), enabled: accessAvailable },
  ]

  const tabs: { key: Tab; label: string; enabled: boolean }[] = [
    { key: 'map', label: t('home.tab.map', 'Map'), enabled: true },
    { key: 'alerts', label: t('home.tab.alerts', 'Early warnings'), enabled: vuln.data !== null },
    { key: 'districts', label: t('home.tab.districts', 'All districts'), enabled: true },
  ]

  const panel = 'rounded-xl border border-slate-200 bg-white p-5'

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{t('home.title', 'Where is help needed most?')}</h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">
            {t('home.subtitle', 'See which districts have the most families in need, and which are close to falling into poverty.')}
          </p>
        </div>
        {topAtRisk && (
          <div className="border-l-4 border-emerald-700 bg-white py-3 pl-4 pr-4">
            <p className="text-base text-slate-900">
              {t('home.topAtRisk', {
                names: topAtRisk,
                defaultValue: 'Most families who are poor or close to poverty live in: {{names}}.',
              })}
            </p>
            <p className="mt-1 text-xs text-slate-500">{t('home.topAtRiskNote', 'Based on demonstration data. Always confirm with a home visit.')}</p>
          </div>
        )}
        <details className="text-sm text-slate-600">
          <summary className={`inline-block cursor-pointer rounded font-medium text-emerald-800 ${focus}`}>{t('home.guide.title', 'How to use this page')}</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>{t('home.guide.one', 'The four numbers give the big picture.')}</li>
            <li>{t('home.guide.two', 'Use the Map tab to see where need is highest. Tap a district for details.')}</li>
            <li>{t('home.guide.three', 'Use Early warnings to see districts that need attention soon, with suggested next steps.')}</li>
            <li>{t('home.guide.four', 'Use All districts to search, filter and compare every district.')}</li>
          </ol>
        </details>
      </header>

      {kpis.isError ? (
        <ErrorState title={t('dashboard.error')} detail={kpis.error.message} retryLabel={t('dashboard.retry')} onRetry={() => kpis.refetch()} />
      ) : (
        <dl aria-label={t('home.kpi.label', 'Key numbers')} className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          <Stat loading={kpis.isLoading} pending={pending} label={t('home.kpi.poverty', 'Households living in poverty')} value={kpis.data ? `${kpis.data.povertyPct}%` : null} note={kpis.data?.povertySource} />
          <Stat loading={kpis.isLoading} pending={pending} label={t('home.kpi.exclusion', 'Poor families not reached by support')} value={kpis.data?.exclusionPct != null ? `${kpis.data.exclusionPct}%` : null} />
          <Stat loading={kpis.isLoading} pending={pending} label={t('home.kpi.highRisk', 'Districts needing most attention')} value={kpis.data?.highRiskDistrictCount != null ? String(kpis.data.highRiskDistrictCount) : null} />
          <Stat loading={kpis.isLoading} pending={pending} label={t('home.kpi.scored', 'Households checked so far')} value={kpis.data ? fmt.format(kpis.data.householdsScored) : null} />
        </dl>
      )}

      <div>
        <div role="tablist" aria-label={t('home.tab.label', 'Dashboard sections')} className="mb-5 flex gap-6 border-b border-slate-200">
          {tabs.map((x) => (
            <button
              key={x.key}
              id={`tab-${x.key}`}
              role="tab"
              type="button"
              aria-selected={tab === x.key}
              aria-controls={`panel-${x.key}`}
              disabled={!x.enabled}
              onClick={() => setTab(x.key)}
              className={`-mb-px rounded-t border-b-2 pb-3 text-sm font-medium disabled:cursor-not-allowed disabled:text-slate-300 ${focus} ${
                tab === x.key ? 'border-emerald-700 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>

        {tab === 'map' && (
          <section id="panel-map" role="tabpanel" aria-labelledby="tab-map" className={panel}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{t('home.mapTitle', 'Map of Rwanda by district')}</h2>
                <p className="mt-1 text-sm text-slate-500">{t('home.mapHelp', 'Choose what the colours show. Darker means more need.')}</p>
              </div>
              <div role="group" aria-label={t('map.layerLabel')} className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
                {layers.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    disabled={!l.enabled}
                    aria-pressed={layer === l.key}
                    title={l.enabled ? undefined : t('map.layerPending')}
                    onClick={() => setLayer(l.key)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:text-slate-300 ${focus} ${
                      layer === l.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4 space-y-1.5">
              <Note>{t('home.estimateNote', 'These numbers are careful estimates, not exact counts. A home visit should always confirm a family\u2019s situation.')}</Note>
              {layer === 'vulnerability' && (
                <Note>{t('home.vulnNote', 'This view shows families who are poor now or one setback away. It is an early warning to help plan, not a prediction for any single family.')}</Note>
              )}
            </div>

            {districts.isError ? (
              <ErrorState title={t('dashboard.error')} detail={districts.error.message} retryLabel={t('dashboard.retry')} onRetry={() => districts.refetch()} />
            ) : geo.isError ? (
              <ErrorState title={t('map.error')} detail={t('map.errorHint')} retryLabel={t('dashboard.retry')} onRetry={() => geo.refetch()} />
            ) : geo.isLoading || districts.isLoading || !geo.data ? (
              <div className="h-80 animate-pulse rounded-lg bg-slate-100" aria-busy="true" aria-label={t('dashboard.loading')} />
            ) : (
              <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <RiskMap geo={geo.data} districts={list} layer={layer} lang={lang} activeCode={activeCode} onHover={setHover} onSelect={setSelected} vuln={vuln.byCode} />
                </div>

                <div className="space-y-6">
                  <div aria-live="polite" className="min-h-40 rounded-lg border border-slate-200 p-4 text-sm">
                    {active ? (
                      <>
                        <div className="text-base font-semibold text-slate-900">{nameOf(active)}</div>
                        <div className="text-slate-500">{active.province}</div>
                        <dl className="mt-3">
                          {[
                            [t('home.people', 'People living here'), fmt.format(active.population)],
                            [t('home.inPoverty', 'Households in poverty'), active.povertyRate !== null && active.povertyRate !== undefined ? `${active.povertyRate}%` : pending],
                            ...(activeVuln
                              ? [
                                  [t('home.closeToPoverty', 'Close to falling into poverty'), `${Math.round(activeVuln.share_at_risk * 100)}%`],
                                  [t('home.needHelpNow', 'Likely in need now'), `${Math.round(activeVuln.share_poor_now * 100)}%`],
                                ]
                              : []),
                            [t('home.howWeKnow', 'How we know this'), t(`dashboard.source.${active.povertyRateSource}`)],
                          ].map(([k, v]) => (
                            <div key={k} className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
                              <dt className="text-slate-500">{k}</dt>
                              <dd className="text-right font-medium tabular-nums text-slate-900">{v}</dd>
                            </div>
                          ))}
                        </dl>
                      </>
                    ) : (
                      <p className="text-slate-500">{t('home.hint', 'Point at or tap a district to see its details.')}</p>
                    )}
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('home.top5', 'Districts with the most poverty')}</h3>
                    <ol className="space-y-1">
                      {sorted.slice(0, 5).map((d, i) => (
                        <li key={d.code}>
                          <button type="button" onClick={() => setSelected(d.code)} className={`w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50 ${focus}`}>
                            <span className="flex items-center justify-between">
                              <span className="text-slate-800"><span className="mr-2 text-slate-400">{i + 1}</span>{nameOf(d)}</span>
                              <span className="font-medium tabular-nums text-slate-900">{d.povertyRate}%</span>
                            </span>
                            <span className="mt-1.5 block h-1 rounded bg-slate-100">
                              <span className="block h-1 rounded bg-emerald-700" style={{ width: `${((d.povertyRate ?? 0) / maxPoverty) * 100}%` }} />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}
            <p className="mt-4 text-xs text-slate-400">{t('map.attribution')}</p>
          </section>
        )}

        {tab === 'alerts' && vuln.data && (
          <div id="panel-alerts" role="tabpanel" aria-labelledby="tab-alerts">
            <AlertsPanel
              data={vuln.data}
              nameFor={(code, fallback) => {
                const d = list.find((x) => x.code === code)
                return d ? nameOf(d) : fallback
              }}
              onSelect={(code) => showOnMap(code, 'vulnerability')}
            />
          </div>
        )}

        {tab === 'districts' && (
          <section id="panel-districts" role="tabpanel" aria-labelledby="tab-districts" className={panel}>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{t('home.allDistricts', 'All districts')}</h2>
            {districts.isError ? (
              <ErrorState title={t('dashboard.error')} detail={districts.error.message} retryLabel={t('dashboard.retry')} onRetry={() => districts.refetch()} />
            ) : districts.isLoading ? (
              <div className="space-y-2" aria-busy="true" aria-label={t('dashboard.loading')}>
                {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />)}
              </div>
            ) : list.length === 0 ? (
              <p className="text-slate-500">{t('dashboard.noData')}</p>
            ) : (
              <DistrictTable districts={list} lang={lang} vulnByCode={vuln.byCode} onSelect={(code) => showOnMap(code)} />
            )}
          </section>
        )}
      </div>
    </div>
  )
}