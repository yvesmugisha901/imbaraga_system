import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useDistricts, useGeoJson, useKpis } from '../api/hooks'
import { useVulnerability } from '../api/useVulnerability'
import ErrorState from '../components/ui/ErrorState'
import AlertsPanel from '../components/ui/AlertsPanel'
import { RULES } from '../utils/alertRules'
import DistrictTable from '../components/ui/DistrictTable'
import DistrictProfile from '../components/ui/DistrictProfile'
import RiskCharts from '../components/charts/RiskCharts'
import HeroPhoto from '../components/ui/HeroPhoto'
import { HERO } from '../utils/heroImage'
import HowItWorks from '../components/ui/HowItWorks'
import RiskMap, { type RiskLayer } from '../components/charts/RiskMap'
import type { District } from '../types'

type Tab = 'map' | 'charts' | 'alerts' | 'districts'
type Chip = { label: string; kind: 'official' | 'demo' }

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

const ICONS = {
  home: 'M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9z',
  warn: 'M12 3l10 18H2L12 3zM12 10v5M12 18v.01',
  pin: 'M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zM12 12.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z',
  check: 'M5 13l4 4L19 7',
  users: 'M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 20v-1a4 4 0 00-3-3.9',
  bell: 'M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9zM10 20a2 2 0 004 0',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  chart: 'M5 20V11M12 20V4M19 20v-6',
  help: 'M9.5 9a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2M12 17v.01M12 3a9 9 0 100 18 9 9 0 000-18z',
  drop: 'M12 3s6 6.5 6 11a6 6 0 11-12 0c0-4.5 6-11 6-11z',
  coin: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v10M9 10h4.5a1.5 1.5 0 010 3H10a1.5 1.5 0 000 3H15',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
}

const TONES = {
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  slate: 'bg-slate-100 text-slate-600',
}

function Icon({ d }: { d: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

function FocusCard({
  title,
  rule,
  icon,
  items,
  alsoCodes,
  alsoLabel,
  nameOf,
  onSelect,
}: {
  title: string
  rule: string
  icon: string
  items: District[]
  alsoCodes: Set<string>
  alsoLabel: string
  nameOf: (d: District) => string
  onSelect: (code: string) => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <Icon d={icon} />
        </span>
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            {title} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600">{items.length}</span>
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{rule}</p>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-slate-100">
        {items.map((d) => (
          <li key={d.code}>
            <button type="button" onClick={() => onSelect(d.code)} className={`flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-slate-50 ${focus}`}>
              <span className="min-w-0">
                <span className="font-medium text-slate-900">{nameOf(d)}</span>
                <span className="ml-2 text-xs text-slate-400">{d.province}</span>
                {alsoCodes.has(d.code) && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">{alsoLabel}</span>}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-900">{d.povertyRate?.toFixed(1)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

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
  const [help, setHelp] = useState(false)

  const list = useMemo(() => districts.data ?? [], [districts.data])
  const sorted = useMemo(() => [...list].sort((a, b) => (b.povertyRate ?? 0) - (a.povertyRate ?? 0)), [list])
  const maxPoverty = sorted[0]?.povertyRate ?? 1
  // The two access layers stay off until the map reads FinScope (see note in the reply); exclusionGap is not filled.
  const accessAvailable = list.some((d) => d.exclusionGap !== null)
  const nameOf = (d: District) => (lang === 'rw' && d.nameRw ? d.nameRw : d.nameEn)

  const activeCode = hover ?? selected
  const active = list.find((d) => d.code === activeCode)
  const activeVuln = active ? vuln.byCode?.[active.code] : undefined

  // Headline comes from the OFFICIAL poverty ranking, not the demonstration model.
  const topPoverty = useMemo(() => sorted.slice(0, 3).map(nameOf).join(', '), [sorted, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  // Districts flagged by the official data layer (EICV7 services, FinScope financial access).
  const flagged = useMemo(() => {
    const byPoverty = (a: District, b: District) => (b.povertyRate ?? 0) - (a.povertyRate ?? 0)
    const services = list.filter((d) => d.highPovertyLowAccess).sort(byPoverty)
    const finance = list.filter((d) => d.doubleExclusionFlag).sort(byPoverty)
    const both = new Set(services.filter((d) => d.doubleExclusionFlag).map((d) => d.code))
    const either = new Set([...services, ...finance].map((d) => d.code))
    return { services, finance, both, eitherCount: either.size }
  }, [list])

  // Demonstration household model summary (simulated households; always labelled as such).
  const summary = useMemo(() => {
    if (!vuln.data) return null
    const rows = vuln.data.districts
    const total = rows.reduce((s, d) => s + d.households, 0) || 1
    const atRisk = rows.reduce((s, d) => s + d.households * d.share_at_risk, 0) / total
    const exposed = rows.reduce((s, d) => s + d.households * d.share_exposed, 0) / total
    const urgent = rows.filter((d) => d.share_exposed >= exposed + RULES.highAboveAverage).length
    return { atRisk, urgent }
  }, [vuln.data])

  const official: Chip = { label: t('home.chip.official', 'Official NISR figure'), kind: 'official' }
  const officialFin: Chip = { label: t('home.chip.officialFin', 'NISR EICV7 + FinScope 2024'), kind: 'official' }
  const demo: Chip = { label: t('home.chip.demo', 'Demonstration data'), kind: 'demo' }

  const national = kpis.data?.povertyPct
  const aboveNational = national != null ? list.filter((d) => (d.povertyRate ?? 0) > national).length : null

  const tiles: { label: string; value: string; note?: string; icon: string; tone: 'green' | 'amber' | 'slate'; chip?: Chip }[] = []
  if (kpis.data) tiles.push({ label: t('home.kpi.povertyPeople', 'People living in poverty'), value: `${kpis.data.povertyPct}%`, note: kpis.data.povertySource, icon: ICONS.home, tone: 'green', chip: /NISR/i.test(kpis.data.povertySource ?? '') ? official : undefined })
  if (aboveNational != null && list.length > 0 && list.some((d) => d.povertyRateSource === 'official_eicv7'))
    tiles.push({ label: t('home.kpi.above', 'Districts above the national rate'), value: `${aboveNational} / ${list.length}`, icon: ICONS.trend, tone: 'amber', chip: official })
  if (flagged.eitherCount > 0)
    tiles.push({
      label: t('home.kpi.flagged', 'Districts flagged for extra attention'),
      value: String(flagged.eitherCount),
      note: t('home.kpi.flaggedNote', { defaultValue: '{{n}} flagged on both services and finance', n: flagged.both.size }),
      icon: ICONS.pin,
      tone: 'amber',
      chip: officialFin,
    })
  if (kpis.data?.exclusionPct != null) tiles.push({ label: t('home.kpi.exclusion', 'Poor families not reached by support'), value: `${kpis.data.exclusionPct}%`, icon: ICONS.users, tone: 'slate' })
  if (summary) tiles.push({ label: t('home.kpi.close', 'Families close to falling into poverty'), value: `${Math.round(summary.atRisk * 100)}%`, icon: ICONS.warn, tone: 'slate', chip: demo })
  if (summary) tiles.push({ label: t('home.kpi.urgent', 'Districts to act on soon'), value: String(summary.urgent), icon: ICONS.pin, tone: 'slate', chip: demo })
  if (kpis.data) tiles.push({ label: t('home.kpi.scored', 'Households checked so far'), value: fmt.format(kpis.data.householdsScored), icon: ICONS.check, tone: 'slate', chip: demo })

  const nameFor = (code: string, fallback: string) => {
    const d = list.find((x) => x.code === code)
    return d ? nameOf(d) : fallback
  }

  const showOnMap = (code: string, nextLayer?: RiskLayer) => {
    setSelected(code)
    if (nextLayer) setLayer(nextLayer)
    setTab('map')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const layers: { key: RiskLayer; label: string; enabled: boolean }[] = [
    { key: 'poverty', label: t('home.layer.poverty', 'Where poverty is highest'), enabled: true },
    { key: 'vulnerability', label: t('home.layer.vulnerability', 'Families close to poverty (demo)'), enabled: vuln.byCode !== null },
    { key: 'access', label: t('home.layer.access', 'Where support is missing'), enabled: accessAvailable },
    { key: 'double', label: t('home.layer.double', 'Poor and left out'), enabled: accessAvailable },
  ]

  const tabs: { key: Tab; label: string; enabled: boolean; icon: string }[] = [
    { key: 'map', label: t('home.tab.map', 'Map'), enabled: true, icon: ICONS.pin },
    { key: 'charts', label: t('home.tab.charts', 'Charts'), enabled: vuln.data !== null, icon: ICONS.chart },
    { key: 'alerts', label: t('home.tab.alerts', 'Early warnings'), enabled: vuln.data !== null, icon: ICONS.bell },
    { key: 'districts', label: t('home.tab.districts', 'All districts'), enabled: true, icon: ICONS.list },
  ]

  const panel = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm'
  const alsoLabel = t('home.focus.both', 'Both')

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm sm:p-8">
        <HeroPhoto src={HERO.src} alt={HERO.alt} credit={HERO.credit} className="pointer-events-none absolute right-6 top-6 hidden h-56 w-72 xl:block" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          {t('home.demoBadge', 'Prototype')}
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{t('home.title', 'Where is help needed most?')}</h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">
          {t('home.subtitle', 'See which districts have the most families in need, and which are close to falling into poverty.')}
        </p>
        {topPoverty && (
          <p className="mt-5 max-w-3xl rounded-lg border border-emerald-100 bg-white/80 px-4 py-3 text-base text-slate-900">
            {t('home.topPoverty', { names: topPoverty, defaultValue: 'Poverty is highest in {{names}}.' })}
            <span className="mt-1 block text-xs text-slate-500">{t('home.topPovertyNote', 'Official NISR EICV7 2023/24 district figures. Always confirm with a home visit.')}</span>
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

        {kpis.isError ? (
          <div className="mt-6 rounded-lg bg-white p-3 ring-1 ring-slate-900/5">
            <ErrorState title={t('dashboard.error')} detail={kpis.error.message} retryLabel={t('dashboard.retry')} onRetry={() => kpis.refetch()} />
          </div>
        ) : (
          <dl aria-label={t('home.kpi.label', 'Key numbers')} className="mt-6 flex flex-wrap gap-3">
            {kpis.isLoading
              ? Array.from({ length: 4 }, (_, i) => <div key={i} className="h-28 min-w-[11rem] flex-1 animate-pulse rounded-xl bg-white/70 ring-1 ring-slate-900/5" />)
              : tiles.map((x) => (
                  <div key={x.label} className="min-w-[11rem] flex-1 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
                    <dt className="flex items-center gap-2 text-sm text-slate-600">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${TONES[x.tone]}`}>
                        <Icon d={x.icon} />
                      </span>
                      {x.label}
                    </dt>
                    <dd className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{x.value}</dd>
                    {x.chip && (
                      <span
                        className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          x.chip.kind === 'official' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {x.chip.label}
                      </span>
                    )}
                    {x.note && <p className="mt-1 text-xs text-slate-400">{x.note}</p>}
                  </div>
                ))}
          </dl>
        )}
      </section>

      {flagged.eitherCount > 0 && (
        <section aria-labelledby="focus-heading">
          <div className="mb-4">
            <h2 id="focus-heading" className="text-xl font-semibold tracking-tight text-slate-900">{t('home.focus.title', 'Where to focus first')}</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              {t('home.focus.subtitle', 'Districts with high poverty that also lack basic services or financial access. Select a district to see it on the map.')}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FocusCard
              title={t('home.focus.services', 'High poverty, low access to services')}
              rule={t('home.focus.servicesRule', 'Poverty above the national rate and among the third of districts with the lowest water, sanitation, electricity and phone access.')}
              icon={ICONS.drop}
              items={flagged.services}
              alsoCodes={flagged.both}
              alsoLabel={alsoLabel}
              nameOf={nameOf}
              onSelect={(c) => showOnMap(c)}
            />
            <FocusCard
              title={t('home.focus.finance', 'Poor and financially excluded')}
              rule={t('home.focus.financeRule', 'Poverty above the national rate and fewer than 90% of adults using formal financial services (national: 92%).')}
              icon={ICONS.coin}
              items={flagged.finance}
              alsoCodes={flagged.both}
              alsoLabel={alsoLabel}
              nameOf={nameOf}
              onSelect={(c) => showOnMap(c)}
            />
          </div>
          <div className="mt-3">
            <Note>{t('home.focus.note', 'Financial access comes from a survey of about 400 adults per district, so districts close to the cut-off could fall on either side.')}</Note>
          </div>
        </section>
      )}

      <div>
        <div className="mb-5 flex items-end justify-between gap-4 border-b border-slate-300">
          <div role="tablist" aria-label={t('home.tab.label', 'Dashboard sections')} className="flex gap-6">
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
                className={`-mb-px inline-flex items-center gap-2 rounded-t border-b-2 pb-3 text-sm font-medium disabled:cursor-not-allowed disabled:text-slate-300 ${focus} ${
                  tab === x.key ? 'border-emerald-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon d={x.icon} />
                {x.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-expanded={help}
            onClick={() => setHelp((v) => !v)}
            className={`mb-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-emerald-800 hover:bg-emerald-50 ${focus}`}
          >
            <Icon d={ICONS.help} />
            {t('home.guide.title', 'How to use this page')}
          </button>
        </div>

        {help && (
          <ol className="mb-5 list-decimal space-y-1 rounded-lg bg-white p-4 pl-9 text-sm text-slate-600 shadow-sm">
            <li>{t('home.guide.one', 'The numbers at the top give the big picture.')}</li>
            <li>{t('home.guide.two', 'Use the Map tab to see where need is highest. Tap a district for details.')}</li>
            <li>{t('home.guide.three', 'Use Early warnings to see districts that need attention soon, with suggested next steps.')}</li>
            <li>{t('home.guide.four', 'Use All districts to search, filter and compare every district.')}</li>
          </ol>
        )}

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
              {layer === 'poverty' && (
                <Note>{t('home.povertyLayerNote', 'This view uses official NISR EICV7 2023/24 poverty rates for each district.')}</Note>
              )}
              {layer === 'vulnerability' && (
                <Note>{t('home.vulnNote', 'This view comes from simulated demonstration households. It is an early warning to help plan, not a prediction for any single family, and it does not match the official district ranking.')}</Note>
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
                  <div aria-live="polite" className="min-h-40 rounded-lg bg-slate-50 p-4 text-sm">
                    {active ? (
                      <>
                        <div className="text-base font-semibold text-slate-900">{nameOf(active)}</div>
                        <div className="text-slate-500">{active.province}</div>
                        <dl className="mt-3">
                          {[
                            [t('home.people', 'People living here'), fmt.format(active.population)],
                            [t('home.inPovertyPeople', 'People living in poverty'), active.povertyRate !== null && active.povertyRate !== undefined ? `${active.povertyRate}%` : pending],
                            [t('home.howWeKnow', 'How we know this'), t(`dashboard.source.${active.povertyRateSource}`)],
                          ].map(([k, v]) => (
                            <div key={k} className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
                              <dt className="text-slate-500">{k}</dt>
                              <dd className="text-right font-medium tabular-nums text-slate-900">{v}</dd>
                            </div>
                          ))}
                        </dl>
                        {activeVuln && (
                          <div className="mt-3 rounded-md bg-white p-3 ring-1 ring-slate-200">
                            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('home.demoBlock', 'Demonstration household model')}</div>
                            <dl className="mt-1">
                              {[
                                [t('home.closeToPoverty', 'Close to falling into poverty'), `${Math.round(activeVuln.share_at_risk * 100)}%`],
                                [t('home.needHelpNow', 'Likely in need now'), `${Math.round(activeVuln.share_poor_now * 100)}%`],
                              ].map(([k, v]) => (
                                <div key={k} className="flex items-baseline justify-between gap-4 py-1">
                                  <dt className="text-slate-500">{k}</dt>
                                  <dd className="text-right font-medium tabular-nums text-slate-700">{v}</dd>
                                </div>
                              ))}
                            </dl>
                            <p className="mt-1 text-xs text-slate-400">{t('home.demoBlockNote', 'From simulated households. Not an official figure.')}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-slate-500">{t('home.hint', 'Point at or tap a district to see its details.')}</p>
                    )}
                  </div>

                  {active && <DistrictProfile district={active} all={list} name={nameOf(active)} />}

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
                              <span className="block h-1 rounded bg-emerald-600" style={{ width: `${((d.povertyRate ?? 0) / maxPoverty) * 100}%` }} />
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

        {tab === 'charts' && vuln.data && (
          <section id="panel-charts" role="tabpanel" aria-labelledby="tab-charts" className={panel}>
            <Note>{t('home.chartsDemoNote', 'These charts use simulated demonstration households.')}</Note>
            <div className="mt-4">
              <RiskCharts data={vuln.data} nameFor={nameFor} onSelect={(code) => showOnMap(code, 'vulnerability')} />
            </div>
          </section>
        )}

        {tab === 'alerts' && vuln.data && (
          <div id="panel-alerts" role="tabpanel" aria-labelledby="tab-alerts">
            <AlertsPanel
              data={vuln.data}
              nameFor={nameFor}
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

      <HowItWorks />

      <footer className="rounded-xl bg-slate-50 px-5 py-4 text-xs leading-5 text-slate-500">
        <p className="font-medium text-slate-600">{t('home.sources.title', 'Where the numbers come from')}</p>
        <ul className="mt-1 space-y-0.5">
          <li>{t('home.sources.eicv', 'Poverty and living conditions: National Institute of Statistics of Rwanda, EICV7 (2023/24) district reports.')}</li>
          <li>{t('home.sources.finscope', 'Financial access: FinScope Rwanda 2024, Access to Finance Rwanda.')}</li>
          <li>{t('home.sources.demo', 'Household risk model and early warnings: simulated demonstration data, not real households.')}</li>
        </ul>
      </footer>
    </div>
  )
}