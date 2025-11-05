import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentsApi, type CreateAgentInput } from '@/lib/api'
import { 
  CpuChipIcon, 
  MagnifyingGlassIcon, 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  GlobeAsiaAustraliaIcon,
  MapIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

export function AgentsPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newAgent, setNewAgent] = useState<CreateAgentInput>({
    name: '',
    region: 'SG',
    apiKey: '',
  })

  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.getAll,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => agentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateAgentInput) => agentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      setIsCreateModalOpen(false)
      setNewAgent({ name: '', region: 'SG', apiKey: '' })
    },
  })

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`确定要删除 "${name}" 吗？`)) {
      deleteMutation.mutate(id)
    }
  }

  const handleCreate = () => {
    if (!newAgent.name || !newAgent.apiKey) {
      alert('请填写所有必填字段')
      return
    }
    createMutation.mutate(newAgent)
  }

  const getRegionIcon = (region: string) => {
    return region === 'SG' ? <GlobeAsiaAustraliaIcon className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />
  }

  const filteredAgents = agents?.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.region.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CpuChipIcon className="w-8 h-8 text-primary-500" />
          <h1 className="text-3xl font-bold text-text-primary">Agent 管理</h1>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary flex items-center space-x-2"
        >
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Agent List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="glass-card p-6 text-center text-text-secondary">
            加载中...
          </div>
        ) : filteredAgents && filteredAgents.length > 0 ? (
          filteredAgents.map((agent) => (
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
                  <button 
                    onClick={() => handleDelete(agent.id, agent.name)}
                    disabled={deleteMutation.isPending}
                    className="btn-secondary py-1 px-3 text-sm text-error flex items-center space-x-1 disabled:opacity-50"
                  >
                    <TrashIcon className="w-4 h-4" />
                    <span>{deleteMutation.isPending ? '删除中...' : '删除'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-card p-12 text-center">
            <CpuChipIcon className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <p className="text-text-secondary mb-4">
              {searchQuery ? '未找到匹配的 agents' : '暂无 agents'}
            </p>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary flex items-center space-x-2 mx-auto"
            >
              <PlusIcon className="w-5 h-5" />
              <span>添加你的第一个 Agent</span>
            </button>
          </div>
        )}
      </div>

      {filteredAgents && filteredAgents.length > 0 && (
        <p className="text-sm text-text-tertiary text-center">
          {searchQuery ? `找到 ${filteredAgents.length} 个 agent` : `共 ${filteredAgents.length} 个 agent`}
        </p>
      )}

      {/* Create Agent Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-text-primary">添加 Agent</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-text-tertiary hover:text-text-primary"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  名称 *
                </label>
                <input
                  type="text"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  className="input-field"
                  placeholder="例如: Production Agent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  区域 *
                </label>
                <select
                  value={newAgent.region}
                  onChange={(e) => setNewAgent({ ...newAgent, region: e.target.value as 'SG' | 'CN' })}
                  className="input-field"
                >
                  <option value="SG">新加坡 (SG)</option>
                  <option value="CN">中国 (CN)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  API Key *
                </label>
                <input
                  type="text"
                  value={newAgent.apiKey}
                  onChange={(e) => setNewAgent({ ...newAgent, apiKey: e.target.value })}
                  className="input-field"
                  placeholder="输入 API Key"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-outline flex-1"
                  disabled={createMutation.isPending}
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  className="btn-primary flex-1"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? '创建中...' : '创建'}
                </button>
              </div>

              {createMutation.isError && (
                <p className="text-sm text-error text-center">
                  创建失败，请重试
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
