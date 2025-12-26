import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { TestPage } from './pages/TestPage'
import { AgentsPage } from './pages/AgentsPage'
import { HistoryPage } from './pages/HistoryPage'
import { ComparePage } from './pages/ComparePage'
import { ConversationQualityPage } from './pages/ConversationQualityPage'
import { ApiRequestPage } from './pages/ApiRequestPage'

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/test" replace />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/quality" element={<ConversationQualityPage />} />
          <Route path="/api-request" element={<ApiRequestPage />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App

