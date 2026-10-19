import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageToggle from './LanguageToggle'

const links = [
  { to: '/', key: 'nav.dashboard', end: true },
  { to: '/targeting', key: 'nav.targeting', end: false },
  { to: '/insights', key: 'nav.insights', end: false },
]

export default function Navbar() {
  const { t } = useTranslation()
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <div className="text-xl font-bold text-emerald-800">{t('app.name')}</div>
          <div className="text-xs text-slate-500 hidden sm:block">{t('app.tagline')}</div>
        </div>
        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-100'}`
              }
            >
              {t(l.key)}
            </NavLink>
          ))}
        </nav>
        <LanguageToggle />
      </div>
    </header>
  )
}