import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDistricts, useGeoJson, useKpis } from '../api/hooks'
import KpiCard from '../components/ui/KpiCard'
import ErrorState from '../components/ui/ErrorState'
import RiskMap from '../components/charts/RiskMap'
import type { MapLayer } from '../utils/mapLayers'
import type { District } from '../types'

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const lang: 'en' | 'rw' = i18n.language === 'rw' ? 'rw' : 'en'
  const kpis = useKpis()
  const districts = useDistricts()
  const geo = useGeoJson()
  const fmt = new Intl.NumberFormat(lang === 'rw' ? 'en-RW' : 'en-US')
  const pending = t('dashboard.pending')

  const [layer, setLayer] = useState<MapLayer>('poverty')
  const [hover, setHover] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const list = districts.data ?? []
  const sorted = useMemo(() => [...list].sort((a, b) => (b.povertyRate ?? 0) - (a.povertyRate ?? 0)), [list])
  const accessAvailable = list.some((d) => d.exclusionGap !== null)
  const nameOf = (d: District) => (lang === 'rw' && d.nameRw ? d.nameRw : d.nameEn)

  const activeCode = hover ?? selected
  const active = list.find((d) => d.code === activeCode)

  const layers: { key: MapLayer; label: string; enabled: boolean }[] = [
    { key: 'poverty', label: t('map.layer.poverty'), enabled: true },
    { key: 'access', label: t('map.layer.access'), enabled: accessAvailable },
    { key: 'double', label: t('map.layer.double'), enabled: accessAvailable },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>

      {kpis.isError ? (
        <ErrorState title={t('dashboard.error')} detail={kpis.error.message} retryLabel={t('dashboard.retry')} onRetry={() => kpis.refetch()} />
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard loading={kpis.isLoading} label={t('dashboard.kpi.poverty')} value={kpis.data ? `${kpis.data.povertyPct}%` : null} pendingLabel={pending} note={kpis.data?.povertySource} />
          <KpiCard loading={kpis.isLoading} label={t('dashboard.kpi.exclusion')} value={kpis.data?.exclusionPct != null ? `${kpis.data.exclusionPct}%` : null} pendingLabel={pending} />
          <KpiCard loading={kpis.isLoading} label={t('dashboard.kpi.highRisk')} value={kpis.data?.highRiskDistrictCount != null ? String(kpis.data.highRiskDistrictCount) : null} pendingLabel={pending} />
          <KpiCard loading={kpis.isLoading} label={t('dashboard.kpi.scored')} value={kpis.data ? fmt.format(kpis.data.householdsScored) : null} pendingLabel={pending} />
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t('map.title')}</h2>
          <div role="group" aria-label={t('map.layerLabel')} className="inline-flex overflow-hidden rounded-md border border-slate-300">
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

        <p className="mb-3 rounded-md border border-sky-200 bg-sky-50 p-2 text-xs text-sky-900">{t('map.modelledNote')}</p>

        {districts.isError ? (
          <ErrorState title={t('dashboard.error')} detail={districts.error.message} retryLabel={t('dashboard.retry')} onRetry={() => districts.refetch()} />
        ) : geo.isError ? (
          <ErrorState title={t('map.error')} detail={t('map.errorHint')} retryLabel={t('dashboard.retry')} onRetry={() => geo.refetch()} />
        ) : geo.isLoading || districts.isLoading || !geo.data ? (
          <div className="h-80 animate-pulse rounded bg-slate-200" aria-busy="true" aria-label={t('dashboard.loading')} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RiskMap geo={geo.data} districts={list} layer={layer} lang={lang} activeCode={activeCode} onHover={setHover} onSelect={setSelected} />
            </div>

            <div className="space-y-5">
              <div aria-live="polite" className="min-h-28 rounded-md border border-slate-200 p-3 text-sm">
                {active ? (
                  <>
                    <div className="text-base font-semibold">{nameOf(active)}</div>
                    <div className="text-slate-500">{active.province}</div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                      <dt className="text-slate-500">{t('table.population')}</dt>
                      <dd className="tabular-nums">{fmt.format(active.population)}</dd>
                      <dt className="text-slate-500">{t('table.poverty')}</dt>
                      <dd className="tabular-nums">{active.povertyRate ?? pending}</dd>
                      <dt className="text-slate-500">{t('table.source')}</dt>
                      <dd>{t(`dashboard.source.${active.povertyRateSource}`)}</dd>
                    </dl>
                  </>
                ) : (
                  <p className="text-slate-500">{t('map.hint')}</p>
                )}
              </div>

              <div>
                <h3 className="mb-2 font-semibold">{t('map.top5')}</h3>
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

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t('dashboard.districts')}</h2>
        {districts.isError ? (
          <ErrorState title={t('dashboard.error')} detail={districts.error.message} retryLabel={t('dashboard.retry')} onRetry={() => districts.refetch()} />
        ) : districts.isLoading ? (
          <div className="space-y-2" aria-busy="true" aria-label={t('dashboard.loading')}>
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-9 animate-pulse rounded bg-slate-200" />)}
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-slate-500">{t('dashboard.noData')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2">{t('table.district')}</th>
                  <th className="px-3 py-2">{t('table.province')}</th>
                  <th className="px-3 py-2 text-right">{t('table.population')}</th>
                  <th className="px-3 py-2 text-right">{t('table.poverty')}</th>
                  <th className="px-3 py-2">{t('table.source')}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((d) => (
                  <tr key={d.code} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium">{nameOf(d)}</td>
                    <td className="px-3 py-2">{d.province}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt.format(d.population)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{d.povertyRate ?? pending}</td>
                    <td className="px-3 py-2 text-slate-500">{t(`dashboard.source.${d.povertyRateSource}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}