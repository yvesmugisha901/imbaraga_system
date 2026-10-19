import { Route, Routes } from 'react-router-dom'
import PageShell from './components/layout/PageShell'
import Dashboard from './pages/Dashboard'
import Placeholder from './pages/Placeholder'

export default function App() {
  return (
    <PageShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/targeting" element={<Placeholder titleKey="nav.targeting" />} />
        <Route path="/insights" element={<Placeholder titleKey="nav.insights" />} />
      </Routes>
    </PageShell>
  )
}