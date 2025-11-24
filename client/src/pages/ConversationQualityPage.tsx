import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlayIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { agentsApi, conversationsApi, qualityApi, type Conversation, type Message, type QualityScores } from '@/lib/api'

type QualityTag = 'UNRESOLVED' | 'PARTIALLY_RESOLVED' | 'FULLY_RESOLVED'

interface ConversationWithQuality extends Conversation {
  selected?: boolean
  qualityScores?: QualityScores
  messages?: Message[]
  showDetail?: boolean
  manualReview?: boolean
}

const tagConfig: Record<QualityTag, { label: string; color: string; icon: any; bgColor: string }> = {
  FULLY_RESOLVED: {
    label: '已解决',
    color: 'text-green-700',
    icon: CheckCircleIcon,
    bgColor: 'bg-green-100 border-green-300',
  },
  PARTIALLY_RESOLVED: {
    label: '部分解决',
    color: 'text-yellow-700',
    icon: ExclamationCircleIcon,
    bgColor: 'bg-yellow-100 border-yellow-300',
  },
  UNRESOLVED: {
    label: '未解决',
    color: 'text-red-700',
    icon: XCircleIcon,
    bgColor: 'bg-red-100 border-red-300',
  },
}

export function ConversationQualityPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null)
  const [selectedQualityAgentId, setSelectedQualityAgentId] = useState<number | null>(null)
  const [conversations, setConversations] = useState<ConversationWithQuality[]>([])
  const [page, setPage] = useState(1)
  const [expandedConversationId, setExpandedConversationId] = useState<string | null>(null)
  const [manualReviewConversationId, setManualReviewConversationId] = useState<string | null>(null)

  // Fetch agents
  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.getAll(),
  })

  // Fetch conversations
  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations', selectedAgentId, page],
    queryFn: () => {
      if (!selectedAgentId) throw new Error('No agent selected')
      return conversationsApi.getList({
        agentId: selectedAgentId,
        page,
        pageSize: 20,
        conversationType: 'ALL',
      })
    },
    enabled: !!selectedAgentId,
  })

  // Update conversations when data changes
  useEffect(() => {
    if (conversationsData?.list) {
      setConversations(conversationsData.list.map(conv => ({
        ...conv,
        selected: false,
        showDetail: false,
        manualReview: false,
      })))
    }
  }, [conversationsData])

  // Quality check mutation
  const qualityCheckMutation = useMutation({
    mutationFn: async ({ messages }: { messages: Message[] }) => {
      if (!selectedAgentId || !selectedQualityAgentId) {
        throw new Error('请选择 Agent 和质检 Agent')
      }
      return qualityApi.check({
        agentId: selectedAgentId,
        qualityAgentId: selectedQualityAgentId,
        messages,
      })
    },
  })

  // Quality submit mutation
  const qualitySubmitMutation = useMutation({
    mutationFn: async ({ answerId, quality }: { answerId: string; quality: QualityTag }) => {
      if (!selectedAgentId) {
        throw new Error('请选择 Agent')
      }
      return qualityApi.submit({
        agentId: selectedAgentId,
        answerId,
        quality,
      })
    },
  })

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId: string) => {
    if (!selectedAgentId) return

    try {
      const data = await conversationsApi.getMessages({
        agentId: selectedAgentId,
        conversationId,
        page: 1,
        pageSize: 100,
      })

      setConversations(prev => prev.map(conv => 
        conv.conversation_id === conversationId
          ? { ...conv, messages: data.list }
          : conv
      ))
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  // Toggle conversation selection
  const toggleSelection = (conversationId: string) => {
    setConversations(prev => prev.map(conv =>
      conv.conversation_id === conversationId
        ? { ...conv, selected: !conv.selected }
        : conv
    ))
  }

  // Toggle conversation detail
  const toggleDetail = async (conversationId: string) => {
    const conversation = conversations.find(c => c.conversation_id === conversationId)
    
    if (expandedConversationId === conversationId) {
      setExpandedConversationId(null)
    } else {
      setExpandedConversationId(conversationId)
      if (!conversation?.messages) {
        await fetchMessages(conversationId)
      }
    }
  }

  // Run quality check for selected conversations
  const runQualityCheck = async () => {
    const selectedConversations = conversations.filter(c => c.selected)
    
    if (selectedConversations.length === 0) {
      alert('请至少选择一个对话')
      return
    }

    if (!selectedQualityAgentId) {
      alert('请选择质检 Agent')
      return
    }

    for (const conv of selectedConversations) {
      if (!conv.messages || conv.messages.length === 0) {
        await fetchMessages(conv.conversation_id)
        // Wait a bit for messages to load
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      const updatedConv = conversations.find(c => c.conversation_id === conv.conversation_id)
      if (updatedConv?.messages) {
        try {
          const result = await qualityCheckMutation.mutateAsync({
            messages: updatedConv.messages,
          })

          setConversations(prev => prev.map(c =>
            c.conversation_id === conv.conversation_id
              ? { ...c, qualityScores: result.scores }
              : c
          ))
        } catch (error) {
          console.error(`Failed to check quality for ${conv.conversation_id}:`, error)
        }
      }
    }
  }

  // Submit quality result
  const submitQuality = async (conversationId: string, quality: QualityTag) => {
    const conversation = conversations.find(c => c.conversation_id === conversationId)
    if (!conversation?.messages) return

    // Find the last assistant message
    const lastAssistantMessage = [...conversation.messages]
      .reverse()
      .find(msg => msg.role === 'assistant' || msg.role === 'ASSISTANT')

    if (!lastAssistantMessage?.message_id) {
      alert('未找到回复消息 ID')
      return
    }

    try {
      await qualitySubmitMutation.mutateAsync({
        answerId: lastAssistantMessage.message_id,
        quality,
      })
      
      setConversations(prev => prev.map(c =>
        c.conversation_id === conversationId
          ? { ...c, manualReview: false }
          : c
      ))
      setManualReviewConversationId(null)
      alert('质检结果已提交')
    } catch (error: any) {
      alert(`提交失败: ${error.message || '未知错误'}`)
    }
  }

  // Get highest confidence quality tag
  const getHighestQuality = (scores?: QualityScores): QualityTag | null => {
    if (!scores) return null
    
    const entries = Object.entries(scores) as [QualityTag, number][]
    const sorted = entries.sort((a, b) => b[1] - a[1])
    return sorted[0][0]
  }

  const selectedCount = conversations.filter(c => c.selected).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
            <ChatBubbleLeftRightIcon className="w-8 h-8 text-primary-500" />
            对话质检
          </h1>
          <p className="mt-2 text-text-secondary">
            使用 AI 作为第三方视角，评估客户与 AI 对话的完成度
          </p>
        </div>
      </div>

      {/* Agent Selection */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">选择 Agent</h2>
        {agentsLoading ? (
          <div className="flex items-center justify-center py-8">
            <ArrowPathIcon className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                被质检的 Agent
              </label>
              <select
                value={selectedAgentId || ''}
                onChange={(e) => {
                  setSelectedAgentId(e.target.value ? parseInt(e.target.value) : null)
                  setPage(1)
                  setConversations([])
                }}
                className="w-full px-4 py-2 border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-white"
              >
                <option value="">请选择 Agent</option>
                {agents?.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.region})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                质检 Agent（用于分析对话质量）
              </label>
              <select
                value={selectedQualityAgentId || ''}
                onChange={(e) => setSelectedQualityAgentId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-2 border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-white"
              >
                <option value="">请选择质检 Agent</option>
                {agents?.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.region})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Conversations List */}
      {selectedAgentId && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary">会话列表</h2>
            <div className="flex items-center gap-4">
              {selectedCount > 0 && (
                <span className="text-sm text-text-secondary">
                  已选择 {selectedCount} 个会话
                </span>
              )}
              {selectedCount > 0 && selectedQualityAgentId && (
                <button
                  onClick={runQualityCheck}
                  disabled={qualityCheckMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {qualityCheckMutation.isPending ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      质检中...
                    </>
                  ) : (
                    <>
                      <PlayIcon className="w-5 h-5" />
                      运行质检
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {conversationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <ArrowPathIcon className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 text-text-tertiary">
              暂无会话记录
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conversation) => {
                const highestQuality = getHighestQuality(conversation.qualityScores)
                const isExpanded = expandedConversationId === conversation.conversation_id
                const isManualReview = manualReviewConversationId === conversation.conversation_id

                return (
                  <motion.div
                    key={conversation.conversation_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-primary-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={conversation.selected || false}
                        onChange={() => toggleSelection(conversation.conversation_id)}
                        className="mt-1 w-5 h-5 text-primary-500 rounded focus:ring-primary-400"
                      />

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-text-primary">
                              {conversation.subject || '无主题'}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                              <span>用户: {conversation.user_id}</span>
                              <span>消息数: {conversation.message_count}</span>
                              <span>
                                时间: {new Date(conversation.recent_chat_time).toLocaleString('zh-CN')}
                              </span>
                            </div>
                          </div>

                          {/* Quality Result */}
                          {conversation.qualityScores && highestQuality && (
                            <div className="flex items-center gap-3">
                              <div className="flex gap-2">
                                {Object.entries(conversation.qualityScores).map(([key, value]) => {
                                  const tag = key as QualityTag
                                  const config = tagConfig[tag]
                                  const IconComponent = config.icon
                                  return (
                                    <div
                                      key={key}
                                      className={`flex items-center gap-1 px-2 py-1 rounded border ${config.bgColor} ${config.color}`}
                                    >
                                      <IconComponent className="w-4 h-4" />
                                      <span className="text-xs font-medium">{config.label}</span>
                                      <span className="text-xs">{value}%</span>
                                    </div>
                                  )
                                })}
                              </div>
                              <button
                                onClick={() => {
                                  const quality = highestQuality
                                  submitQuality(conversation.conversation_id, quality)
                                }}
                                disabled={qualitySubmitMutation.isPending}
                                className={`flex items-center gap-1 px-3 py-1 rounded-lg border ${tagConfig[highestQuality].bgColor} ${tagConfig[highestQuality].color} hover:opacity-80 transition-opacity`}
                              >
                                <CheckIcon className="w-4 h-4" />
                                <span className="text-sm font-medium">应用 {tagConfig[highestQuality].label}</span>
                              </button>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setManualReviewConversationId(
                                  isManualReview ? null : conversation.conversation_id
                                )
                              }}
                              className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            >
                              人工审核
                            </button>
                            <button
                              onClick={() => toggleDetail(conversation.conversation_id)}
                              className="p-2 text-text-secondary hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronUpIcon className="w-5 h-5" />
                              ) : (
                                <ChevronDownIcon className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Manual Review Bubble */}
                        <AnimatePresence>
                          {isManualReview && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: -10 }}
                              className="mt-3 p-3 bg-primary-50 rounded-lg border border-primary-200"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-text-primary">选择质检结果：</span>
                                {Object.entries(tagConfig).map(([key, config]) => {
                                  const tag = key as QualityTag
                                  const IconComponent = config.icon
                                  return (
                                    <button
                                      key={key}
                                      onClick={() => submitQuality(conversation.conversation_id, tag)}
                                      className={`flex items-center gap-1 px-3 py-1 rounded border ${config.bgColor} ${config.color} hover:opacity-80 transition-opacity`}
                                    >
                                      <IconComponent className="w-4 h-4" />
                                      <span className="text-sm">{config.label}</span>
                                    </button>
                                  )
                                })}
                                <button
                                  onClick={() => setManualReviewConversationId(null)}
                                  className="ml-auto p-1 text-text-secondary hover:text-text-primary"
                                >
                                  <XMarkIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Conversation Detail */}
                        <AnimatePresence>
                          {isExpanded && conversation.messages && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 pt-4 border-t border-primary-200"
                            >
                              <div className="space-y-3 max-h-96 overflow-y-auto">
                                {conversation.messages.map((msg, idx) => {
                                  const isUser = msg.role === 'user' || msg.role === 'USER'
                                  const content = msg.content || msg.text || ''
                                  return (
                                    <div
                                      key={msg.message_id || idx}
                                      className={`p-3 rounded-lg ${
                                        isUser
                                          ? 'bg-blue-50 border border-blue-200'
                                          : 'bg-gray-50 border border-gray-200'
                                      }`}
                                    >
                                      <div className="flex items-start gap-2">
                                        <span className={`text-xs font-medium ${
                                          isUser ? 'text-blue-600' : 'text-gray-600'
                                        }`}>
                                          {isUser ? '用户' : 'AI'}
                                        </span>
                                        <span className="text-xs text-text-tertiary">
                                          {msg.created_at ? new Date(msg.created_at).toLocaleString('zh-CN') : ''}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-sm text-text-primary whitespace-pre-wrap">
                                        {content}
                                      </p>
                                    </div>
                                  )
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {conversationsData && conversationsData.total > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-text-secondary">
                共 {conversationsData.total} 条记录
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-primary-200 rounded-lg hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  上一页
                </button>
                <span className="px-4 py-2 text-sm text-text-secondary">
                  第 {page} 页
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={conversationsData.list.length < 20}
                  className="px-4 py-2 border border-primary-200 rounded-lg hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Section */}
      {!selectedAgentId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-text-primary mb-3">使用说明</h3>
          <ol className="space-y-2 text-sm text-text-secondary list-decimal list-inside">
            <li>在 Agents 页面创建 Agent</li>
            <li>选择被质检的 Agent 和用于质检的 Agent</li>
            <li>勾选需要质检的对话</li>
            <li>点击"运行质检"按钮进行批量质检</li>
            <li>查看质检结果，点击"应用"按钮提交结果，或点击"人工审核"手动选择</li>
          </ol>
        </motion.div>
      )}
    </div>
  )
}
