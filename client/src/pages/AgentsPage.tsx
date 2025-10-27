import { useQuery } from '@tanstack/react-query'
import { agentsApi } from '@/lib/api'

export function AgentsPage() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.getAll,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">🤖</span>
          <h1 className="text-3xl font-bold text-text-primary">Agent Management</h1>
        </div>
        <button className="btn-primary">+ Add Agent</button>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <input
          type="text"
          placeholder="🔍 Search agents..."
          className="input-field"
        />
      </div>

      {/* Agent List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="glass-card p-6 text-center text-text-secondary">
            Loading agents...
          </div>
        ) : agents && agents.length > 0 ? (
          agents.map((agent) => (
            <div key={agent.id} className="glass-card p-6 hover:shadow-glass-hover transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-text-primary">{agent.name}</h3>
                    <span className="badge badge-success">
                      {agent.region === 'SG' ? '🌏 SG' : '🇨🇳 CN'}
                    </span>
                    <span className="badge badge-success">Active</span>
                  </div>
                  <p className="text-sm text-text-secondary">API: {agent.apiKey}</p>
                  <p className="text-xs text-text-tertiary mt-1">
                    Last used: {agent.lastUsed ? new Date(agent.lastUsed).toLocaleString() : 'Never'}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button className="btn-outline py-1 px-3 text-sm">Edit</button>
                  <button className="btn-secondary py-1 px-3 text-sm text-error">Delete</button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-card p-12 text-center">
            <p className="text-text-secondary mb-4">No agents found</p>
            <button className="btn-primary">+ Add Your First Agent</button>
          </div>
        )}
      </div>

      {agents && agents.length > 0 && (
        <p className="text-sm text-text-tertiary text-center">
          Showing {agents.length} agent(s)
        </p>
      )}
    </div>
  )
}

