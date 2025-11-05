import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentsApi, type CreateAgentInput } from '@/lib/api'
import { AnimatePresence, motion } from 'framer-motion'
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
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

export function AgentsPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null)
  const [newAgent, setNewAgent] = useState<CreateAgentInput>({
    name: '',
    region: 'SG',
    apiKey: '',
  })
  const [formError, setFormError] = useState('')

  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.getAll,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => agentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      setDeleteConfirm(null)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateAgentInput) => agentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      setIsCreateModalOpen(false)
      setNewAgent({ name: '', region: 'SG', apiKey: '' })
      setFormError('')
    },
    onError: () => {
      setFormError('创建失败，请检查输入并重试')
    },
  })

  const handleDelete = (id: number, name: string) => {
    setDeleteConfirm({ id, name })
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id)
    }
  }

  const handleCreate = () => {
    if (!newAgent.name || !newAgent.apiKey) {
      setFormError('请填写所有必填字段')
      return
    }
    setFormError('')
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
          <AnimatePresence mode="popLayout">
            {filteredAgents.map((agent) => (
              <motion.div
                key={agent.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -100 }}
                transition={{ 
                  duration: 0.3,
                  layout: { duration: 0.3 }
                }}
                className="glass-card p-6 hover:shadow-glass-hover transition-all duration-200"
              >
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
                      className="btn-secondary py-1 px-3 text-sm text-error flex items-center space-x-1 disabled:opacity-50 hover:bg-red-500/10 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span>删除</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => !deleteMutation.isPending && setDeleteConfirm(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="glass-card p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-red-500/10 p-3 rounded-full">
                  <ExclamationTriangleIcon className="w-6 h-6 text-error" />
                </div>
                <h2 className="text-xl font-bold text-text-primary">确认删除</h2>
              </div>

              <p className="text-text-secondary mb-6">
                确定要删除 Agent "<span className="font-semibold text-text-primary">{deleteConfirm.name}</span>" 吗？此操作无法撤销。
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="btn-outline flex-1"
                  disabled={deleteMutation.isPending}
                >
                  取消
                </button>
                <button
                  onClick={confirmDelete}
                  className="btn-primary flex-1 bg-error hover:bg-error/90"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? '删除中...' : '确认删除'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Agent Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => !createMutation.isPending && setIsCreateModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="glass-card p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-text-primary">添加 Agent</h2>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                  disabled={createMutation.isPending}
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
                    disabled={createMutation.isPending}
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
                    disabled={createMutation.isPending}
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
                    disabled={createMutation.isPending}
                  />
                </div>

                {formError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                  >
                    <p className="text-sm text-error">{formError}</p>
                  </motion.div>
                )}

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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
