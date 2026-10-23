import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from './Navbar'

export default function PageShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-40 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow"
      >
        {t('nav.skip', 'Skip to main content')}
      </a>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs leading-5 text-slate-500 sm:px-6">
          {t('footer.note', 'Estimates support planning. A person should confirm every household before any decision is made.')}
        </p>
      </footer>
    </div>
  )
}