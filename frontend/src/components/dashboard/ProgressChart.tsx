import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { District } from '../../types'

type Props = { districts: District[]; nameOf: (d: District) => string; onSelect: (code: string) => void }
type SortKey = 'poverty' | 'slowest' | 'fastest'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'
const minus = '\u2212'

/** Poverty in 2016/17 (EICV5) against 2023/24 (EICV7) for every district. Official NISR figures only. */
export default function ProgressChart({ districts, nameOf, onSelect }: Props) {
  const { t } = useTranslation()
  const [sort, setSort] = useState<SortKey>('poverty')

  const rows = useMemo(
    () => districts.filter((d): d is District & { povertyRate: number; povertyEicv5: number } => d.povertyRate != null && d.povertyEicv5 != null),
    [districts],
  )

  const sorted = useMemo(() => {
    const change = (d: District & { povertyRate: number; povertyEicv5: number }) => d.povertyRate - d.povertyEicv5
    const out = [...rows]
    if (sort === 'poverty') out.sort((a, b) => b.povertyRate - a.povertyRate)
    if (sort === 'slowest') out.sort((a, b) => change(b) - change(a))
    if (sort === 'fastest') out.sort((a, b) => change(a) - change(b))
    return out
  }, [rows, sort])

  const max = useMemo(() => Math.ceil(Math.max(0, ...rows.flatMap((d) => [d.povertyRate, d.povertyEicv5])) / 10) * 10 || 10, [rows])
  const ticks = Array.from({ length: max / 10 + 1 }, (_, i) => i * 10)

  const summary = useMemo(() => {
    if (!rows.length) return null
    const changes = rows.map((d) => d.povertyRate - d.povertyEicv5)
    const fell = changes.filter((c) => c < 0).length
    const avg = changes.reduce((a, b) => a + b, 0) / changes.length
    return { fell, total: rows.length, avg }
  }, [rows])

  if (!rows.length || !summary) return null

  const sorts: { key: SortKey; label: string }[] = [
    { key: 'poverty', label: t('progress.sort.poverty', 'Highest poverty now') },
    { key: 'slowest', label: t('progress.sort.slowest', 'Smallest fall') },
    { key: 'fastest', label: t('progress.sort.fastest', 'Largest fall') },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-2xl text-sm text-slate-700">
          {t('progress.summary', {
            defaultValue: 'Poverty fell in {{fell}} of {{total}} districts between 2016/17 and 2023/24, by {{avg}} points on average.',
            fell: summary.fell,
            total: summary.total,
            avg: Math.abs(summary.avg).toFixed(1),
          })}
        </p>
        <div role="group" aria-label={t('progress.sortLabel', 'Sort districts by')} className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {sorts.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={sort === s.key}
              onClick={() => setSort(s.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${focus} ${sort === s.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full border-2 border-slate-400 bg-white" />
          {t('progress.legend.before', '2016/17 (EICV5)')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full bg-emerald-600" />
          {t('progress.legend.after', '2023/24 (EICV7)')}
        </span>
        <span className="text-slate-400">{t('progress.axis', 'Share of people in poverty (%)')}</span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[34rem]">
          <div className="grid grid-cols-[8rem_1fr_5rem] gap-3 sm:grid-cols-[9rem_1fr_5.5rem]" aria-hidden="true">
            <span />
            <div className="relative h-4 text-xs text-slate-400">
              {ticks.map((v) => (
                <span key={v} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${(v / max) * 100}%` }}>
                  {v}
                </span>
              ))}
            </div>
            <span />
          </div>

          <ul className="mt-1">
            {sorted.map((d) => {
              const change = d.povertyRate - d.povertyEicv5
              const lo = Math.min(d.povertyRate, d.povertyEicv5)
              const hi = Math.max(d.povertyRate, d.povertyEicv5)
              const fell = change < 0
              const label = t('progress.rowLabel', {
                defaultValue: '{{name}}: {{before}}% in 2016/17, {{after}}% in 2023/24, {{dir}} {{pts}} points',
                name: nameOf(d),
                before: d.povertyEicv5.toFixed(1),
                after: d.povertyRate.toFixed(1),
                dir: fell ? t('progress.down', 'down') : t('progress.up', 'up'),
                pts: Math.abs(change).toFixed(1),
              })
              return (
                <li key={d.code} className="grid grid-cols-[8rem_1fr_5rem] items-center gap-3 border-t border-slate-100 first:border-0 sm:grid-cols-[9rem_1fr_5.5rem]">
                  <button type="button" onClick={() => onSelect(d.code)} className={`truncate rounded py-1.5 text-left text-sm text-slate-800 hover:underline ${focus}`} title={label}>
                    {nameOf(d)}
                  </button>
                  <div
                    role="img"
                    aria-label={label}
                    className="relative h-7"
                    style={{ backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px)', backgroundSize: `${100 / (max / 10)}% 100%` }}
                  >
                    <span className={`absolute top-1/2 h-1 -translate-y-1/2 rounded ${fell ? 'bg-emerald-200' : 'bg-rose-300'}`} style={{ left: `${(lo / max) * 100}%`, width: `${((hi - lo) / max) * 100}%` }} />
                    <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-400 bg-white" style={{ left: `${(d.povertyEicv5 / max) * 100}%` }} />
                    <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600 ring-2 ring-white" style={{ left: `${(d.povertyRate / max) * 100}%` }} />
                  </div>
                  <span className={`text-right text-sm font-medium tabular-nums ${fell ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {fell ? minus : '+'}
                    {Math.abs(change).toFixed(1)} {t('progress.pts', 'pts')}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {t('progress.note', 'District estimates have margins of error, so small changes may not be meaningful. A district that started low, such as Kicukiro, has less room to fall.')}
      </p>
    </div>
  )
}