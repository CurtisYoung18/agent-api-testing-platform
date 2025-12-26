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
  ChevronDownIcon,
  ChevronUpIcon,
  CircleStackIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline'

type ApiCategory = 'conversation' | 'workflow' | 'user' | 'database' | 'knowledge'

interface ApiEndpoint {
  id: string
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  endpoint: string
  description: string
  params: ParamConfig[]
  bodyParams?: ParamConfig[]
  usesConversationId?: boolean
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
    usesConversationId: true,
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
    usesConversationId: true,
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
      { name: 'input', type: 'json', required: true, description: '工作流输入参数 - 请根据具体工作流的"开始"节点入参结构修改', default: '{\n  "data": "{\\"userId\\":\\"szsfpt020251223173845080a5245392\\"}",\n  "type": 200\n}' },
    ],
  },
  {
    id: 'query_workflow_result',
    name: '查询工作流运行结果',
    method: 'POST',
    endpoint: '/v1/workflow/query/result',
    description: '使用workflowRunId查询工作流的运行结果',
    params: [],
    bodyParams: [
      { name: 'workflowRunId', type: 'string', required: true, description: '工作流运行ID' },
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

const databaseApis: ApiEndpoint[] = [
  {
    id: 'create_table',
    name: '创建数据表',
    method: 'POST',
    endpoint: '/v1/database/create-table',
    description: '为Agent创建新的数据表及其表字段',
    params: [],
    bodyParams: [
      { name: 'name', type: 'string', required: true, description: '表名称(32字符,a~z/数字/下划线)' },
      { name: 'description', type: 'string', required: true, description: '表描述(128字符)' },
      { name: 'fields', type: 'json', required: true, description: '表字段数组', default: '[{"name":"id","description":"ID","type":"TEXT","required":true,"unique":true}]' },
    ],
  },
  {
    id: 'import_records',
    name: '添加表数据',
    method: 'POST',
    endpoint: '/v1/database/import/records',
    description: '批量添加数据到指定数据表(最多1000行)',
    params: [],
    bodyParams: [
      { name: 'table_id', type: 'string', required: true, description: '表ID' },
      { name: 'records', type: 'json', required: true, description: '数据记录数组', default: '[{"values":{"id":"1","name":"test"}}]' },
    ],
  },
  {
    id: 'query_import_status',
    name: '查询添加状态',
    method: 'GET',
    endpoint: '/v1/database/query/import-results',
    description: '查询添加表数据任务的处理状态',
    params: [
      { name: 'ids', type: 'string', required: true, description: '任务ID(多个用逗号分隔)' },
    ],
  },
  {
    id: 'update_record',
    name: '更新表数据',
    method: 'POST',
    endpoint: '/v2/database/update/record',
    description: '批量更新数据表中的指定记录(最多100条)',
    params: [],
    bodyParams: [
      { name: 'table_id', type: 'string', required: true, description: '表ID' },
      { name: 'is_create', type: 'boolean', required: false, description: '记录不存在时是否创建' },
      { name: 'update_data', type: 'json', required: true, description: '更新数据数组', default: '[{"record_id":"123","updated_fields":{"name":"new_name"}}]' },
    ],
  },
  {
    id: 'get_records',
    name: '获取数据库记录',
    method: 'POST',
    endpoint: '/v1/database/records/page',
    description: '获取指定数据表的分页记录数据',
    params: [],
    bodyParams: [
      { name: 'table_id', type: 'string', required: true, description: '表ID' },
      { name: 'page', type: 'number', required: true, description: '页码', default: '1' },
      { name: 'page_size', type: 'number', required: true, description: '每页数量(1-100)', default: '20' },
      { name: 'filter', type: 'json', required: false, description: '过滤条件(JSON)', default: '{}' },
      { name: 'keyword', type: 'string', required: false, description: '关键词模糊查询' },
    ],
  },
  {
    id: 'delete_record',
    name: '删除表数据',
    method: 'POST',
    endpoint: '/v2/database/delete/record',
    description: '批量删除数据表中的指定记录(最多1000条)',
    params: [],
    bodyParams: [
      { name: 'table_id', type: 'string', required: true, description: '表ID' },
      { name: 'delete_data', type: 'json', required: true, description: '删除数据数组', default: '[{"record_id":"123"}]' },
    ],
  },
]

const knowledgeApis: ApiEndpoint[] = [
  {
    id: 'get_knowledge_bases',
    name: '获取知识库列表',
    method: 'GET',
    endpoint: '/v1/bot/knowledge/base/page',
    description: '获取Agent内的知识库列表',
    params: [],
  },
  {
    id: 'get_docs',
    name: '获取知识文档列表',
    method: 'GET',
    endpoint: '/v1/bot/doc/query/page',
    description: '获取知识库的文档列表',
    params: [
      { name: 'knowledge_base_id', type: 'string', required: true, description: '知识库ID' },
      { name: 'page', type: 'number', required: true, description: '页码', default: '1' },
      { name: 'page_size', type: 'number', required: true, description: '每页数量(10-100)', default: '20' },
    ],
  },
  {
    id: 'add_text_doc',
    name: '添加文本类文档',
    method: 'POST',
    endpoint: '/v1/bot/doc/text/add',
    description: '批量添加文本类型文档到知识库',
    params: [],
    bodyParams: [
      { name: 'knowledge_base_id', type: 'string', required: false, description: '目标知识库ID(可选)' },
      { name: 'chunk_token', type: 'number', required: false, description: '分块最大Token数(1-1000)', default: '600' },
      { name: 'splitter', type: 'string', required: false, description: '分块分隔符' },
      { name: 'files', type: 'json', required: true, description: '文档列表', default: '[{"file_url":"https://example.com/doc.pdf","file_name":"doc.pdf"}]' },
    ],
  },
  {
    id: 'add_spreadsheet_doc',
    name: '添加表格类文档',
    method: 'POST',
    endpoint: '/v1/bot/doc/spreadsheet/add',
    description: '批量添加表格类型文档到知识库',
    params: [],
    bodyParams: [
      { name: 'knowledge_base_id', type: 'string', required: false, description: '目标知识库ID(可选)' },
      { name: 'chunk_token', type: 'number', required: false, description: '分块最大Token数(1-1000)', default: '600' },
      { name: 'header_row', type: 'number', required: false, description: '表头行数(1-5)', default: '1' },
      { name: 'files', type: 'json', required: true, description: '文档列表', default: '[{"file_url":"https://example.com/data.xlsx","file_name":"data.xlsx"}]' },
    ],
  },
  {
    id: 'update_text_doc',
    name: '更新文本类文档',
    method: 'PUT',
    endpoint: '/v1/bot/doc/text/update',
    description: '批量更新文本类型文档',
    params: [],
    bodyParams: [
      { name: 'chunk_token', type: 'number', required: false, description: '分块最大Token数', default: '600' },
      { name: 'splitter', type: 'string', required: false, description: '分块分隔符' },
      { name: 'files', type: 'json', required: true, description: '文档列表(含doc_id)', default: '[{"doc_id":"xxx","file_url":"https://example.com/doc.pdf"}]' },
    ],
  },
  {
    id: 'update_spreadsheet_doc',
    name: '更新表格类文档',
    method: 'PUT',
    endpoint: '/v1/bot/doc/spreadsheet/update',
    description: '批量更新表格类型文档',
    params: [],
    bodyParams: [
      { name: 'chunk_token', type: 'number', required: false, description: '分块最大Token数', default: '600' },
      { name: 'header_row', type: 'number', required: false, description: '表头行数(1-5)', default: '1' },
      { name: 'files', type: 'json', required: true, description: '文档列表(含doc_id)', default: '[{"doc_id":"xxx","file_url":"https://example.com/data.xlsx"}]' },
    ],
  },
  {
    id: 'delete_docs',
    name: '删除知识文档',
    method: 'DELETE',
    endpoint: '/v1/bot/doc/batch/delete',
    description: '从知识库删除文档',
    params: [
      { name: 'doc', type: 'string', required: true, description: '文档ID(多个用逗号分隔)' },
    ],
  },
  {
    id: 'add_chunks',
    name: '添加知识块',
    method: 'POST',
    endpoint: '/v1/bot/doc/chunks/add',
    description: '为文本类文档添加知识块',
    params: [],
    bodyParams: [
      { name: 'doc_id', type: 'string', required: true, description: '文档ID' },
      { name: 'chunks', type: 'json', required: true, description: '知识块数组', default: '[{"content":"This is a chunk.","keywords":["keyword1"]}]' },
    ],
  },
  {
    id: 'query_doc_status',
    name: '查询文档状态',
    method: 'GET',
    endpoint: '/v1/bot/data/detail/list',
    description: '查询知识库文档的处理状态',
    params: [
      { name: 'data_ids', type: 'string', required: true, description: '文档ID(多个用逗号分隔)' },
    ],
  },
  {
    id: 'vector_match',
    name: '向量相似度匹配',
    method: 'POST',
    endpoint: '/v1/vector/match',
    description: '在知识库中进行向量检索和召回',
    params: [],
    bodyParams: [
      { name: 'prompt', type: 'string', required: true, description: '查询内容/关键词' },
      { name: 'top_k', type: 'number', required: true, description: '返回结果数量(1-50)', default: '10' },
      { name: 'embedding_rate', type: 'number', required: false, description: '语义检索权重(0-1)', default: '1' },
      { name: 'group_ids', type: 'json', required: false, description: '知识库ID数组', default: '[]' },
      { name: 'data_ids', type: 'json', required: false, description: '文档ID数组', default: '[]' },
      { name: 'rerank_version', type: 'string', required: false, description: '重排模型名称' },
      { name: 'doc_correlation', type: 'number', required: false, description: '相关性得分阈值(0.1-0.95)' },
    ],
  },
  {
    id: 'retry_embed',
    name: '重新嵌入文档',
    method: 'POST',
    endpoint: '/v1/bot/data/retry/batch',
    description: '对所有处理失败的文档进行批量重新嵌入',
    params: [],
    bodyParams: [],
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
  const [isApiListExpanded, setIsApiListExpanded] = useState(true)
  const responseRef = useRef<HTMLDivElement>(null)

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.getAll,
  })

  const allCategories = [
    { id: 'conversation' as const, name: '对话请求', icon: ChatBubbleLeftRightIcon, apis: conversationApis },
    { id: 'workflow' as const, name: '工作流', icon: CogIcon, apis: workflowApis },
    { id: 'user' as const, name: '用户属性', icon: UserIcon, apis: userApis },
    { id: 'database' as const, name: '数据库', icon: CircleStackIcon, apis: databaseApis },
    { id: 'knowledge' as const, name: '知识库', icon: BookOpenIcon, apis: knowledgeApis },
  ]
  const currentApis = allCategories.find((c) => c.id === activeCategory)?.apis || []
  const currentApi = currentApis.find((a) => a.id === selectedApi)

  const handleCategoryChange = (category: ApiCategory) => {
    setActiveCategory(category)
    const apis = allCategories.find((c) => c.id === category)?.apis || []
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
      setFormValues((prev) => ({
        ...prev,
        conversation_id: lastConversationId,
      }))
    }
  }

  const handleLinkAndNavigate = () => {
    if (lastConversationId) {
      setSelectedApi('send_message')
      setFormValues({
        conversation_id: lastConversationId,
      })
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

      if (currentApi.method === 'GET' || currentApi.method === 'DELETE') {
        currentApi.params.forEach((param) => {
          if (formValues[param.name] !== undefined && formValues[param.name] !== '') {
            queryParams[param.name] = formValues[param.name]
          } else if (param.default) {
            queryParams[param.name] = param.default
          }
        })
      } else {
        // Build body for POST/PUT requests
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
            } else if (param.type === 'boolean') {
              body[param.name] = value === 'true'
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
        body: (currentApi.method === 'POST' || currentApi.method === 'PUT') ? body : undefined,
        queryParams: (currentApi.method === 'GET' || currentApi.method === 'DELETE') ? queryParams : undefined,
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

  const renderParamInput = (param: ParamConfig) => {
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

    if (param.type === 'boolean') {
      return (
        <select
          value={value}
          onChange={(e) => setFormValues({ ...formValues, [param.name]: e.target.value })}
          className="input-field"
        >
          <option value="">请选择</option>
          <option value="true">是 (true)</option>
          <option value="false">否 (false)</option>
        </select>
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

  // Check if current API uses conversation_id
  const showConversationIdHint = currentApi?.usesConversationId && lastConversationId && !formValues.conversation_id

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-700'
      case 'POST': return 'bg-blue-100 text-blue-700'
      case 'PUT': return 'bg-yellow-100 text-yellow-700'
      case 'DELETE': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
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
        <div className="flex">
          {allCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={`flex-1 flex items-center justify-center space-x-2 px-3 py-3 rounded-lg transition-all duration-200 ${
                activeCategory === category.id
                  ? 'bg-primary-400 text-white shadow-md'
                  : 'text-text-secondary hover:bg-primary-50 hover:text-primary-600'
              }`}
            >
              <category.icon className="w-5 h-5" />
              <span className="font-medium text-sm">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Panel - API Selection & Parameters */}
        <div className="lg:col-span-2 space-y-4">
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

          {/* Parameters - Moved above API Selection */}
          {currentApi && (
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-text-primary">请求参数</h3>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-mono px-2 py-1 rounded ${getMethodColor(currentApi.method)}`}>
                    {currentApi.method}
                  </span>
                  <span className="text-xs text-text-tertiary font-mono truncate max-w-[150px]">{currentApi.endpoint}</span>
                </div>
              </div>
              <div className="space-y-4">
                {/* Link Conversation Button - Show for APIs using conversation_id */}
                {showConversationIdHint && (
                  <motion.button
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleLinkConversation}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors border border-orange-200"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span>使用上次的 conversation_id: {lastConversationId?.slice(0, 12)}...</span>
                  </motion.button>
                )}

                {/* Query Parameters (for GET/DELETE) */}
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

                {/* Body Parameters (for POST/PUT) */}
                {currentApi.bodyParams?.map((param) => (
                  <div key={param.name}>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      {param.name}
                      {param.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <p className="text-xs text-text-tertiary mb-2">{param.description}</p>
                    {renderParamInput(param)}
                  </div>
                ))}

                {/* No params message */}
                {currentApi.params.length === 0 && (!currentApi.bodyParams || currentApi.bodyParams.length === 0) && (
                  <p className="text-sm text-text-tertiary text-center py-4">此接口无需参数</p>
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

          {/* API Selection - Collapsible */}
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => setIsApiListExpanded(!isApiListExpanded)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-text-primary">
                选择接口 ({currentApis.length})
              </span>
              {isApiListExpanded ? (
                <ChevronUpIcon className="w-5 h-5 text-text-tertiary" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-text-tertiary" />
              )}
            </button>
            {isApiListExpanded && (
              <div className="px-4 pb-4 space-y-2 max-h-[400px] overflow-y-auto">
                {currentApis.map((api) => (
                  <button
                    key={api.id}
                    onClick={() => handleApiChange(api.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 ${
                      selectedApi === api.id
                        ? 'bg-primary-100 border-2 border-primary-400'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-text-primary text-sm">{api.name}</span>
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${getMethodColor(api.method)}`}>
                        {api.method}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Response (Larger) */}
        <div className="lg:col-span-3">
          <div className="glass-card p-4 h-full flex flex-col">
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
                className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700">Conversation ID</p>
                    <p className="text-sm font-mono text-orange-600 mt-1">
                      {response.conversation_id}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyToClipboard(response.conversation_id, 'conv_id')}
                      className="p-2 text-orange-500 hover:bg-orange-100 rounded-lg transition-colors"
                    >
                      {copiedField === 'conv_id' ? (
                        <CheckIcon className="w-5 h-5" />
                      ) : (
                        <ClipboardDocumentIcon className="w-5 h-5" />
                      )}
                    </button>
                    {currentApi?.id === 'create_conversation' && (
                      <button
                        onClick={handleLinkAndNavigate}
                        className="flex items-center space-x-1 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
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

            {/* Workflow Run ID Quick Copy */}
            {response?.workflowRunId && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Workflow Run ID</p>
                    <p className="text-sm font-mono text-purple-600 mt-1">{response.workflowRunId}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(response.workflowRunId, 'workflow_run_id')}
                    className="p-2 text-purple-500 hover:bg-purple-100 rounded-lg transition-colors"
                  >
                    {copiedField === 'workflow_run_id' ? (
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
              <div className="mb-4 p-4 bg-gray-100 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-text-primary mb-2">流式响应:</p>
                <pre className="text-sm text-text-secondary whitespace-pre-wrap break-words">
                  {streamingResponse}
                </pre>
              </div>
            )}

            {/* Full Response - Postman Style */}
            <div
              ref={responseRef}
              className="flex-1 rounded-lg p-4 min-h-[400px] overflow-auto"
              style={{ backgroundColor: '#1e1e1e' }}
            >
              {response ? (
                <pre 
                  className="text-sm font-mono whitespace-pre-wrap break-words"
                  style={{ color: '#9cdcfe' }}
                >
                  {JSON.stringify(response, null, 2)
                    .replace(/"([^"]+)":/g, '<key>"$1"</key>:')
                    .split('\n')
                    .map((line, i) => {
                      // Simple syntax highlighting
                      const highlighted = line
                        .replace(/<key>"([^"]+)"<\/key>/g, (_, key) => `<span style="color:#9cdcfe">"${key}"</span>`)
                        .replace(/: "([^"]*)"/g, ': <span style="color:#ce9178">"$1"</span>')
                        .replace(/: (\d+)/g, ': <span style="color:#b5cea8">$1</span>')
                        .replace(/: (true|false)/g, ': <span style="color:#569cd6">$1</span>')
                        .replace(/: (null)/g, ': <span style="color:#569cd6">$1</span>')
                      return (
                        <div key={i} dangerouslySetInnerHTML={{ __html: highlighted }} />
                      )
                    })}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full" style={{ minHeight: '350px' }}>
                  <p style={{ color: '#6a6a6a' }}>响应结果将显示在这里</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
