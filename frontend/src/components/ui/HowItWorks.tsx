import { useTranslation } from 'react-i18next'

const ICON = {
  ask: 'M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1zM8 6H6a1 1 0 00-1 1v13a1 1 0 001 1h12a1 1 0 001-1V7a1 1 0 00-1-1h-2M9 12h6M9 16h4',
  estimate: 'M5 20V11M12 20V4M19 20v-6',
  map: 'M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zM12 12.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z',
  act: 'M12 21s-7-4.35-7-10a4 4 0 017-2.65A4 4 0 0119 11c0 5.65-7 10-7 10z',
}

export default function HowItWorks() {
  const { t } = useTranslation()

  const steps = [
    { key: 'ask', d: ICON.ask, title: t('home.how.ask.title', 'Ask a few simple questions'), text: t('home.how.ask.text', 'Roof, land, savings, schooling. Things an officer can check in minutes.') },
    { key: 'estimate', d: ICON.estimate, title: t('home.how.estimate.title', 'Estimate who needs help'), text: t('home.how.estimate.text', 'Families are ranked as poor now, close to poverty, or stable.') },
    { key: 'map', d: ICON.map, title: t('home.how.map.title', 'See it on the map'), text: t('home.how.map.text', 'Districts with the most need stand out, with plain-language reasons.') },
    { key: 'act', d: ICON.act, title: t('home.how.act.title', 'Act before it gets worse'), text: t('home.how.act.text', 'Early warnings suggest next steps. A home visit confirms every family.') },
  ]

  return (
    <section aria-labelledby="how-title" className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 sm:p-8">
      <h2 id="how-title" className="text-xl font-semibold text-slate-900">{t('home.how.title', 'How Imbaraga works')}</h2>
      <p className="mt-1 text-sm text-slate-600">{t('home.how.subtitle', 'From a few simple questions to early help.')}</p>

      <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.key} className="relative rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={s.d} />
                </svg>
              </span>
              <span className="text-sm font-medium text-slate-400">{i + 1}</span>
            </div>
            <h3 className="mt-3 font-semibold text-slate-900">{s.title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{s.text}</p>
            {i < steps.length - 1 && (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute -right-3.5 top-1/2 hidden h-6 w-6 -translate-y-1/2 fill-none stroke-slate-300 lg:block" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}