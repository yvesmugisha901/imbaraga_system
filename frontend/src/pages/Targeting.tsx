import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { API_BASE, ApiError } from '../api/client'
import { useDistricts, useScoreCsv } from '../api/hooks'
import type { ApiErrorDetail, RiskLevel, ScoredHousehold } from '../types'
import RiskBadge from '../components/ui/RiskBadge'
import ReasonChip from '../components/ui/ReasonChip'
import Drawer from '../components/ui/Drawer'
import ShapBar from '../components/charts/ShapBar'
import BatchInsights from '../components/targeting/BatchInsights'
import { useNextSteps } from '../components/targeting/useNextSteps'

const MAX_BYTES = 2 * 1024 * 1024
const PAGE = 50
const RISKS: RiskLevel[] = ['High', 'Medium', 'Low']
const font = { fontFamily: 'Inter, "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif' }
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'
const primary = `rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-50 ${focus}`
const secondary = `rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 ${focus}`

type SortKey = 'rank' | 'probability'
interface LoadedFile { name: string; text: string; rows: number }

export default function Targeting() {
  const { t, i18n } = useTranslation()
  const lang: 'en' | 'rw' = i18n.language === 'rw' ? 'rw' : 'en'
  const districts = useDistricts()
  const score = useScoreCsv()
  const nextSteps = useNextSteps()
  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<LoadedFile | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState<number | null>(null)
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all')
  const [districtFilter, setDistrictFilter] = useState('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'rank', dir: 'asc' })
  const [visible, setVisible] = useState(PAGE)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const districtName = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of districts.data ?? []) m.set(d.code, lang === 'rw' && d.nameRw ? d.nameRw : d.nameEn)
    return m
  }, [districts.data, lang])
  const nameOf = (code: string | null) => (code ? districtName.get(code) ?? code : '\u2014')

  const loadText = (name: string, text: string) => {
    const rows = Math.max(0, text.split(/\r?\n/).filter((l) => l.trim() !== '').length - 1)
    setFile({ name, text, rows })
    setFileError(null)
    setElapsed(null)
    setRiskFilter('all')
    setDistrictFilter('all')
    setVisible(PAGE)
    score.reset()
  }

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > MAX_BYTES) return setFileError(t('targeting.upload.tooLarge'))
    f.text().then((text) => loadText(f.name, text)).catch(() => setFileError(t('targeting.upload.readFail')))
  }

  const loadDemo = () => {
    fetch('/demo_households.csv')
      .then((r) => { if (!r.ok) throw new Error('missing'); return r.text() })
      .then((text) => loadText('demo_households.csv', text))
      .catch(() => setFileError(t('targeting.upload.demoFail')))
  }

  const run = () => {
    if (!file) return
    const start = performance.now()
    score.mutate(file.text, { onSuccess: () => setElapsed((performance.now() - start) / 1000) })
  }

  const clear = () => { setFile(null); setFileError(null); setElapsed(null); score.reset() }

  const result = score.data
  const rows = useMemo(() => {
    const list = (result?.results ?? []).filter(
      (r) => (riskFilter === 'all' || r.riskLevel === riskFilter) && (districtFilter === 'all' || r.districtCode === districtFilter),
    )
    const sign = sort.dir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => (a[sort.key] - b[sort.key]) * sign)
  }, [result, riskFilter, districtFilter, sort])

  const districtsInResult = useMemo(() => {
    const codes = new Set((result?.results ?? []).map((r) => r.districtCode).filter((c): c is string => !!c))
    return [...codes].sort((a, b) => (districtName.get(a) ?? a).localeCompare(districtName.get(b) ?? b))
  }, [result, districtName])

  const selected: ScoredHousehold | undefined = result?.results.find((r) => r.id === selectedId)

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'rank' ? 'asc' : 'desc' }))
  const ariaSort = (key: SortKey) => (sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none')

  const apiErr = score.error instanceof ApiError ? score.error : null
  const detail = apiErr?.details as { errors?: ApiErrorDetail[]; totalErrors?: number } | undefined

  return (
    <div className="space-y-6" style={font}>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{t('targeting.title')}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{t('targeting.intro')}</p>
      </header>

      <p role="note" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{t('notice.decisionSupport')}</p>

      <section aria-labelledby="upload-h" className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 id="upload-h" className="text-base font-semibold text-slate-900">{t('targeting.upload.title', 'Upload households')}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{t('targeting.upload.hint', 'Choose a CSV file, or try the demo file, then score it.')}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={onPick} className="hidden" aria-label={t('targeting.upload.choose')} />
          <button type="button" onClick={() => inputRef.current?.click()} className={primary}>{t('targeting.upload.choose')}</button>
          <button type="button" onClick={loadDemo} className={secondary}>{t('targeting.upload.demo')}</button>
          <a href={`${API_BASE}/api/template`} className={`text-sm text-emerald-800 underline ${focus}`}>{t('targeting.upload.template')}</a>
        </div>

        {fileError && <p role="alert" className="mt-3 text-sm text-red-700">{fileError}</p>}

        {file && (
          <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100 text-sm">
            {file && (
              <li className="flex flex-wrap items-center gap-3 py-3">
                <span className="text-slate-700">{t('targeting.upload.fileReady', { name: file.name, count: file.rows })}</span>
                <button type="button" onClick={run} disabled={score.isPending || file.rows === 0} className={primary}>
                  {score.isPending ? t('targeting.upload.scoring') : t('targeting.upload.score')}
                </button>
                <button type="button" onClick={clear} disabled={score.isPending} className={`text-slate-600 underline ${focus}`}>{t('targeting.upload.clear')}</button>
              </li>
            )}
          </ul>
        )}
      </section>

      {score.isError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <div className="font-medium">{t('targeting.error.title')}</div>
          {detail?.errors ? (
            <>
              <p className="mt-1 text-sm">{t('targeting.error.problems', { count: detail.totalErrors ?? detail.errors.length })}</p>
              <ul className="mt-2 max-h-64 list-disc space-y-1 overflow-y-auto pl-5 text-sm">{detail.errors.map((e, i) => <li key={i}>{e.text}</li>)}</ul>
              {(detail.totalErrors ?? 0) > detail.errors.length && <p className="mt-2 text-xs">{t('targeting.error.showingFirst', { n: detail.errors.length })}</p>}
              <p className="mt-2 text-sm">{t('targeting.error.fix')}</p>
            </>
          ) : (
            <p className="mt-1 text-sm">{apiErr?.message ?? t('dashboard.error')}</p>
          )}
        </div>
      )}

      {score.isPending && (
        <div className="space-y-2" aria-busy="true" aria-label={t('dashboard.loading')}>
          {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-9 animate-pulse rounded bg-slate-200/60" />)}
        </div>
      )}

      {result && (
        <section aria-labelledby="results-h" className="space-y-4">
          <h2 id="results-h" className="sr-only">{t('targeting.result.title', 'Results')}</h2>
          {result.isMock && <p role="status" className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">{t('targeting.result.mockBanner')}</p>}

          <div className="flex flex-wrap items-center gap-3">
            {RISKS.map((r) => (
              <div key={r} className="rounded-lg border border-slate-200 bg-white px-4 py-2">
                <RiskBadge level={r} />
                <div className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{result.summary[r]}</div>
              </div>
            ))}
            <p className="text-sm text-slate-600">
              {elapsed !== null ? t('targeting.result.elapsed', { count: result.count, seconds: elapsed.toFixed(1) }) : t('targeting.result.scored', { count: result.count })}
            </p>
            <a href={`${API_BASE}/api/export/${result.batchId}?lang=${lang}`} className={`ml-auto ${secondary}`}>{t('targeting.result.download')}</a>
          </div>

          <BatchInsights results={result.results} nameOf={nameOf} lang={lang} onPickDistrict={(c) => { setRiskFilter('High'); setDistrictFilter(c); setVisible(PAGE) }} />

          <div className="flex flex-wrap gap-4">
            <label className="text-sm">
              <span className="mr-2 text-slate-600">{t('targeting.filter.risk')}</span>
              <select value={riskFilter} onChange={(e) => { setRiskFilter(e.target.value as RiskLevel | 'all'); setVisible(PAGE) }} className={`rounded-md border border-slate-300 bg-white px-2 py-1 ${focus}`}>
                <option value="all">{t('targeting.filter.all')}</option>
                {RISKS.map((r) => <option key={r} value={r}>{t(`risk.${r}`)}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="mr-2 text-slate-600">{t('targeting.filter.district')}</span>
              <select value={districtFilter} onChange={(e) => { setDistrictFilter(e.target.value); setVisible(PAGE) }} className={`rounded-md border border-slate-300 bg-white px-2 py-1 ${focus}`}>
                <option value="all">{t('targeting.filter.all')}</option>
                {districtsInResult.map((c) => <option key={c} value={c}>{nameOf(c)}</option>)}
              </select>
            </label>
          </div>

          {rows.length === 0 ? (
            <p className="text-slate-500">{t('targeting.empty.noMatch')}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2" aria-sort={ariaSort('rank')}>
                      <button type="button" onClick={() => toggleSort('rank')} className={`font-medium ${focus}`}>{t('targeting.table.rank')} {sort.key === 'rank' ? (sort.dir === 'asc' ? '\u25b2' : '\u25bc') : ''}</button>
                    </th>
                    <th className="px-3 py-2 font-medium">{t('targeting.table.household')}</th>
                    <th className="px-3 py-2 font-medium">{t('table.district')}</th>
                    <th className="px-3 py-2 font-medium">{t('targeting.table.risk')}</th>
                    <th className="px-3 py-2 text-right" aria-sort={ariaSort('probability')}>
                      <button type="button" onClick={() => toggleSort('probability')} className={`font-medium ${focus}`}>{t('targeting.table.probability')} {sort.key === 'probability' ? (sort.dir === 'asc' ? '\u25b2' : '\u25bc') : ''}</button>
                    </th>
                    <th className="px-3 py-2 font-medium">{t('targeting.table.reasons')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, visible).map((r) => (
                    <tr key={r.id} className="cursor-pointer border-t border-slate-100 align-top hover:bg-slate-50" onClick={() => setSelectedId(r.id)}>
                      <td className="px-3 py-2 tabular-nums">{r.rank}</td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedId(r.id) }} className={`font-medium text-emerald-800 underline ${focus}`}>{r.id}</button>
                      </td>
                      <td className="px-3 py-2">{nameOf(r.districtCode)}</td>
                      <td className="px-3 py-2"><RiskBadge level={r.riskLevel} /></td>
                      <td className="px-3 py-2 text-right tabular-nums">{(r.probability * 100).toFixed(1)}%</td>
                      <td className="px-3 py-2">
                        <div className="flex max-w-md flex-wrap gap-1">
                          {r.drivers.length === 0 && <span className="text-slate-400">{'\u2014'}</span>}
                          {r.drivers.map((d) => <ReasonChip key={d.feature} kind="raises" text={d.sentence[lang]} />)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > visible && (
                <div className="border-t border-slate-100 p-3 text-center">
                  <button type="button" onClick={() => setVisible((v) => v + PAGE)} className={secondary}>{t('targeting.table.showMore', { shown: Math.min(visible, rows.length), total: rows.length })}</button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {!result && !score.isPending && !score.isError && !file && <p className="text-sm text-slate-500">{t('targeting.empty.start')}</p>}

      <Drawer open={!!selected} onClose={() => setSelectedId(null)} title={selected ? t('targeting.drawer.title', { id: selected.id }) : ''} closeLabel={t('targeting.drawer.close')}>
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <RiskBadge level={selected.riskLevel} />
              <span className="text-2xl font-semibold tabular-nums">{(selected.probability * 100).toFixed(1)}%</span>
              <span className="text-sm text-slate-500">{t('targeting.table.rank')} {selected.rank}, {nameOf(selected.districtCode)}</span>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">{t('targeting.drawer.why')}</h3>
              {selected.drivers.length + (selected.protective ? 1 : 0) === 0 ? (
                <p className="text-sm text-slate-500">{t('targeting.drawer.none')}</p>
              ) : (
                <ShapBar
                  axisLabel={t('targeting.drawer.axis')}
                  items={[
                    ...selected.drivers.map((d) => ({ label: d.label[lang], value: Math.abs(d.shap) })),
                    ...(selected.protective ? [{ label: selected.protective.label[lang], value: -Math.abs(selected.protective.shap) }] : []),
                  ]}
                />
              )}
            </div>
            <div className="space-y-2">
              {selected.drivers.map((d) => <ReasonChip key={d.feature} kind="raises" text={d.sentence[lang]} />)}
              {selected.protective && (
                <div>
                  <div className="mb-1 text-xs font-medium text-slate-500">{t('targeting.drawer.protective')}</div>
                  <ReasonChip kind="lowers" text={selected.protective.sentence[lang]} />
                </div>
              )}
            </div>
            <div>
              <h3 className="mb-1 font-semibold">{t('insights.steps', 'Suggested next steps')}</h3>
              <p className="text-sm text-slate-700">{nextSteps[selected.riskLevel]}</p>
            </div>

            <p className="text-xs text-slate-500">{t('notice.decisionSupport')}</p>
          </div>
        )}
      </Drawer>
    </div>
  )
}