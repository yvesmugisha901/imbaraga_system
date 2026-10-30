import ImbaragaAIChatbot from './components/ImbaragaAIChatbot';
import { Route, Routes } from 'react-router-dom'
import PageShell from './components/layout/PageShell'
import Dashboard from './pages/Dashboard'
import Targeting from './pages/Targeting'
import Insights from './pages/Insights'

function OriginalApp() {
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
export default function App() { return (<><OriginalApp /><ImbaragaAIChatbot /></>); }

