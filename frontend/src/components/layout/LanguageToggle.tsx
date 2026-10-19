import { useTranslation } from 'react-i18next'
import { setLang, type Lang } from '../../i18n'

export default function LanguageToggle() {
  const { i18n, t } = useTranslation()
  const current = (i18n.language === 'rw' ? 'rw' : 'en') as Lang
  const options: Lang[] = ['en', 'rw']

  return (
    <div role="group" aria-label={t('lang.label')} className="inline-flex rounded-md border border-slate-300 overflow-hidden">
      {options.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={current === l}
          className={`px-3 py-1 text-sm font-medium ${current === l ? 'bg-emerald-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}