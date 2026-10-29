import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useDistricts, useGeoJson, useKpis } from '../api/hooks'
import ErrorState from '../components/ui/ErrorState'
import DistrictTable from '../components/ui/DistrictTable'
import DistrictProfile from '../components/ui/DistrictProfile'
import SectionNav, { type NavItem } from '../components/dashboard/SectionNav'
import PriorityTable from '../components/dashboard/PriorityTable'
import ProgressChart from '../components/dashboard/ProgressChart'
import DriversChart from '../components/dashboard/DriversChart'
import RiskMap, { type RiskLayer } from '../components/charts/RiskMap'
import { accessGapPct, doubleClass } from '../utils/officialLayers'
import type { District } from '../types'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'
const font = { fontFamily: 'Inter, "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif' }

/** A section whose body can be folded away. Closed sections show only a title and a one-line summary. */
function Block({ id, offset, title, summary, open, onToggle, children }: {
  id: string; offset: number; title: string; summary?: string; open: boolean; onToggle: (id: string) => void; children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} style={{ scrollMarginTop: offset + 8 }} className="rounded-lg border border-slate-200 bg-white">
      <h2 id={`${id}-h`} className="m-0">
        <button type="button" aria-expanded={open} aria-controls={`${id}-body`} onClick={() => onToggle(id)} className={`flex w-full items-center justify-between gap-4 rounded-lg px-4 py-3 text-left ${focus}`}>
          <span>
            <span className="block text-base font-semibold text-slate-900">{title}</span>
            {summary && <span className="mt-0.5 block text-sm font-normal text-slate-500">{summary}</span>}
          </span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 fill-none stroke-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8l5 5 5-5" /></svg>
        </button>
      </h2>
      {open && <div id={`${id}-body`} className="border-t border-slate-200 p-4">{children}</div>}
    </section>
  )
}

/** Small stat card. The explanation appears on hover or keyboard focus, not by default. */
function Stat({ label, value, tip }: { label: string; value: string; tip?: string }) {
  return (
    <div tabIndex={tip ? 0 : undefined} className={`group relative rounded-lg border border-slate-200 bg-white px-4 py-3 ${focus}`}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</dd>
      {tip && (
        <span role="tooltip" className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-60 rounded-md bg-slate-900 px-3 py-2 text-xs leading-5 text-white shadow-lg group-hover:block group-focus:block">
          {tip}
        </span>
      )}
    </div>
  )
}

function useHeaderHeight() {
  const [h, setH] = useState(0)
  useEffect(() => {
    const header = document.querySelector('header')
    if (!header) return
    const measure = () => setH(Math.round(header.getBoundingClientRect().height))
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(header)
    window.addEventListener('resize', measure)
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure) }
  }, [])
  return h
}

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const lang: 'en' | 'rw' = i18n.language === 'rw' ? 'rw' : 'en'
  const kpis = useKpis()
  const districts = useDistricts()
  const geo = useGeoJson()
  const fmt = new Intl.NumberFormat(lang === 'rw' ? 'en-RW' : 'en-US')
  const offset = useHeaderHeight()

  const [layer, setLayer] = useState<RiskLayer>('poverty')
  const [hover, setHover] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({ focus: true, map: true })
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }))

  const list = useMemo(() => districts.data ?? [], [districts.data])
  const sorted = useMemo(() => [...list].filter((d) => d.povertyRate != null).sort((a, b) => (b.povertyRate ?? 0) - (a.povertyRate ?? 0)), [list])
  const nameOf = (d: District) => (lang === 'rw' && d.nameRw ? d.nameRw : d.nameEn)

  const activeCode = hover ?? selected
  const active = list.find((d) => d.code === activeCode)
  const picked = list.find((d) => d.code === selected)

  const accessAvailable = useMemo(() => list.some((d) => accessGapPct(d) !== null), [list])
  const doubleAvailable = useMemo(() => list.some((d) => doubleClass(d) !== null), [list])
  const hasProgress = useMemo(() => list.some((d) => d.povertyEicv5 != null && d.povertyRate != null), [list])
  const hasDrivers = useMemo(() => list.some((d) => d.indicators != null), [list])

  const flaggedCount = useMemo(() => list.filter((d) => d.highPovertyLowAccess || d.doubleExclusionFlag).length, [list])
  const bothCount = useMemo(() => list.filter((d) => d.highPovertyLowAccess && d.doubleExclusionFlag).length, [list])

  const stats = useMemo(() => {
    if (!sorted.length) return null
    const changes = list.map((d) => d.povertyChangePoints).filter((v): v is number => v != null)
    return {
      hi: sorted[0], lo: sorted[sorted.length - 1],
      fell: changes.filter((c) => c < 0).length, n: changes.length,
      avg: changes.length ? changes.reduce((a, b) => a + b, 0) / changes.length : null,
    }
  }, [list, sorted])

  const national = kpis.data?.povertyPct
  const above = national != null ? list.filter((d) => (d.povertyRate ?? 0) > national).length : null

  const stat: { label: string; value: string; tip?: string }[] = []
  if (national != null) stat.push({ label: t('home.kpi.povertyPeople', 'People living in poverty'), value: `${national}%`, tip: above != null ? t('home.kpi.aboveTip', { defaultValue: 'National rate, 2023/24. {{a}} of {{n}} districts are above it.', a: above, n: list.length }) : undefined })
  if (stats?.hi.povertyRate != null) stat.push({ label: t('home.kpi.highest', 'Highest district'), value: `${stats.hi.povertyRate.toFixed(1)}%`, tip: `${nameOf(stats.hi)}. ${t('home.kpi.lowest', 'Lowest')}: ${nameOf(stats.lo)}, ${stats.lo.povertyRate?.toFixed(1)}%.` })
  if (stats && stats.n > 0) stat.push({ label: t('home.kpi.fell', 'Districts with lower poverty than 2016/17'), value: `${stats.fell} of ${stats.n}`, tip: stats.avg != null ? t('home.kpi.fellNote', { defaultValue: 'Average change {{pts}} points', pts: `\u2212${Math.abs(stats.avg).toFixed(1)}` }) : undefined })
  if (flaggedCount > 0) stat.push({ label: t('home.kpi.flagged', 'Districts needing extra attention'), value: String(flaggedCount), tip: t('home.kpi.flaggedNote', { defaultValue: '{{n}} flagged on both services and finance', n: bothCount }) })

  const showOnMap = (code: string) => {
    setSelected(code)
    setOpen((o) => ({ ...o, map: true }))
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() => document.getElementById('map')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }))
  }

  const layers: { key: RiskLayer; label: string; enabled: boolean }[] = [
    { key: 'poverty', label: t('home.layer.poverty', 'Poverty'), enabled: true },
    { key: 'access', label: t('home.layer.access', 'Missing support'), enabled: accessAvailable },
    { key: 'double', label: t('home.layer.double', 'Poor and left out'), enabled: doubleAvailable },
  ]
  const layerNote =
    layer === 'poverty' ? t('home.povertyLayerNote', 'Official NISR EICV7 2023/24 poverty rate for each district.')
    : layer === 'access' ? t('home.accessLayerNote', 'Share of adults not using formal financial services, from FinScope 2024.')
    : t('home.doubleLayerNote', 'Districts flagged on high poverty with low services, high poverty with low financial access, or both.')

  const navItems = useMemo<NavItem[]>(
    () => [
      ...(flaggedCount > 0 ? [{ id: 'focus', label: t('nav.focus', 'Where to focus') }] : []),
      { id: 'map', label: t('nav.map', 'Map') },
      ...(hasProgress ? [{ id: 'progress', label: t('nav.progress', 'Progress') }] : []),
      ...(hasDrivers ? [{ id: 'drivers', label: t('nav.drivers', 'Drivers') }] : []),
      { id: 'districts', label: t('nav.districts', 'All districts') },
      { id: 'sources', label: t('nav.sources', 'Sources') },
    ],
    [t, flaggedCount, hasProgress, hasDrivers],
  )

  const loading = kpis.isLoading || districts.isLoading

  return (
    <div className="space-y-6" style={font}>
      <SectionNav items={navItems} offset={offset} label={t('nav.label', 'Dashboard sections')} onNavigate={(id) => setOpen((o) => ({ ...o, [id]: true }))} />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{t('home.title', 'Where is help needed most?')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('home.byline', 'Official poverty data for all 30 districts of Rwanda. NISR EICV7 2023/24 and FinScope 2024.')}</p>
      </header>

      {kpis.isError ? (
        <ErrorState title={t('dashboard.error')} detail={kpis.error.message} retryLabel={t('dashboard.retry')} onRetry={() => kpis.refetch()} />
      ) : (
        <dl aria-label={t('home.kpi.label', 'Key numbers')} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {loading ? Array.from({ length: 4 }, (_, i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-200/60" />) : stat.map((s) => <Stat key={s.label} {...s} />)}
        </dl>
      )}

      {flaggedCount > 0 && (
        <Block id="focus" offset={offset} open={!!open.focus} onToggle={toggle} title={t('home.focus.title', 'Where to focus first')} summary={t('home.focus.summary', 'Poverty above the national rate, with low access to services or finance.')}>
          <PriorityTable districts={list} nameOf={nameOf} national={national} onSelect={showOnMap} />
        </Block>
      )}

      <Block id="map" offset={offset} open={!!open.map} onToggle={toggle} title={t('home.mapTitle', 'Map by district')} summary={t('home.mapHelp', 'Point at or select a district for details.')}>
        <div role="group" aria-label={t('map.layerLabel')} className="mb-2 inline-flex gap-1 rounded-md bg-slate-100 p-1">
          {layers.map((l) => (
            <button key={l.key} type="button" disabled={!l.enabled} aria-pressed={layer === l.key} title={l.enabled ? undefined : t('map.layerPending')} onClick={() => setLayer(l.key)}
              className={`rounded px-3 py-1 text-sm disabled:cursor-not-allowed disabled:text-slate-300 ${focus} ${layer === l.key ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              {l.label}
            </button>
          ))}
        </div>
        <p className="mb-4 text-xs text-slate-500">{layerNote}</p>

        {districts.isError ? (
          <ErrorState title={t('dashboard.error')} detail={districts.error.message} retryLabel={t('dashboard.retry')} onRetry={() => districts.refetch()} />
        ) : geo.isError ? (
          <ErrorState title={t('map.error')} detail={t('map.errorHint')} retryLabel={t('dashboard.retry')} onRetry={() => geo.refetch()} />
        ) : geo.isLoading || districts.isLoading || !geo.data ? (
          <div className="h-80 animate-pulse rounded-md bg-slate-100" aria-busy="true" aria-label={t('dashboard.loading')} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RiskMap geo={geo.data} districts={list} layer={layer} lang={lang} activeCode={activeCode} onHover={setHover} onSelect={setSelected} vuln={null} />
            </div>
            <div aria-live="polite" className="space-y-4">
              {active ? (
                <div className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="text-base font-semibold text-slate-900">{nameOf(active)}</div>
                  <div className="text-xs text-slate-500">{active.province}</div>
                  <dl className="mt-2 divide-y divide-slate-100">
                    <div className="flex justify-between py-1.5"><dt className="text-slate-500">{t('home.people', 'People')}</dt><dd className="font-medium tabular-nums">{fmt.format(active.population)}</dd></div>
                    <div className="flex justify-between py-1.5"><dt className="text-slate-500">{t('home.inPovertyPeople', 'In poverty')}</dt><dd className="font-medium tabular-nums">{active.povertyRate != null ? `${active.povertyRate}%` : t('dashboard.pending')}</dd></div>
                  </dl>
                  {!picked && <p className="mt-2 text-xs text-slate-500">{t('home.clickMore', 'Select the district for the full profile.')}</p>}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">{t('home.hint', 'Point at or tap a district to see its details.')}</p>
              )}
              {picked && <DistrictProfile district={picked} all={list} name={nameOf(picked)} />}
            </div>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-400">{t('map.attribution')}</p>
      </Block>

      {hasProgress && (
        <Block id="progress" offset={offset} open={!!open.progress} onToggle={toggle} title={t('progress.title', 'Progress since 2016/17')} summary={t('progress.summary', 'Poverty in every district, then and now.')}>
          <ProgressChart districts={list} nameOf={nameOf} onSelect={showOnMap} />
        </Block>
      )}

      {hasDrivers && (
        <Block id="drivers" offset={offset} open={!!open.drivers} onToggle={toggle} title={t('drivers.title', 'What is behind poverty')} summary={t('drivers.summary', 'Compare poverty with one indicator at a time. Association, not cause.')}>
          <DriversChart districts={list} nameOf={nameOf} onSelect={showOnMap} />
        </Block>
      )}

      <Block id="districts" offset={offset} open={!!open.districts} onToggle={toggle} title={t('home.allDistricts', 'All districts')} summary={t('home.allDistrictsHelp', 'Search, filter and compare all 30 districts.')}>
        {districts.isLoading ? <div className="h-24 animate-pulse rounded bg-slate-100" aria-busy="true" /> : list.length === 0 ? <p className="text-slate-500">{t('dashboard.noData')}</p> : <DistrictTable districts={list} lang={lang} vulnByCode={null} onSelect={showOnMap} />}
      </Block>

      <Block id="sources" offset={offset} open={!!open.sources} onToggle={toggle} title={t('home.sources.title', 'Sources and limits')} summary={t('home.sources.summary', 'Where the numbers come from and how to read them.')}>
        <ul className="max-w-3xl list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-700">
          <li>{t('home.sources.eicv', 'Poverty and living conditions: NISR EICV7 (2023/24) district reports, compared with EICV5 (2016/17).')}</li>
          <li>{t('home.sources.finscope', 'Financial access: FinScope Rwanda 2024, about 400 adults per district, so districts near a cut-off could fall on either side.')}</li>
          <li>{t('home.sources.margin', 'District figures are survey estimates with margins of error. Small differences may not be meaningful.')}</li>
          <li>{t('home.sources.assoc', 'Links between poverty and other indicators show association, not cause.')}</li>
          <li>{t('home.sources.noHouseholds', 'Published district figures only. No individual household data.')}</li>
          <li>{t('home.estimateNote', 'These are estimates, not exact counts. A home visit should always confirm a family\u2019s situation.')}</li>
        </ul>
      </Block>
    </div>
  )
}