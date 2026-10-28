import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { RiskLevel, ScoredHousehold } from '../../types'
import { useNextSteps } from './useNextSteps'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'

export default function BatchInsights({ results, nameOf, lang, onPickDistrict }: {
  results: ScoredHousehold[]
  nameOf: (code: string | null) => string
  lang: 'en' | 'rw'
  onPickDistrict: (code: string) => void
}) {
  const { t } = useTranslation()
  const steps = useNextSteps()

  const { places, reasons, highTotal } = useMemo(() => {
    const byDistrict = new Map<string, { high: number; all: number }>()
    const byReason = new Map<string, { label: string; n: number }>()
    let highTotal = 0
    for (const r of results) {
      if (r.districtCode) {
        const e = byDistrict.get(r.districtCode) ?? { high: 0, all: 0 }
        e.all += 1
        if (r.riskLevel === 'High') e.high += 1
        byDistrict.set(r.districtCode, e)
      }
      if (r.riskLevel === 'High') {
        highTotal += 1
        for (const d of r.drivers) {
          const e = byReason.get(d.feature) ?? { label: d.label[lang], n: 0 }
          e.n += 1
          byReason.set(d.feature, e)
        }
      }
    }
    return {
      places: [...byDistrict.entries()].filter(([, v]) => v.high > 0).sort((a, b) => b[1].high - a[1].high || b[1].high / b[1].all - a[1].high / a[1].all).slice(0, 5),
      reasons: [...byReason.values()].sort((a, b) => b.n - a.n).slice(0, 5),
      highTotal,
    }
  }, [results, lang])

  if (highTotal === 0) return null
  const card = 'rounded-lg border border-slate-200 bg-white p-4'

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <section aria-labelledby="ins-places" className={card}>
        <h3 id="ins-places" className="text-sm font-semibold text-slate-900">{t('insights.places', 'Visit these districts first')}</h3>
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {places.map(([code, v]) => (
            <li key={code}>
              <button type="button" onClick={() => onPickDistrict(code)} className={`flex w-full items-center justify-between gap-3 py-1.5 text-left hover:text-emerald-800 ${focus}`}>
                <span>{nameOf(code)}</span>
                <span className="tabular-nums text-slate-600">{t('insights.highOf', { defaultValue: '{{h}} of {{a}} high risk', h: v.high, a: v.all })}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ins-reasons" className={card}>
        <h3 id="ins-reasons" className="text-sm font-semibold text-slate-900">{t('insights.reasons', 'Most common reasons')}</h3>
        <p className="text-xs text-slate-500">{t('insights.reasonsNote', { defaultValue: 'Among {{n}} high-risk households', n: highTotal })}</p>
        <ul className="mt-2 space-y-2 text-sm">
          {reasons.map((r) => (
            <li key={r.label}>
              <div className="flex justify-between gap-3"><span>{r.label}</span><span className="tabular-nums text-slate-600">{r.n}</span></div>
              <div className="mt-1 h-1 rounded bg-slate-100"><div className="h-1 rounded bg-emerald-700" style={{ width: `${(r.n / highTotal) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ins-steps" className={card}>
        <h3 id="ins-steps" className="text-sm font-semibold text-slate-900">{t('insights.steps', 'Suggested next steps')}</h3>
        <dl className="mt-2 space-y-2 text-sm">
          {(['High', 'Medium', 'Low'] as RiskLevel[]).map((l) => (
            <div key={l}><dt className="font-medium text-slate-800">{t(`risk.${l}`)}</dt><dd className="text-slate-600">{steps[l]}</dd></div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-slate-500">{t('insights.caution', 'Scores are estimates. A person should confirm every household before any decision.')}</p>
      </section>
    </div>
  )
}