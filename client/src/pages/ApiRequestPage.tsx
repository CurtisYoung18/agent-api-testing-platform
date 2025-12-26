import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { agentsApi } from '@/lib/api'
import { motion } from 'framer-motion'
import {
  CommandLineIcon,
  ChatBubbleLeftRightIcon,
  CogIcon,
  UserIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowPathIcon,
  LinkIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'

type ApiCategory = 'conversation' | 'workflow' | 'user'

interface ApiEndpoint {
  id: string
  name: string
  method: 'GET' | 'POST'
  endpoint: string
  description: string
  params: ParamConfig[]
  bodyParams?: ParamConfig[]
}

interface ParamConfig {
  name: string
  type: 'string' | 'number' | 'boolean' | 'json' | 'select'
  required: boolean
  description: string
  default?: string
  options?: { value: string; label: string }[]
}

// API Endpoints Configuration
const conversationApis: ApiEndpoint[] = [
  {
    id: 'create_conversation',
    name: '创建对话ID',
    method: 'POST',
    endpoint: '/v1/conversation',
    description: '创建并获取一个conversation_id，用于用户与Agent进行对话',
    params: [],
    bodyParams: [
      { name: 'user_id', type: 'string', required: true, description: '用户标识，最长32字符' },
    ],
  },
  {
    id: 'send_message',
    name: '发送消息',
    method: 'POST',
    endpoint: '/v2/conversation/message',
    description: '向指定的conversation_id发送消息，获取Agent响应',
    params: [],
    bodyParams: [
      { name: 'conversation_id', type: 'string', required: true, description: '对话唯一标识符' },
      {
        name: 'response_mode',
        type: 'select',
        required: true,
        description: '响应模式',
        default: 'blocking',
        options: [
          { value: 'blocking', label: '阻塞型 (blocking)' },
          { value: 'streaming', label: '流式返回 (streaming)' },
          { value: 'webhook', label: 'Webhook模式' },
        ],
      },
      { name: 'message_text', type: 'string', required: true, description: '消息文本内容' },
    ],
  },
  {
    id: 'get_conversations',
    name: '获取对话列表',
    method: 'GET',
    endpoint: '/v1/bot/conversation/page',
    description: '获取Agent所有对话的列表',
    params: [
      {
        name: 'conversation_type',
        type: 'select',
        required: true,
        description: '对话ID来源类型',
        default: 'ALL',
        options: [
          { value: 'ALL', label: '全部' },
          { value: 'API', label: 'API' },
          { value: 'EMBED', label: 'Iframe' },
          { value: 'WIDGET', label: '部件气泡' },
          { value: 'SHARE', label: '分享' },
        ],
      },
      { name: 'user_id', type: 'string', required: false, description: '用户ID（可选）' },
      { name: 'start_time', type: 'number', required: true, description: '开始时间戳(ms)', default: String(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      { name: 'end_time', type: 'number', required: true, description: '结束时间戳(ms)', default: String(Date.now()) },
      { name: 'page', type: 'number', required: true, description: '页码', default: '1' },
      { name: 'page_size', type: 'number', required: true, description: '每页数量(1-100)', default: '20' },
    ],
  },
  {
    id: 'get_messages',
    name: '获取对话消息明细',
    method: 'GET',
    endpoint: '/v2/messages',
    description: '获取指定对话内的所有消息内容',
    params: [
      { name: 'conversation_id', type: 'string', required: true, description: '对话标识符' },
      { name: 'page', type: 'number', required: true, description: '页数', default: '1' },
      { name: 'page_size', type: 'number', required: true, description: '每页数量(最多100)', default: '100' },
    ],
  },
  {
    id: 'next_question',
    name: '生成建议问题',
    method: 'GET',
    endpoint: '/v1/next/question',
    description: '基于Agent的回复消息，生成建议问题',
    params: [
      { name: 'answer_id', type: 'string', required: true, description: 'Agent回复的消息ID' },
    ],
  },
  {
    id: 'correlate_dataset',
    name: '获取回答引用知识',
    method: 'GET',
    endpoint: '/v1/correlate/dataset',
    description: '获取Agent回答所引用的知识库切片数据',
    params: [
      { name: 'message_id', type: 'string', required: true, description: 'Agent回复的消息ID' },
    ],
  },
  {
    id: 'message_feedback',
    name: 'Agent回复反馈',
    method: 'POST',
    endpoint: '/v1/message/feedback',
    description: '对Agent的生成内容进行反馈',
    params: [],
    bodyParams: [
      { name: 'answer_id', type: 'string', required: true, description: 'Agent回复的消息ID' },
      {
        name: 'feedback',
        type: 'select',
        required: true,
        description: '反馈类型',
        options: [
          { value: 'POSITIVE', label: '积极/点赞' },
          { value: 'NEGATIVE', label: '消极/点倒' },
          { value: 'CANCELED', label: '取消反馈' },
        ],
      },
    ],
  },
  {
    id: 'message_quality',
    name: '消息质量标记',
    method: 'POST',
    endpoint: '/v1/message/quality',
    description: '标记消息的解决质量',
    params: [],
    bodyParams: [
      { name: 'answer_id', type: 'string', required: true, description: 'Agent回复的消息ID' },
      {
        name: 'quality',
        type: 'select',
        required: true,
        description: '质量标记',
        options: [
          { value: 'UNRESOLVED', label: '未解决' },
          { value: 'PARTIALLY_RESOLVED', label: '部分解决' },
          { value: 'FULLY_RESOLVED', label: '完全解决' },
        ],
      },
    ],
  },
]

const workflowApis: ApiEndpoint[] = [
  {
    id: 'invoke_workflow',
    name: '运行工作流',
    method: 'POST',
    endpoint: '/v1/workflow/invoke',
    description: '通过API运行工作流并获取执行结果',
    params: [],
    bodyParams: [
      { name: 'userId', type: 'string', required: false, description: '用户ID（可选）' },
      { name: 'input', type: 'json', required: true, description: '工作流输入参数(JSON格式)', default: '{}' },
    ],
  },
]

const userApis: ApiEndpoint[] = [
  {
    id: 'update_property',
    name: '更新用户属性',
    method: 'POST',
    endpoint: '/v1/property/update',
    description: '批量更新用户属性值',
    params: [],
    bodyParams: [
      { name: 'user_id', type: 'string', required: true, description: '用户ID' },
      { name: 'property_values', type: 'json', required: true, description: '属性列表(JSON数组)', default: '[{"property_name": "name", "value": "test"}]' },
    ],
  },
  {
    id: 'query_property',
    name: '查询用户属性',
    method: 'GET',
    endpoint: '/v2/user-property/query',
    description: '批量查询用户属性值',
    params: [
      { name: 'user_ids', type: 'string', required: false, description: '用户ID列表(逗号分隔)' },
      { name: 'anonymous_ids', type: 'string', required: false, description: '匿名ID列表(逗号分隔)' },
    ],
  },
]

export function ApiRequestPage() {
  const [activeCategory, setActiveCategory] = useState<ApiCategory>('conversation')
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null)
  const [selectedApi, setSelectedApi] = useState<string>('create_conversation')
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [response, setResponse] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [streamingResponse, setStreamingResponse] = useState<string>('')
  const [lastConversationId, setLastConversationId] = useState<string | null>(null)
  const responseRef = useRef<HTMLDivElement>(null)

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.getAll,
  })

  const categories = [
    { id: 'conversation' as const, name: '对话请求', icon: ChatBubbleLeftRightIcon, apis: conversationApis },
    { id: 'workflow' as const, name: '工作流请求', icon: CogIcon, apis: workflowApis },
    { id: 'user' as const, name: '用户属性请求', icon: UserIcon, apis: userApis },
  ]

  const currentApis = categories.find((c) => c.id === activeCategory)?.apis || []
  const currentApi = currentApis.find((a) => a.id === selectedApi)

  const handleCategoryChange = (category: ApiCategory) => {
    setActiveCategory(category)
    const apis = categories.find((c) => c.id === category)?.apis || []
    if (apis.length > 0) {
      setSelectedApi(apis[0].id)
    }
    setFormValues({})
    setResponse(null)
    setError(null)
    setStreamingResponse('')
  }

  const handleApiChange = (apiId: string) => {
    setSelectedApi(apiId)
    setFormValues({})
    setResponse(null)
    setError(null)
    setStreamingResponse('')
  }

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleLinkConversation = () => {
    if (lastConversationId) {
      setSelectedApi('send_message')
      setFormValues((prev) => ({
        ...prev,
        conversation_id: lastConversationId,
      }))
    }
  }

  const handleSubmit = async () => {
    if (!selectedAgent || !currentApi) {
      setError('请先选择Agent')
      return
    }

    setIsLoading(true)
    setError(null)
    setResponse(null)
    setStreamingResponse('')

    try {
      const isStreaming = formValues.response_mode === 'streaming'

      // Build request body
      let body: any = {}
      let queryParams: any = {}

      if (currentApi.method === 'GET') {
        currentApi.params.forEach((param) => {
          if (formValues[param.name] !== undefined && formValues[param.name] !== '') {
            queryParams[param.name] = formValues[param.name]
          } else if (param.default) {
            queryParams[param.name] = param.default
          }
        })
      } else {
        // Build body for POST requests
        currentApi.bodyParams?.forEach((param) => {
          const value = formValues[param.name] ?? param.default
          if (value !== undefined && value !== '') {
            if (param.type === 'json') {
              try {
                body[param.name] = JSON.parse(value)
              } catch {
                body[param.name] = value
              }
            } else if (param.type === 'number') {
              body[param.name] = Number(value)
            } else {
              body[param.name] = value
            }
          }
        })

        // Special handling for send_message
        if (currentApi.id === 'send_message') {
          const messageText = formValues.message_text
          body = {
            conversation_id: formValues.conversation_id,
            response_mode: formValues.response_mode || 'blocking',
            messages: [
              {
                role: 'user',
                content: [{ type: 'text', text: messageText }],
              },
            ],
          }
        }
      }

      const requestBody = {
        agentId: selectedAgent,
        endpoint: currentApi.endpoint,
        method: currentApi.method,
        body: currentApi.method === 'POST' ? body : undefined,
        queryParams: currentApi.method === 'GET' ? queryParams : undefined,
        streaming: isStreaming,
      }

      if (isStreaming) {
        // Handle streaming response
        const response = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '请求失败')
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('无法获取响应流')

        const decoder = new TextDecoder()
        let fullResponse = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.chunk) {
                  fullResponse += data.chunk
                  setStreamingResponse(fullResponse)
                }
              } catch {}
            }
          }
        }

        setResponse({ streaming: true, content: fullResponse })
      } else {
        // Handle non-streaming response
        const response = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '请求失败')
        }

        setResponse(data.data)

        // Save conversation_id if created
        if (currentApi.id === 'create_conversation' && data.data?.conversation_id) {
          setLastConversationId(data.data.conversation_id)
        }
        
        // Save conversation_id from send_message response
        if (currentApi.id === 'send_message' && data.data?.conversation_id) {
          setLastConversationId(data.data.conversation_id)
        }
      }
    } catch (err: any) {
      setError(err.message || '请求失败')
    } finally {
      setIsLoading(false)
    }
  }

  const renderParamInput = (param: ParamConfig, _isBody: boolean = false) => {
    const value = formValues[param.name] ?? param.default ?? ''

    if (param.type === 'select' && param.options) {
      return (
        <select
          value={value}
          onChange={(e) => setFormValues({ ...formValues, [param.name]: e.target.value })}
          className="input-field"
        >
          <option value="">请选择</option>
          {param.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    }

    if (param.type === 'json') {
      return (
        <textarea
          value={value}
          onChange={(e) => setFormValues({ ...formValues, [param.name]: e.target.value })}
          className="input-field font-mono text-sm"
          rows={4}
          placeholder={param.default || '{}'}
        />
      )
    }

    return (
      <input
        type={param.type === 'number' ? 'number' : 'text'}
        value={value}
        onChange={(e) => setFormValues({ ...formValues, [param.name]: e.target.value })}
        className="input-field"
        placeholder={param.description}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <CommandLineIcon className="w-8 h-8 text-primary-500" />
        <h1 className="text-3xl font-bold text-text-primary">API 请求</h1>
      </div>

      {/* Category Tabs */}
      <div className="glass-card p-2">
        <div className="flex space-x-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeCategory === category.id
                  ? 'bg-primary-400 text-white shadow-md'
                  : 'text-text-secondary hover:bg-primary-50 hover:text-primary-600'
              }`}
            >
              <category.icon className="w-5 h-5" />
              <span className="font-medium">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - API Selection & Parameters */}
        <div className="lg:col-span-1 space-y-4">
          {/* Agent Selection */}
          <div className="glass-card p-4">
            <label className="block text-sm font-medium text-text-primary mb-2">
              选择 Agent
            </label>
            <select
              value={selectedAgent || ''}
              onChange={(e) => setSelectedAgent(Number(e.target.value) || null)}
              className="input-field"
            >
              <option value="">请选择Agent</option>
              {agents?.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.region})
                </option>
              ))}
            </select>
          </div>

          {/* API Selection */}
          <div className="glass-card p-4">
            <label className="block text-sm font-medium text-text-primary mb-2">
              选择接口
            </label>
            <div className="space-y-2">
              {currentApis.map((api) => (
                <button
                  key={api.id}
                  onClick={() => handleApiChange(api.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                    selectedApi === api.id
                      ? 'bg-primary-100 border-2 border-primary-400'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-text-primary">{api.name}</span>
                    <span
                      className={`text-xs font-mono px-2 py-1 rounded ${
                        api.method === 'GET'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {api.method}
                    </span>
                  </div>
                  <p className="text-xs text-text-tertiary mt-1 truncate">{api.endpoint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Parameters */}
          {currentApi && (
            <div className="glass-card p-4">
              <h3 className="font-medium text-text-primary mb-4">请求参数</h3>
              <div className="space-y-4">
                {/* Query Parameters (for GET) */}
                {currentApi.params.map((param) => (
                  <div key={param.name}>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      {param.name}
                      {param.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <p className="text-xs text-text-tertiary mb-2">{param.description}</p>
                    {renderParamInput(param)}
                  </div>
                ))}

                {/* Body Parameters (for POST) */}
                {currentApi.bodyParams?.map((param) => (
                  <div key={param.name}>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      {param.name}
                      {param.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <p className="text-xs text-text-tertiary mb-2">{param.description}</p>
                    {renderParamInput(param, true)}
                  </div>
                ))}

                {/* Link Conversation Button */}
                {currentApi.id === 'send_message' && lastConversationId && !formValues.conversation_id && (
                  <motion.button
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleLinkConversation}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary-100 text-primary-600 rounded-lg hover:bg-primary-200 transition-colors"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span>使用上次创建的对话ID</span>
                  </motion.button>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !selectedAgent}
            className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                <span>请求中...</span>
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="w-5 h-5" />
                <span>发送请求</span>
              </>
            )}
          </button>
        </div>

        {/* Right Panel - Response */}
        <div className="lg:col-span-2">
          <div className="glass-card p-4 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-text-primary">响应结果</h3>
              {response && (
                <button
                  onClick={() => copyToClipboard(JSON.stringify(response, null, 2), 'response')}
                  className="flex items-center space-x-1 text-sm text-primary-500 hover:text-primary-600"
                >
                  {copiedField === 'response' ? (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="w-4 h-4" />
                      <span>复制</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"
              >
                <p className="text-red-600">{error}</p>
              </motion.div>
            )}

            {/* Conversation ID Quick Copy */}
            {response?.conversation_id && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary-700">Conversation ID</p>
                    <p className="text-sm font-mono text-primary-600 mt-1">
                      {response.conversation_id}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyToClipboard(response.conversation_id, 'conv_id')}
                      className="p-2 text-primary-500 hover:bg-primary-100 rounded-lg transition-colors"
                    >
                      {copiedField === 'conv_id' ? (
                        <CheckIcon className="w-5 h-5" />
                      ) : (
                        <ClipboardDocumentIcon className="w-5 h-5" />
                      )}
                    </button>
                    {currentApi?.id === 'create_conversation' && (
                      <button
                        onClick={handleLinkConversation}
                        className="flex items-center space-x-1 px-3 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors"
                      >
                        <LinkIcon className="w-4 h-4" />
                        <span>衔接对话</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Message ID Quick Copy */}
            {response?.message_id && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Message ID</p>
                    <p className="text-sm font-mono text-green-600 mt-1">{response.message_id}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(response.message_id, 'msg_id')}
                    className="p-2 text-green-500 hover:bg-green-100 rounded-lg transition-colors"
                  >
                    {copiedField === 'msg_id' ? (
                      <CheckIcon className="w-5 h-5" />
                    ) : (
                      <ClipboardDocumentIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Streaming Response */}
            {streamingResponse && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-text-primary mb-2">流式响应:</p>
                <pre className="text-sm text-text-secondary whitespace-pre-wrap break-words">
                  {streamingResponse}
                </pre>
              </div>
            )}

            {/* Full Response */}
            <div
              ref={responseRef}
              className="bg-gray-900 rounded-lg p-4 min-h-[400px] max-h-[600px] overflow-auto"
            >
              {response ? (
                <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(response, null, 2)}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>响应结果将显示在这里</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

