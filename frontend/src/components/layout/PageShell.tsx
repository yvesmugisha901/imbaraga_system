import type { ReactNode } from 'react'
import Navbar from './Navbar'

export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}