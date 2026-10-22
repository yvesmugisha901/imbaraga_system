import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDistricts, useGeoJson, useKpis } from '../api/hooks'
import { useVulnerability } from '../api/useVulnerability'
import KpiCard from '../components/ui/KpiCard'
import ErrorState from '../components/ui/ErrorState'
import AlertsPanel from '../components/ui/AlertsPanel'
import DistrictTable from '../components/ui/DistrictTable'
import RiskMap, { type RiskLayer } from '../components/charts/RiskMap'
import type { District } from '../types'

type Tab = 'map' | 'alerts' | 'districts'

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
  const accessAvailable = list.some((d) => d.exclusionGap !== null)
  const nameOf = (d: District) => (lang === 'rw' && d.nameRw ? d.nameRw : d.nameEn)

  const activeCode = hover ?? selected
  const active = list.find((d) => d.code === activeCode)
  const activeVuln = active ? vuln.byCode?.[active.code] : undefined

  // Names of the three districts with the most families poor or close to poverty.
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

  // Jump to the map with one district selected (used by alerts and the district list).
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t('home.title', 'Where is help needed most?')}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t('home.subtitle', 'See which districts have the most families in need, and which are close to falling into poverty.')}
        </p>
        {topAtRisk && (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {t('home.topAtRisk', {
              names: topAtRisk,
              defaultValue: 'Most families who are poor or close to poverty live in: {{names}}.',
            })}
          </p>
        )}
        <details className="mt-3 text-sm text-slate-700">
          <summary className="cursor-pointer font-medium">{t('home.guide.title', 'How to use this page')}</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>{t('home.guide.one', 'The four numbers at the top give the big picture.')}</li>
            <li>{t('home.guide.two', 'Use the Map tab to see where need is highest. Tap a district for details.')}</li>
            <li>{t('home.guide.three', 'Use Early warnings to see districts that need attention soon, with suggested next steps.')}</li>
            <li>{t('home.guide.four', 'Use All districts to search, filter and compare every district.')}</li>
          </ol>
        </details>
      </header>

      {kpis.isError ? (
        <ErrorState title={t('dashboard.error')} detail={kpis.error.message} retryLabel={t('dashboard.retry')} onRetry={() => kpis.refetch()} />
      ) : (
        <section aria-label={t('home.kpi.label', 'Key numbers')} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard loading={kpis.isLoading} label={t('home.kpi.poverty', 'Households living in poverty')} value={kpis.data ? `${kpis.data.povertyPct}%` : null} pendingLabel={pending} note={kpis.data?.povertySource} />
          <KpiCard loading={kpis.isLoading} label={t('home.kpi.exclusion', 'Poor families not reached by support')} value={kpis.data?.exclusionPct != null ? `${kpis.data.exclusionPct}%` : null} pendingLabel={pending} />
          <KpiCard loading={kpis.isLoading} label={t('home.kpi.highRisk', 'Districts needing most attention')} value={kpis.data?.highRiskDistrictCount != null ? String(kpis.data.highRiskDistrictCount) : null} pendingLabel={pending} />
          <KpiCard loading={kpis.isLoading} label={t('home.kpi.scored', 'Households checked so far')} value={kpis.data ? fmt.format(kpis.data.householdsScored) : null} pendingLabel={pending} />
        </section>
      )}

      <div role="tablist" aria-label={t('home.tab.label', 'Dashboard sections')} className="flex gap-1 border-b border-slate-200">
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
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:text-slate-300 ${
              tab === x.key ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {tab === 'map' && (
        <section id="panel-map" role="tabpanel" aria-labelledby="tab-map" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t('home.mapTitle', 'Map of Rwanda by district')}</h2>
            <div role="group" aria-label={t('map.layerLabel')} className="inline-flex flex-wrap overflow-hidden rounded-md border border-slate-300">
              {layers.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  disabled={!l.enabled}
                  aria-pressed={layer === l.key}
                  title={l.enabled ? undefined : t('map.layerPending')}
                  onClick={() => setLayer(l.key)}
                  className={`px-3 py-1.5 text-sm font-medium ${layer === l.key ? 'bg-emerald-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'} disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <p className="mb-3 rounded-md border border-sky-200 bg-sky-50 p-2 text-xs text-sky-900">
            {t('home.estimateNote', 'These numbers are careful estimates, not exact counts. A home visit should always confirm a family\u2019s situation.')}
          </p>
          {layer === 'vulnerability' && (
            <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              {t('home.vulnNote', 'This view shows families who are poor now or one setback away. It is an early warning to help plan, not a prediction for any single family.')}
            </p>
          )}

          {districts.isError ? (
            <ErrorState title={t('dashboard.error')} detail={districts.error.message} retryLabel={t('dashboard.retry')} onRetry={() => districts.refetch()} />
          ) : geo.isError ? (
            <ErrorState title={t('map.error')} detail={t('map.errorHint')} retryLabel={t('dashboard.retry')} onRetry={() => geo.refetch()} />
          ) : geo.isLoading || districts.isLoading || !geo.data ? (
            <div className="h-80 animate-pulse rounded bg-slate-200" aria-busy="true" aria-label={t('dashboard.loading')} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <RiskMap geo={geo.data} districts={list} layer={layer} lang={lang} activeCode={activeCode} onHover={setHover} onSelect={setSelected} vuln={vuln.byCode} />
              </div>

              <div className="space-y-5">
                <div aria-live="polite" className="min-h-28 rounded-md border border-slate-200 p-3 text-sm">
                  {active ? (
                    <>
                      <div className="text-base font-semibold">{nameOf(active)}</div>
                      <div className="text-slate-500">{active.province}</div>
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                        <dt className="text-slate-500">{t('home.people', 'People living here')}</dt>
                        <dd className="tabular-nums">{fmt.format(active.population)}</dd>
                        <dt className="text-slate-500">{t('home.inPoverty', 'Households in poverty')}</dt>
                        <dd className="tabular-nums">{active.povertyRate !== null && active.povertyRate !== undefined ? `${active.povertyRate}%` : pending}</dd>
                        {activeVuln && (
                          <>
                            <dt className="text-slate-500">{t('home.closeToPoverty', 'Close to falling into poverty')}</dt>
                            <dd className="tabular-nums">{Math.round(activeVuln.share_at_risk * 100)}%</dd>
                            <dt className="text-slate-500">{t('home.needHelpNow', 'Likely in need now')}</dt>
                            <dd className="tabular-nums">{Math.round(activeVuln.share_poor_now * 100)}%</dd>
                          </>
                        )}
                        <dt className="text-slate-500">{t('home.howWeKnow', 'How we know this')}</dt>
                        <dd>{t(`dashboard.source.${active.povertyRateSource}`)}</dd>
                      </dl>
                    </>
                  ) : (
                    <p className="text-slate-500">{t('home.hint', 'Point at or tap a district to see its details.')}</p>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">{t('home.top5', 'Districts with the most poverty')}</h3>
                  <ol className="space-y-1 text-sm">
                    {sorted.slice(0, 5).map((d, i) => (
                      <li key={d.code}>
                        <button type="button" onClick={() => setSelected(d.code)} className="flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-slate-50">
                          <span><span className="mr-2 text-slate-400">{i + 1}.</span>{nameOf(d)}</span>
                          <span className="tabular-nums font-medium">{d.povertyRate}%</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          )}
          <p className="mt-3 text-xs text-slate-400">{t('map.attribution')}</p>
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
        <section id="panel-districts" role="tabpanel" aria-labelledby="tab-districts" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">{t('home.allDistricts', 'All districts')}</h2>
          {districts.isError ? (
            <ErrorState title={t('dashboard.error')} detail={districts.error.message} retryLabel={t('dashboard.retry')} onRetry={() => districts.refetch()} />
          ) : districts.isLoading ? (
            <div className="space-y-2" aria-busy="true" aria-label={t('dashboard.loading')}>
              {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-9 animate-pulse rounded bg-slate-200" />)}
            </div>
          ) : list.length === 0 ? (
            <p className="text-slate-500">{t('dashboard.noData')}</p>
          ) : (
            <DistrictTable districts={list} lang={lang} vulnByCode={vuln.byCode} onSelect={(code) => showOnMap(code)} />
          )}
        </section>
      )}
    </div>
  )
}