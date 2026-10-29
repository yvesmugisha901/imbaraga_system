import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

export type NavItem = { id: string; label: string }

/** Section links. Rendered into the sticky header (#header-subnav) so they sit under the main nav. */
export default function SectionNav({ items, label, onNavigate }: { items: NavItem[]; offset?: number; label: string; onNavigate?: (id: string) => void }) {
  const host = useSyncExternalStore(
    () => () => {},
    () => document.getElementById('header-subnav'),
    () => null,
  )
  const [active, setActive] = useState(items[0]?.id ?? '')

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e)
    if (!els.length || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-120px 0px -65% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [items])

  const go = (id: string) => {
    onNavigate?.(id)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }))
    setActive(id)
  }

  const nav = (
    <nav data-section-nav aria-label={label} className="border-t border-slate-200 bg-white">
      <ul className="mx-auto flex max-w-6xl gap-6 overflow-x-auto px-4 sm:px-6">
        {items.map((i) => (
          <li key={i.id} className="shrink-0">
            <button
              type="button"
              onClick={() => go(i.id)}
              aria-current={active === i.id ? 'true' : undefined}
              className={`border-b-2 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 ${
                active === i.id ? 'border-emerald-800 font-medium text-slate-900' : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {i.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
  return host ? createPortal(nav, host) : nav
}