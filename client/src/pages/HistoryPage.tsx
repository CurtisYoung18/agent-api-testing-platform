import { useQuery } from '@tanstack/react-query'
import { historyApi } from '@/lib/api'
import { useState } from 'react'

export function HistoryPage() {
  const [page, setPage] = useState(1)
  
  const { data, isLoading } = useQuery({
    queryKey: ['history', page],
    queryFn: () => historyApi.getAll({ page, limit: 20 }),
  })

  const handleDownload = async (id: number, format: 'excel' | 'markdown' | 'json') => {
    try {
      await historyApi.download(id, format)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Download failed. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <span className="text-3xl">📜</span>
        <h1 className="text-3xl font-bold text-text-primary">Test History</h1>
      </div>

      {/* Search and Filters */}
      <div className="glass-card p-4 flex items-center space-x-4">
        <input
          type="text"
          placeholder="🔍 Search..."
          className="input-field flex-1"
        />
        <select className="input-field w-48">
          <option value="">All Results</option>
          <option value="success">Success Only (&gt;80%)</option>
          <option value="failed">Failed Tests (&lt;80%)</option>
        </select>
        <select className="input-field w-48">
          <option value="testDate-desc">Newest First</option>
          <option value="testDate-asc">Oldest First</option>
          <option value="successRate-desc">Success Rate (High)</option>
        </select>
      </div>

      {/* Test Records */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="glass-card p-6 text-center text-text-secondary">
            Loading history...
          </div>
        ) : data && data.data.length > 0 ? (
          data.data.map((record) => (
            <div key={record.id} className="glass-card p-6 hover:shadow-glass-hover transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-text-tertiary">
                    {new Date(record.testDate).toLocaleString()}
                  </p>
                  <h3 className="text-lg font-semibold text-text-primary mt-1">
                    {record.agentName}
                  </h3>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className={`badge ${record.successRate >= 80 ? 'badge-success' : 'badge-warning'}`}>
                      {record.successRate >= 80 ? '✓' : '✗'} {record.passedCount}/{record.totalQuestions} ({record.successRate.toFixed(0)}%)
                    </span>
                    <span className="text-sm text-text-tertiary">
                      • {Math.floor(record.durationSeconds / 60)}m {record.durationSeconds % 60}s
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleDownload(record.id, 'excel')}
                    className="btn-outline py-1 px-3 text-sm"
                  >
                    📊 Excel
                  </button>
                  <button 
                    onClick={() => handleDownload(record.id, 'markdown')}
                    className="btn-outline py-1 px-3 text-sm"
                  >
                    📝 MD
                  </button>
                  <button 
                    onClick={() => handleDownload(record.id, 'json')}
                    className="btn-outline py-1 px-3 text-sm"
                  >
                    📋 JSON
                  </button>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="btn-secondary py-1 px-3 text-sm">View Details</button>
                <button className="btn-secondary py-1 px-3 text-sm text-error">Delete</button>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-card p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-lg text-text-secondary mb-4">No test history yet</p>
            <p className="text-sm text-text-tertiary mb-6">
              Run your first test to see results here
            </p>
            <a href="/test" className="btn-primary inline-block">
              Run Your First Test
            </a>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary"
          >
            Previous
          </button>
          <span className="flex items-center px-4 text-text-secondary">
            Page {page} of {data.pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
            disabled={page === data.pagination.totalPages}
            className="btn-secondary"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

