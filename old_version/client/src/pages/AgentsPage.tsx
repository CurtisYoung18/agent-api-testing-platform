import { useQuery } from '@tanstack/react-query'
import { agentsApi } from '@/lib/api'
import { 
  CpuChipIcon, 
  MagnifyingGlassIcon, 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  GlobeAsiaAustraliaIcon,
  MapIcon,
} from '@heroicons/react/24/outline'

export function AgentsPage() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.getAll,
  })

  const getRegionIcon = (region: string) => {
    return region === 'SG' ? <GlobeAsiaAustraliaIcon className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CpuChipIcon className="w-8 h-8 text-primary-500" />
          <h1 className="text-3xl font-bold text-text-primary">Agent 管理</h1>
        </div>
        <button className="btn-primary flex items-center space-x-2">
          <PlusIcon className="w-5 h-5" />
          <span>添加 Agent</span>
        </button>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="text"
            placeholder="搜索 agents..."
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Agent List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="glass-card p-6 text-center text-text-secondary">
            加载中...
          </div>
        ) : agents && agents.length > 0 ? (
          agents.map((agent) => (
            <div key={agent.id} className="glass-card p-6 hover:shadow-glass-hover transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-text-primary">{agent.name}</h3>
                    <span className="badge badge-success flex items-center space-x-1">
                      {getRegionIcon(agent.region)}
                      <span>{agent.region}</span>
                    </span>
                    <span className="badge badge-success flex items-center space-x-1">
                      <CheckCircleIcon className="w-3 h-3" />
                      <span>活跃</span>
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">API Key: {agent.apiKey}</p>
                  <p className="text-xs text-text-tertiary mt-1">
                    最后使用: {agent.lastUsed ? new Date(agent.lastUsed).toLocaleString('zh-CN') : '从未使用'}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button className="btn-outline py-1 px-3 text-sm flex items-center space-x-1">
                    <PencilIcon className="w-4 h-4" />
                    <span>编辑</span>
                  </button>
                  <button className="btn-secondary py-1 px-3 text-sm text-error flex items-center space-x-1">
                    <TrashIcon className="w-4 h-4" />
                    <span>删除</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-card p-12 text-center">
            <CpuChipIcon className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <p className="text-text-secondary mb-4">暂无 agents</p>
            <button className="btn-primary flex items-center space-x-2 mx-auto">
              <PlusIcon className="w-5 h-5" />
              <span>添加你的第一个 Agent</span>
            </button>
          </div>
        )}
      </div>

      {agents && agents.length > 0 && (
        <p className="text-sm text-text-tertiary text-center">
          共 {agents.length} 个 agent
        </p>
      )}
    </div>
  )
}
