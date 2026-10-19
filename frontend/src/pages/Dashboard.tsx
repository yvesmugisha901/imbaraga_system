import { useTranslation } from 'react-i18next'
import { useDistricts, useKpis } from '../api/hooks'
import KpiCard from '../components/ui/KpiCard'
import ErrorState from '../components/ui/ErrorState'

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const kpis = useKpis()
  const districts = useDistricts()
  const fmt = new Intl.NumberFormat(i18n.language === 'rw' ? 'en-RW' : 'en-US')
  const pending = t('dashboard.pending')

  const sorted = [...(districts.data ?? [])].sort((a, b) => (b.povertyRate ?? 0) - (a.povertyRate ?? 0))

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
                    <td className="px-3 py-2 font-medium">{i18n.language === 'rw' && d.nameRw ? d.nameRw : d.nameEn}</td>
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