import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageToggle from './LanguageToggle'

const links = [
  { to: '/', key: 'nav.dashboard', end: true },
  { to: '/targeting', key: 'nav.targeting', end: false },
  { to: '/insights', key: 'nav.insights', end: false },
]

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'

export default function Navbar() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const name = t('app.name')

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <NavLink to="/" onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-md ${focus}`}>
          <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-800 text-base font-semibold text-white">
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="leading-tight">
            <span className="block text-base font-semibold text-slate-900">{name}</span>
            <span className="hidden text-xs text-slate-500 sm:block">{t('app.tagline')}</span>
          </span>
        </NavLink>

        <nav aria-label={t('nav.main', 'Main navigation')} className="hidden h-full items-stretch gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center border-b-2 px-3 text-sm font-medium ${focus} ${
                  isActive ? 'border-emerald-700 text-slate-900' : 'border-transparent text-slate-600 hover:text-slate-900'
                }`
              }
            >
              {t(l.key)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={t('nav.menu', 'Menu')}
            onClick={() => setOpen((v) => !v)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 md:hidden ${focus}`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label={t('nav.main', 'Main navigation')} className="border-t border-slate-200 bg-white px-4 py-2 md:hidden">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block rounded-md px-3 py-3 text-base ${focus} ${isActive ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`
              }
            >
              {t(l.key)}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}