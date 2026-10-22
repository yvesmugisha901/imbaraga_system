import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { District } from '../../types'
import type { DistrictVulnerability } from '../../api/vulnerability'

const PAGE_SIZE = 10

type SortKey = 'poverty' | 'close' | 'name' | 'people'

interface Props {
  districts: District[]
  lang: 'en' | 'rw'
  vulnByCode?: Record<string, DistrictVulnerability> | null
  onSelect: (code: string) => void
}

export default function DistrictTable({ districts, lang, vulnByCode, onSelect }: Props) {
  const { t } = useTranslation()
  const fmt = new Intl.NumberFormat(lang === 'rw' ? 'en-RW' : 'en-US')
  const pending = t('dashboard.pending')
  const nameOf = (d: District) => (lang === 'rw' && d.nameRw ? d.nameRw : d.nameEn)

  const [query, setQuery] = useState('')
  const [province, setProvince] = useState('all')
  const [sort, setSort] = useState<SortKey>('poverty')
  const [page, setPage] = useState(1)

  const provinces = useMemo(() => Array.from(new Set(districts.map((d) => d.province))).sort(), [districts])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const closeOf = (d: District) => vulnByCode?.[d.code]?.share_at_risk ?? -1
    return districts
      .filter((d) => (province === 'all' || d.province === province) && (!q || nameOf(d).toLowerCase().includes(q) || d.nameEn.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (sort === 'name') return nameOf(a).localeCompare(nameOf(b))
        if (sort === 'people') return b.population - a.population
        if (sort === 'close') return closeOf(b) - closeOf(a)
        return (b.povertyRate ?? -1) - (a.povertyRate ?? -1)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districts, query, province, sort, vulnByCode, lang])

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const start = (current - 1) * PAGE_SIZE
  const visible = rows.slice(start, start + PAGE_SIZE)

  const field = 'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm'

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">{t('home.table.search', 'Find a district')}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
            placeholder={t('home.table.searchHint', 'Type a name')}
            className={field}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">{t('home.table.province', 'Province')}</span>
          <select value={province} onChange={(e) => { setProvince(e.target.value); setPage(1) }} className={field}>
            <option value="all">{t('home.table.allProvinces', 'All provinces')}</option>
            {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">{t('home.table.sort', 'Show first')}</span>
          <select value={sort} onChange={(e) => { setSort(e.target.value as SortKey); setPage(1) }} className={field}>
            <option value="poverty">{t('home.table.sortPoverty', 'Most poverty')}</option>
            {vulnByCode && <option value="close">{t('home.table.sortClose', 'Most families close to poverty')}</option>}
            <option value="people">{t('home.table.sortPeople', 'Most people')}</option>
            <option value="name">{t('home.table.sortName', 'Name (A to Z)')}</option>
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">{t('home.table.none', 'No districts match your search.')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">{t('home.col.district', 'District')}</th>
                <th className="px-3 py-2">{t('home.col.province', 'Province')}</th>
                <th className="px-3 py-2 text-right">{t('home.col.people', 'People')}</th>
                <th className="px-3 py-2 text-right">{t('home.col.poverty', 'In poverty')}</th>
                {vulnByCode && <th className="px-3 py-2 text-right">{t('home.col.close', 'Close to poverty')}</th>}
                <th className="px-3 py-2">{t('home.col.source', 'How we know')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d) => {
                const v = vulnByCode?.[d.code]
                return (
                  <tr key={d.code} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">
                      <button type="button" onClick={() => onSelect(d.code)} className="text-left underline-offset-2 hover:underline">
                        {nameOf(d)}
                      </button>
                    </td>
                    <td className="px-3 py-2">{d.province}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt.format(d.population)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{d.povertyRate !== null && d.povertyRate !== undefined ? `${d.povertyRate}%` : pending}</td>
                    {vulnByCode && <td className="px-3 py-2 text-right tabular-nums">{v ? `${Math.round(v.share_at_risk * 100)}%` : pending}</td>}
                    <td className="px-3 py-2 text-slate-500">{t(`dashboard.source.${d.povertyRateSource}`)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <nav aria-label={t('home.table.pages', 'Pages')} className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-slate-600">
            {t('home.table.showing', {
              from: start + 1,
              to: start + visible.length,
              total: rows.length,
              defaultValue: 'Showing {{from}} to {{to}} of {{total}} districts',
            })}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)} className="rounded-md border border-slate-300 px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:text-slate-400">
              {t('home.table.prev', 'Previous')}
            </button>
            <span className="tabular-nums">{t('home.table.pageOf', { page: current, pages, defaultValue: 'Page {{page}} of {{pages}}' })}</span>
            <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)} className="rounded-md border border-slate-300 px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:text-slate-400">
              {t('home.table.next', 'Next')}
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}