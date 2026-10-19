import { useTranslation } from 'react-i18next'

export default function Placeholder({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()
  return (
    <div>
      <h1 className="text-2xl font-bold">{t(titleKey)}</h1>
      <p className="mt-2 text-slate-500">{t('placeholder.soon')}</p>
      {titleKey === 'nav.targeting' && (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{t('notice.decisionSupport')}</p>
      )}
    </div>
  )
}