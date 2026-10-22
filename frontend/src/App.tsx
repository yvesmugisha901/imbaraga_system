import { Route, Routes } from 'react-router-dom'
import PageShell from './components/layout/PageShell'
import Dashboard from './pages/Dashboard'
import Targeting from './pages/Targeting'
import Insights from './pages/Insights'

export default function App() {
  return (
    <PageShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/targeting" element={<Targeting />} />
        <Route path="/insights" element={<Insights />} />
      </Routes>
    </PageShell>
  )
}