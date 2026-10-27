import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { District, DistrictIndicators } from '../../types'

type Props = {
  district: District
  /** All 30 districts, used for the "typical district" (median) comparison. */
  all: District[]
  /** Display name already resolved for the current language. */
  name: string
}

type Driver = {
  key: keyof DistrictIndicators
  tKey: string
  label: string
  /** Which direction is better for people living there. */
  better: 'high' | 'low'
}

const DRIVERS: Driver[] = [
  { key: 'improvedWaterPct', tKey: 'profile.water', label: 'Improved drinking water', better: 'high' },
  { key: 'electricityPct', tKey: 'profile.electricity', label: 'Electricity', better: 'high' },
  { key: 'mobilePhonePct', tKey: 'profile.phone', label: 'Mobile phone ownership', better: 'high' },
  { key: 'landBelowHalfHaPct', tKey: 'profile.land', label: 'Households with under 0.5 ha of land', better: 'low' },
  { key: 'noLivestockPct', tKey: 'profile.livestock', label: 'Households with no livestock', better: 'low' },
  { key: 'agriWorkersPct', tKey: 'profile.agri', label: 'Workers in agriculture', better: 'low' },
]

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

const SEGMENTS = [
  { key: 'bankedPct', tKey: 'profile.fin.bank', label: 'Bank', color: 'bg-emerald-700' },
  { key: 'otherFormalPct', tKey: 'profile.fin.other', label: 'Other formal (mobile money, SACCO)', color: 'bg-emerald-400' },
  { key: 'informalOnlyPct', tKey: 'profile.fin.informal', label: 'Informal only', color: 'bg-amber-400' },
  { key: 'excludedPct', tKey: 'profile.fin.excluded', label: 'Excluded', color: 'bg-rose-500' },
] as const

export default function DistrictProfile({ district: d, all, name }: Props) {
  const { t } = useTranslation()

  const medians = useMemo(() => {
    const out: Partial<Record<keyof DistrictIndicators, number>> = {}
    for (const dr of DRIVERS) {
      const vals = all.map((x) => x.indicators?.[dr.key]).filter((v): v is number => typeof v === 'number')
      if (vals.length) out[dr.key] = median(vals)
    }
    return out
  }, [all])

  // Only districts with the official layer loaded get a profile.
  if (!d.indicators || d.povertyEicv5 == null || d.povertyRate == null) return null

  const change = d.povertyChangePoints ?? d.povertyRate - d.povertyEicv5
  const fa = d.financialAccess
  const hasFa = fa && fa.bankedPct != null && d.accessSource === 'finscope'
  const total = all.length || 30

  return (
    <section aria-label={t('profile.title', { defaultValue: 'Profile of {{name}}', name })} className="rounded-lg border border-slate-200 p-4 text-sm">
      <h3 className="text-base font-semibold text-slate-900">{t('profile.heading', { defaultValue: 'What is behind poverty here', name })}</h3>

      {/* Poverty then and now */}
      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-slate-500">{t('profile.poverty', 'Poverty rate, 2023/24')}</span>
          <span className="font-semibold tabular-nums text-slate-900">{d.povertyRate.toFixed(1)}%</span>
        </div>
        <p className="mt-1 text-slate-600">
          {t('profile.change', {
            defaultValue: '{{dir}} {{pts}} points from {{before}}% in 2016/17.',
            dir: change < 0 ? t('profile.down', 'Down') : t('profile.up', 'Up'),
            pts: Math.abs(change).toFixed(1),
            before: d.povertyEicv5.toFixed(1),
          })}
          {d.rankOfficial != null && (
            <>
              {' '}
              {t('profile.rank', {
                defaultValue: 'Ranked {{rank}} of {{total}} districts (1 is the highest poverty).',
                rank: d.rankOfficial,
                total,
              })}
            </>
          )}
        </p>
      </div>

      {/* Flags */}
      <div className="mt-4 space-y-2">
        <Flag
          on={!!d.highPovertyLowAccess}
          title={t('profile.flag.services', 'High poverty and low access to services')}
          rule={t('profile.flag.servicesRule', 'Poverty above the national 27.4% and among the third of districts with the lowest water, sanitation, electricity and phone access.')}
          yes={t('profile.flagged', 'Flagged')}
          no={t('profile.notFlagged', 'Not flagged')}
        />
        <Flag
          on={d.doubleExclusionFlag}
          title={t('profile.flag.double', 'Poor and financially excluded')}
          rule={t('profile.flag.doubleRule', 'Poverty above 27.4% and fewer than 90% of adults using formal financial services (national: 92%).')}
          yes={t('profile.flagged', 'Flagged')}
          no={t('profile.notFlagged', 'Not flagged')}
        />
      </div>

      {/* Drivers */}
      <h4 className="mt-5 text-sm font-semibold text-slate-900">{t('profile.drivers', 'Living conditions compared with a typical district')}</h4>
      <ul className="mt-2 space-y-3">
        {DRIVERS.map((dr) => {
          const v = d.indicators![dr.key]
          const med = medians[dr.key]
          if (v == null) return null
          const diff = med == null ? 0 : v - med
          const same = Math.abs(diff) < 2
          const good = dr.better === 'high' ? diff > 0 : diff < 0
          const verdict = same
            ? t('profile.same', 'About the same as a typical district')
            : t('profile.diff', {
                defaultValue: '{{pts}} points {{rel}} a typical district',
                pts: Math.abs(diff).toFixed(0),
                // "better/worse" only for services; land, livestock and farming are structural, so just above/below
                rel:
                  dr.better === 'high'
                    ? good
                      ? t('profile.better', 'better than')
                      : t('profile.worse', 'worse than')
                    : diff > 0
                      ? t('profile.above', 'above')
                      : t('profile.below', 'below'),
              })
          return (
            <li key={dr.key}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-slate-700">{t(dr.tKey, dr.label)}</span>
                <span className="font-medium tabular-nums text-slate-900">{v.toFixed(0)}%</span>
              </div>
              <div className="relative mt-1 h-1.5 rounded bg-slate-100" role="img" aria-label={`${t(dr.tKey, dr.label)}: ${v.toFixed(0)}%. ${verdict}`}>
                <span className={`block h-1.5 rounded ${dr.better === 'low' ? 'bg-slate-500' : good || same ? 'bg-emerald-600' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, Math.max(0, v))}%` }} />
                {med != null && <span className="absolute -top-0.5 h-2.5 w-0.5 bg-slate-600" style={{ left: `${Math.min(100, Math.max(0, med))}%` }} title={`${t('profile.median', 'Typical district')}: ${med.toFixed(0)}%`} />}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">{verdict}</div>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-xs text-slate-400">{t('profile.medianNote', 'The dark tick marks the median of the 30 districts.')}</p>

      {/* Financial access */}
      {hasFa && (
        <>
          <h4 className="mt-5 text-sm font-semibold text-slate-900">{t('profile.finTitle', 'Financial services used by adults')}</h4>
          <div
            className="mt-2 flex h-3 overflow-hidden rounded"
            role="img"
            aria-label={SEGMENTS.map((s) => `${t(s.tKey, s.label)} ${fa![s.key] ?? 0}%`).join(', ')}
          >
            {SEGMENTS.map((s) => {
              const v = fa![s.key] ?? 0
              return v > 0 ? <span key={s.key} className={s.color} style={{ flexGrow: v, flexBasis: 0 }} /> : null
            })}
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {SEGMENTS.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-slate-600">
                  <span className={`inline-block h-2 w-2 rounded-sm ${s.color}`} aria-hidden="true" />
                  {t(s.tKey, s.label)}
                </dt>
                <dd className="tabular-nums text-slate-900">{fa![s.key] ?? 0}%</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-slate-400">
            {t('profile.finNote', 'FinScope 2024 survey of about 400 adults per district. Small differences between districts are not reliable.')}
          </p>
        </>
      )}

      <p className="mt-4 text-xs text-slate-400">
        {t('profile.sources', 'Sources: NISR EICV7 2023/24 (poverty and living conditions); FinScope Rwanda 2024 (financial access).')}
      </p>
    </section>
  )
}

function Flag({ on, title, rule, yes, no }: { on: boolean; title: string; rule: string; yes: string; no: string }) {
  return (
    <div className={`rounded-md border p-2.5 ${on ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-slate-900">{title}</span>
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${on ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-600'}`}>{on ? yes : no}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{rule}</p>
    </div>
  )
}