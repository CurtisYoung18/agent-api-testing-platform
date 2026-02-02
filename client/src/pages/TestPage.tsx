import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { 
  BeakerIcon, 
  FolderOpenIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  CpuChipIcon,
  DocumentArrowUpIcon,
  Cog6ToothIcon,
  PlayIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon,
  EyeIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { api } from '../lib/api'

interface Agent {
  id: number
  name: string
  modelName?: string
  region: string
  apiKey: string
  status: string
  lastUsed: string | null
}

export function TestPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [executionMode, setExecutionMode] = useState<'parallel' | 'sequential'>('parallel')
  const [maxConcurrency, setMaxConcurrency] = useState(2) // 并行模式：最大并发数
  const [requestDelay, setRequestDelay] = useState(0) // 串行模式：请求间隔（毫秒）
  const [requestTimeout, setRequestTimeout] = useState(60000) // 请求超时时间（毫秒）
  const [customUserId, setCustomUserId] = useState('')
  const [testError, setTestError] = useState('')
  // Real-time testing states
  const [isTestingLive, setIsTestingLive] = useState(false)
  const [testCompleted, setTestCompleted] = useState(false)
  const [liveResults, setLiveResults] = useState<any[]>([])
  const [liveStats, setLiveStats] = useState({ current: 0, total: 0, passedCount: 0, failedCount: 0, successRate: '0.00' })
  // Retry failed tests
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryAttempts, setRetryAttempts] = useState<Map<number, number>>(new Map()) // questionIndex -> retry count
  // Pending save (when test has failures)
  const [pendingSaveData, setPendingSaveData] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [currentResponse, setCurrentResponse] = useState('')
  const [previewQuestions, setPreviewQuestions] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set())

  // Fetch agents
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await api.get('/agents')
      return response.data as Agent[]
    },
  })

  // Filter agents based on search
  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.region.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // File upload handler with preview
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setUploadedFile(file)
      
      // Parse and preview questions from Excel file
      try {
        const XLSX = await import('xlsx')
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet)
        
        const questions: string[] = []
        for (const row of jsonData as any[]) {
          const input = row.input || row.Input || row.INPUT
          if (input && typeof input === 'string' && input.trim()) {
            questions.push(input.trim())
          }
        }
        
        setPreviewQuestions(questions)
        setShowPreview(false)
      } catch (error) {
        console.error('Error parsing Excel:', error)
        setPreviewQuestions([])
      }
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  })

  const steps = [
    { number: 1, title: '选择 Agent', icon: CpuChipIcon },
    { number: 2, title: '上传数据', icon: DocumentArrowUpIcon },
    { number: 3, title: '配置测试', icon: Cog6ToothIcon },
    { number: 4, title: '开始运行', icon: PlayIcon },
  ]

  const canProceed = () => {
    if (step === 1) return selectedAgent !== null
    if (step === 2) return uploadedFile !== null
    if (step === 3) return true
    return false
  }

  const handleNext = () => {
    if (canProceed() && step < 4) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const toggleResultExpand = (index: number) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const handleStartTest = async () => {
    if (!selectedAgent || !uploadedFile) {
      setTestError('请确保已选择 Agent 和上传文件')
      return
    }

    setTestError('')
    setIsTestingLive(true)
    setTestCompleted(false)
    setLiveResults([])
    setCurrentQuestion('')
    setCurrentResponse('')
    setLiveStats({ current: 0, total: 0, passedCount: 0, failedCount: 0, successRate: '0.00' })
    setExpandedResults(new Set())
    
    const formData = new FormData()
    formData.append('agentId', selectedAgent.id.toString())
    formData.append('file', uploadedFile)
    formData.append('executionMode', executionMode)
    formData.append('requestTimeout', requestTimeout.toString())
    if (executionMode === 'parallel') {
      formData.append('maxConcurrency', maxConcurrency.toString())
    } else {
      formData.append('requestDelay', requestDelay.toString())
    }
    if (customUserId.trim()) {
      formData.append('userId', customUserId.trim())
    }

    try {
      // Upload file and start test with SSE
      const response = await fetch('/api/tests?stream=true', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to start test')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6))
              
              if (data.type === 'connected') {
                setLiveStats(prev => ({ ...prev, total: data.totalQuestions }))
              } else if (data.type === 'progress') {
                setCurrentQuestion(data.question)
                setCurrentResponse('正在等待AI回复...')
                setLiveStats(prev => ({ ...prev, current: data.current }))
              } else if (data.type === 'result') {
                setCurrentResponse(data.response || data.error)
                // Use functional update to access the latest state
                setLiveResults(prevResults => {
                  const newResults = [...prevResults, data]
                  const passedCount = newResults.filter(r => r.success).length
                  const failedCount = newResults.length - passedCount
                  const successRate = newResults.length > 0 ? ((passedCount / newResults.length) * 100).toFixed(2) : '0.00'
                  setLiveStats(prev => ({ 
                    ...prev, 
                    passedCount, 
                    failedCount, 
                    successRate 
                  }))
                  return newResults
                })
              } else if (data.type === 'complete') {
                // Mark test as completed
                setTestCompleted(true)
                setCurrentQuestion('')
                
                if (data.pendingSave) {
                  // Has failures - save data for later, show retry option
                  setPendingSaveData({
                    results: data.results,
                    testConfig: data.testConfig,
                    durationSeconds: data.durationSeconds,
                    totalTokens: data.totalTokens,
                    totalCost: data.totalCost,
                  })
                  setLiveResults(data.results)
                  setLiveStats(prev => ({
                    ...prev,
                    passedCount: data.passedCount,
                    failedCount: data.failedCount,
                    successRate: data.successRate,
                  }))
                  setCurrentResponse(`⚠️ 测试完成，但有 ${data.failedCount} 个问题失败。您可以选择重试失败的问题。`)
                } else {
                  // All passed - already saved, navigate to history
                  setCurrentResponse('✅ 测试已完成！正在跳转到历史记录...')
                  setTimeout(() => {
                    navigate('/history', { state: { refresh: true } })
                  }, 1500)
                }
              }
            } catch (err) {
              console.error('Failed to parse SSE data:', err)
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Test execution error:', error)
      setTestError(error.message || '测试执行失败，请重试')
      setIsTestingLive(false)
      setTestCompleted(false)
    }
  }

  // Handle retry of failed tests
  const handleRetryFailed = async () => {
    if (!selectedAgent) return

    // Get failed questions with their original indices
    const failedQuestions = liveResults
      .filter(r => !r.success)
      .map(r => ({
        questionIndex: r.questionIndex,
        question: r.question,
        referenceOutput: r.referenceOutput || '',
      }))

    if (failedQuestions.length === 0) return

    setIsRetrying(true)
    setTestCompleted(false)
    setCurrentQuestion('')
    setCurrentResponse('正在重试失败的问题...')

    try {
      const response = await fetch('/api/tests/retry?stream=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          questions: failedQuestions,
          executionMode,
          requestTimeout,
          maxConcurrency,
          requestDelay,
          userId: customUserId.trim() || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('重试请求失败')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('无法读取响应流')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6))
              
              if (data.type === 'progress') {
                setCurrentQuestion(data.question)
                setCurrentResponse('正在等待AI回复...')
              } else if (data.type === 'result') {
                setCurrentResponse(data.response || data.error)
                
                // Update the original result at the correct index
                setLiveResults(prevResults => {
                  const newResults = [...prevResults]
                  const originalIndex = data.questionIndex
                  const existingIndex = newResults.findIndex(r => r.questionIndex === originalIndex)
                  
                  if (existingIndex !== -1) {
                    // Track retry attempts
                    const currentAttempts = retryAttempts.get(originalIndex) || 0
                    setRetryAttempts(prev => new Map(prev).set(originalIndex, currentAttempts + 1))
                    
                    // Update result with retry info
                    newResults[existingIndex] = {
                      ...data,
                      retryCount: currentAttempts + 1,
                    }
                  }
                  
                  // Recalculate stats
                  const passedCount = newResults.filter(r => r.success).length
                  const failedCount = newResults.length - passedCount
                  const successRate = newResults.length > 0 ? ((passedCount / newResults.length) * 100).toFixed(2) : '0.00'
                  setLiveStats(prev => ({ 
                    ...prev, 
                    passedCount, 
                    failedCount, 
                    successRate 
                  }))
                  
                  return newResults
                })
              } else if (data.type === 'complete') {
                setTestCompleted(true)
                setCurrentQuestion('')
                
                // Check remaining failures and update stats
                setLiveResults(prevResults => {
                  const passedCount = prevResults.filter(r => r.success).length
                  const remainingFailed = prevResults.length - passedCount
                  const successRate = prevResults.length > 0 ? ((passedCount / prevResults.length) * 100).toFixed(2) : '0.00'
                  
                  setLiveStats(prev => ({
                    ...prev,
                    passedCount,
                    failedCount: remainingFailed,
                    successRate,
                  }))
                  
                  if (remainingFailed > 0) {
                    setCurrentResponse(`⚠️ 重试完成，仍有 ${remainingFailed} 个问题失败。您可以继续重试或保存结果。`)
                  } else {
                    setCurrentResponse('✅ 所有问题已成功！点击下方按钮保存结果。')
                  }
                  return prevResults
                })
              }
            } catch (err) {
              console.error('Failed to parse retry SSE data:', err)
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Retry execution error:', error)
      setTestError(error.message || '重试执行失败')
    } finally {
      setIsRetrying(false)
    }
  }

  // Save results and navigate to history
  const handleSaveAndNavigate = async () => {
    if (!pendingSaveData) {
      navigate('/history', { state: { refresh: true } })
      return
    }

    setIsSaving(true)
    try {
      // Add retry count info to results
      const resultsWithRetryInfo = liveResults.map(r => ({
        ...r,
        retryCount: retryAttempts.get(r.questionIndex) || 0,
      }))

      const response = await fetch('/api/tests/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          results: resultsWithRetryInfo,
          testConfig: pendingSaveData.testConfig,
          durationSeconds: pendingSaveData.durationSeconds,
          totalTokens: pendingSaveData.totalTokens,
          totalCost: pendingSaveData.totalCost,
        }),
      })

      if (!response.ok) {
        throw new Error('保存失败')
      }

      const data = await response.json()
      console.log('Saved test results, history ID:', data.historyId)
      
      navigate('/history', { state: { refresh: true } })
    } catch (error: any) {
      console.error('Save error:', error)
      setTestError(error.message || '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <BeakerIcon className="w-8 h-8 text-primary-500" />
        <h1 className="text-3xl font-bold text-text-primary">新建测试</h1>
      </div>

      {/* Step Indicator */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => (
            <div key={s.number} className="flex items-center flex-1">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    step >= s.number
                      ? 'bg-primary-400 text-white shadow-md'
                      : 'bg-gray-200 text-gray-400'
                  } ${step === s.number ? 'ring-4 ring-primary-200' : ''}`}
                >
                  {step > s.number ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : (
                    <s.icon className="w-5 h-5" />
                  )}
                </div>
                <div className="hidden sm:block">
                  <p
                    className={`text-sm font-medium ${
                      step >= s.number ? 'text-text-primary' : 'text-text-tertiary'
                    }`}
                  >
                    {s.title}
                  </p>
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-4 rounded transition-all duration-300 ${
                    step > s.number ? 'bg-primary-400' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Card with Animation */}
      <div className="relative" style={{ minHeight: '500px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, rotateY: -90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: 90 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="glass-card p-8"
          >
            {/* Step 1: Select Agent */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <CpuChipIcon className="w-16 h-16 text-primary-400 mx-auto mb-3" />
                  <h2 className="text-2xl font-bold text-text-primary mb-2">选择测试 Agent</h2>
                  <p className="text-text-secondary">选择一个 Agent 来执行测试任务</p>
                </div>

                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                  <input
                    type="text"
                    placeholder="搜索 agent 名称或区域..."
                    className="input-field pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {isLoading ? (
                  <div className="text-center py-12 text-text-secondary">加载中...</div>
                ) : filteredAgents.length === 0 ? (
                  <div className="text-center py-12 text-text-secondary">
                    {searchQuery ? '未找到匹配的 agent' : '暂无可用 agent'}
                  </div>
                ) : (
                  <div className="grid gap-3 max-h-96 overflow-y-auto pr-2">
                    {filteredAgents.map((agent) => (
                      <motion.div
                        key={agent.id}
                        whileHover={{ y: -2 }}
                        whileTap={{ y: 0 }}
                        onClick={() => setSelectedAgent(agent)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedAgent?.id === agent.id
                            ? 'border-primary-400 bg-primary-50/50 shadow-md'
                            : 'border-primary-100 hover:border-primary-300 hover:bg-primary-50/30 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <h3 className="font-semibold text-text-primary">{agent.name}</h3>
                              {agent.modelName && (
                                <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 flex items-center space-x-1">
                                  <CpuChipIcon className="w-3 h-3" />
                                  <span>{agent.modelName}</span>
                                </span>
                              )}
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  agent.region === 'SG'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {agent.region}
                              </span>
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  agent.status === 'active'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {agent.status === 'active' ? '活跃' : '不可用'}
                              </span>
                            </div>
                            <p className="text-sm text-text-tertiary mt-1">
                              API Key: {agent.apiKey}
                            </p>
                          </div>
                          {selectedAgent?.id === agent.id && (
                            <CheckCircleIcon className="w-6 h-6 text-primary-500" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Upload File */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <DocumentArrowUpIcon className="w-16 h-16 text-primary-400 mx-auto mb-3" />
                  <h2 className="text-2xl font-bold text-text-primary mb-2">上传测试数据</h2>
                  <p className="text-text-secondary">上传包含测试问题的 Excel 文件</p>
                </div>

                {/* Template Guide */}
                <div className="glass-card p-6 bg-blue-50/30 border-2 border-blue-200">
                  <div className="flex items-start space-x-3 mb-4">
                    <InformationCircleIcon className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-text-primary mb-2">模板格式说明</h3>
                      <p className="text-sm text-text-secondary mb-4">
                        请按照以下格式准备您的测试数据，Excel文件必须包含 <code className="bg-blue-100 px-2 py-0.5 rounded text-blue-700">input</code> 列：
                      </p>
                    </div>
                  </div>

                  {/* Template Preview Image */}
                  <div className="bg-white rounded-lg p-4 mb-4 border border-blue-200">
                    <img 
                      src="/测试模版.png" 
                      alt="测试模版示例" 
                      className="w-full max-w-2xl mx-auto rounded shadow-sm"
                      style={{ maxHeight: '162px', objectFit: 'contain' }}
                    />
                  </div>

                  {/* Download Template Button */}
                  <div className="flex justify-center">
                    <a
                      href="/测试集模板.xlsx"
                      download="测试集模板.xlsx"
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                    >
                      <ArrowDownTrayIcon className="w-5 h-5" />
                      <span>下载模板文件</span>
                    </a>
                  </div>
                </div>

                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 cursor-pointer ${
                    isDragActive
                      ? 'border-primary-500 bg-primary-100/50'
                      : uploadedFile
                      ? 'border-green-400 bg-green-50/50'
                      : 'border-primary-300 hover:border-primary-400 hover:bg-primary-50/30'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="space-y-3">
                    {uploadedFile ? (
                      <>
                        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
                        <p className="text-lg font-medium text-text-primary">
                          {uploadedFile.name}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {(uploadedFile.size / 1024).toFixed(2)} KB
                        </p>
                        {previewQuestions.length > 0 && (
                          <div className="mt-4 space-y-3">
                            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-green-100 text-green-700">
                              <CheckCircleIcon className="w-5 h-5" />
                              <span className="text-sm font-semibold">
                                成功解析 {previewQuestions.length} 个测试问题
                              </span>
                            </div>
                            <div className="flex items-center justify-center space-x-3">
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowPreview(!showPreview)
                                }}
                                className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                              >
                                <EyeIcon className="w-5 h-5" />
                                <span className="font-medium">
                                  {showPreview ? '隐藏预览' : '预览问题'}
                                </span>
                              </motion.button>
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setUploadedFile(null)
                                  setPreviewQuestions([])
                                  setShowPreview(false)
                                }}
                                className="inline-flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                              >
                                <TrashIcon className="w-5 h-5" />
                                <span className="font-medium">移除文件</span>
                              </motion.button>
                            </div>
                          </div>
                        )}
                        {previewQuestions.length === 0 && (
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setUploadedFile(null)
                              setPreviewQuestions([])
                              setShowPreview(false)
                            }}
                            className="inline-flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg mt-2"
                          >
                            <TrashIcon className="w-5 h-5" />
                            <span className="font-medium">移除文件</span>
                          </motion.button>
                        )}
                      </>
                    ) : (
                      <>
                        <FolderOpenIcon className="w-16 h-16 text-primary-400 mx-auto" />
                        <p className="text-lg font-medium text-text-primary">
                          {isDragActive ? '松开以上传文件' : '拖放 Excel 文件到这里'}
                        </p>
                        <p className="text-sm text-text-secondary">或点击浏览文件</p>
                        <p className="text-xs text-text-tertiary mt-4">
                          支持格式: .xlsx, .xls
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Questions Preview Section */}
                <AnimatePresence>
                  {showPreview && previewQuestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="glass-card p-6 space-y-4"
                    >
                      <div className="flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm py-2 -mt-2 mb-2 border-b border-primary-200">
                        <h3 className="font-bold text-text-primary">
                          📝 问题预览 ({previewQuestions.length} 个)
                        </h3>
                        <button
                          onClick={() => setShowPreview(false)}
                          className="text-text-tertiary hover:text-text-primary text-2xl leading-none"
                        >
                          ×
                        </button>
                      </div>
                      
                      <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                        {previewQuestions.map((question, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="p-4 bg-gradient-to-r from-primary-50/50 to-transparent rounded-lg border-l-4 border-primary-400 hover:shadow-sm transition-shadow"
                          >
                            <p className="text-xs font-semibold text-primary-600 mb-2">
                              问题 {index + 1}
                            </p>
                            <p className="text-sm text-text-primary leading-relaxed">
                              {question}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {selectedAgent && (
                  <div className="glass-card p-4 bg-primary-50/30">
                    <p className="text-sm text-text-secondary">
                      <span className="font-semibold">选中的 Agent:</span> {selectedAgent.name} ({selectedAgent.region})
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Configure Test */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Cog6ToothIcon className="w-16 h-16 text-primary-400 mx-auto mb-3" />
                  <h2 className="text-2xl font-bold text-text-primary mb-2">配置测试参数</h2>
                  <p className="text-text-secondary">设置测试执行的相关参数</p>
                </div>

                <div className="space-y-6">
                  {/* Execution Mode */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-3">
                      执行模式
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setExecutionMode('parallel')}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          executionMode === 'parallel'
                            ? 'border-primary-400 bg-primary-50/50 shadow-md'
                            : 'border-primary-100 hover:border-primary-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-text-primary">并行执行</h4>
                            <p className="text-xs text-text-tertiary mt-1">同时执行多个请求</p>
                          </div>
                          {executionMode === 'parallel' && (
                            <CheckCircleIcon className="w-5 h-5 text-primary-500" />
                          )}
                        </div>
                      </motion.div>

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setExecutionMode('sequential')}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          executionMode === 'sequential'
                            ? 'border-primary-400 bg-primary-50/50 shadow-md'
                            : 'border-primary-100 hover:border-primary-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-text-primary">串行执行</h4>
                            <p className="text-xs text-text-tertiary mt-1">按顺序逐个执行</p>
                          </div>
                          {executionMode === 'sequential' && (
                            <CheckCircleIcon className="w-5 h-5 text-primary-500" />
                          )}
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Parallel: Max Concurrency / Sequential: Request Rate */}
                  {executionMode === 'parallel' ? (
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-3">
                        最大并发数
                      </label>
                      <select
                        className="input-field"
                        value={maxConcurrency}
                        onChange={(e) => setMaxConcurrency(Number(e.target.value))}
                      >
                        <option value={1}>1 个/批 (最安全)</option>
                        <option value={2}>2 个/批 (推荐)</option>
                        <option value={3}>3 个/批</option>
                        <option value={5}>5 个/批</option>
                        <option value={10}>10 个/批</option>
                        <option value={20}>20 个/批</option>
                      </select>
                      <p className="text-xs text-text-tertiary mt-2">
                        每批同时发起的请求数，批次间隔 1 秒。API 有并发限制时建议设为 2
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-3">
                        请求间隔
                      </label>
                      <select
                        className="input-field"
                        value={requestDelay}
                        onChange={(e) => setRequestDelay(Number(e.target.value))}
                      >
                        <option value={0}>无间隔 (收到回答立即发下一个)</option>
                        <option value={500}>0.5 秒</option>
                        <option value={1000}>1 秒</option>
                        <option value={2000}>2 秒</option>
                        <option value={5000}>5 秒</option>
                        <option value={10000}>10 秒</option>
                      </select>
                      <p className="text-xs text-text-tertiary mt-2">
                        收到上一个回答后，等待多久再发下一个问题
                      </p>
                    </div>
                  )}

                  {/* Request Timeout */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-3">
                      请求超时时间
                    </label>
                    <select
                      className="input-field"
                      value={requestTimeout}
                      onChange={(e) => setRequestTimeout(Number(e.target.value))}
                    >
                      <option value={30000}>30 秒</option>
                      <option value={60000}>60 秒 (默认)</option>
                      <option value={120000}>2 分钟</option>
                      <option value={180000}>3 分钟</option>
                      <option value={300000}>5 分钟</option>
                    </select>
                    <p className="text-xs text-text-tertiary mt-2">
                      单个问题等待 AI 回答的最长时间，超时则标记为失败
                    </p>
                  </div>

                  {/* Custom User ID */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-3">
                      会话用户ID (可选)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="留空则自动生成 (test_user_时间戳)"
                      value={customUserId}
                      onChange={(e) => setCustomUserId(e.target.value)}
                    />
                    <p className="text-xs text-text-tertiary mt-2">
                      指定 GPTBots 创建会话时使用的 user_id，不填则使用默认值
                    </p>
                  </div>
                </div>

                <div className="glass-card p-4 bg-primary-50/30 space-y-2">
                  <p className="text-sm font-semibold text-text-primary">测试摘要:</p>
                  <p className="text-sm text-text-secondary">
                    <span className="font-medium">Agent:</span> {selectedAgent?.name} ({selectedAgent?.region})
                  </p>
                  <p className="text-sm text-text-secondary">
                    <span className="font-medium">文件:</span> {uploadedFile?.name}
                  </p>
                  <p className="text-sm text-text-secondary">
                    <span className="font-medium">执行模式:</span> {executionMode === 'parallel' ? '并行' : '串行'}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {executionMode === 'parallel' ? (
                      <><span className="font-medium">并发数:</span> {maxConcurrency} 个/批</>
                    ) : (
                      <><span className="font-medium">请求间隔:</span> {requestDelay === 0 ? '无间隔' : `${requestDelay / 1000} 秒`}</>
                    )}
                  </p>
                  <p className="text-sm text-text-secondary">
                    <span className="font-medium">超时时间:</span> {requestTimeout / 1000} 秒
                  </p>
                  <p className="text-sm text-text-secondary">
                    <span className="font-medium">会话用户ID:</span> {customUserId || '自动生成'}
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Start Test */}
            {step === 4 && (
              <div className="space-y-6">
                {isTestingLive || testCompleted ? (
                  // Live Testing State with Real-time Updates
                  <div className="space-y-6">
                    <div className="text-center">
                      {testCompleted ? (
                        <>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="w-16 h-16 mx-auto mb-4"
                          >
                            {liveStats.failedCount > 0 ? (
                              <ExclamationTriangleIcon className="w-full h-full text-yellow-500" />
                            ) : (
                              <CheckCircleIcon className="w-full h-full text-green-500" />
                            )}
                          </motion.div>
                          <h2 className="text-2xl font-bold text-text-primary mb-2">
                            {liveStats.failedCount > 0 ? '测试完成，部分失败' : '测试完成！'}
                          </h2>
                          {liveStats.failedCount > 0 ? (
                            <p className="text-yellow-600">
                              有 {liveStats.failedCount} 个问题失败，您可以选择重试
                            </p>
                          ) : (
                            <p className="text-text-secondary">正在跳转到历史记录...</p>
                          )}
                        </>
                      ) : (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="w-16 h-16 mx-auto mb-4"
                          >
                            <BeakerIcon className="w-full h-full text-primary-500" />
                          </motion.div>
                          <h2 className="text-2xl font-bold text-text-primary mb-2">测试进行中...</h2>
                          <p className="text-text-secondary">正在实时执行测试</p>
                        </>
                      )}
                    </div>

                    {/* Progress Stats */}
                    <div className="glass-card p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-primary-500">
                            {liveStats.current}/{liveStats.total}
                          </p>
                          <p className="text-sm text-text-tertiary mt-1">进度</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-green-500">
                            {liveStats.passedCount}
                          </p>
                          <p className="text-sm text-text-tertiary mt-1">成功</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-red-500">
                            {liveStats.failedCount}
                          </p>
                          <p className="text-sm text-text-tertiary mt-1">失败</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-primary-500">
                            {liveStats.successRate}%
                          </p>
                          <p className="text-sm text-text-tertiary mt-1">成功率</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-6">
                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-primary-400 to-primary-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${liveStats.total > 0 ? (liveStats.current / liveStats.total) * 100 : 0}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>

                      {/* Action Buttons - Show when test completed and needs saving */}
                      {testCompleted && pendingSaveData && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-6 flex flex-col sm:flex-row gap-3 justify-center"
                        >
                          {liveStats.failedCount > 0 ? (
                            <>
                              <button
                                onClick={handleRetryFailed}
                                disabled={isRetrying || isSaving}
                                className="flex items-center justify-center space-x-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                              >
                                <ArrowPathIcon className={`w-5 h-5 ${isRetrying ? 'animate-spin' : ''}`} />
                                <span>{isRetrying ? '重试中...' : `重试 ${liveStats.failedCount} 个失败问题`}</span>
                              </button>
                              <button
                                onClick={handleSaveAndNavigate}
                                disabled={isSaving || isRetrying}
                                className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                              >
                                <CheckCircleIcon className="w-5 h-5" />
                                <span>{isSaving ? '保存中...' : '跳过重试，查看结果'}</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={handleSaveAndNavigate}
                              disabled={isSaving}
                              className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                            >
                              <CheckCircleIcon className="w-5 h-5" />
                              <span>{isSaving ? '保存中...' : '✅ 保存结果并查看报告'}</span>
                            </button>
                          )}
                        </motion.div>
                      )}
                    </div>

                    {/* Current Question & Response */}
                    {(currentQuestion || currentResponse) && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-6 space-y-4"
                      >
                        {currentQuestion && (
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <InformationCircleIcon className="w-5 h-5 text-primary-500" />
                              <h3 className="font-semibold text-text-primary">当前测试问题</h3>
                            </div>
                            <p className="text-text-secondary bg-gray-50 p-3 rounded-lg">
                              {currentQuestion}
                            </p>
                          </div>
                        )}
                        
                        {currentResponse && (
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <CpuChipIcon className="w-5 h-5 text-green-500" />
                              <h3 className="font-semibold text-text-primary">
                                {testCompleted ? '状态' : 'AI 回复'}
                              </h3>
                            </div>
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className={`text-text-secondary p-3 rounded-lg ${
                                testCompleted ? 'bg-green-100 text-green-700 font-semibold' : 'bg-green-50'
                              }`}
                            >
                              {currentResponse}
                            </motion.p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Recent Results */}
                    {liveResults.length > 0 && (
                      <div className="glass-card p-6">
                        <h3 className="font-semibold text-text-primary mb-4">最近结果 ({liveResults.slice(-5).length})</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {liveResults.slice(-5).reverse().map((result, idx) => {
                            const actualIndex = liveResults.length - 1 - idx
                            const isExpanded = expandedResults.has(actualIndex)
                            
                            return (
                              <motion.div
                                key={actualIndex}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`rounded-lg border-l-4 overflow-hidden ${
                                  result.success
                                    ? 'bg-green-50 border-green-400'
                                    : 'bg-red-50 border-red-400'
                                }`}
                              >
                                <div 
                                  onClick={() => toggleResultExpand(actualIndex)}
                                  className="p-3 cursor-pointer hover:bg-white/50 transition-colors"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-start space-x-2">
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-text-primary mb-1">
                                            {result.question}
                                          </p>
                                          <p className="text-xs text-text-tertiary">
                                            响应时间: {result.responseTime}ms | Tokens: {result.tokens || 'N/A'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-2">
                                      {result.success ? (
                                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                      ) : (
                                        <span className="text-red-500 text-lg">❌</span>
                                      )}
                                      {isExpanded ? (
                                        <ChevronUpIcon className="w-5 h-5 text-text-tertiary" />
                                      ) : (
                                        <ChevronDownIcon className="w-5 h-5 text-text-tertiary" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="px-3 pb-3 pt-2 border-t border-white/50">
                                        <div className="flex items-center space-x-2 mb-2">
                                          <CpuChipIcon className="w-4 h-4 text-text-tertiary" />
                                          <span className="text-xs font-semibold text-text-secondary">
                                            {result.success ? 'AI 回复' : '错误信息'}
                                          </span>
                                        </div>
                                        <div className={`text-sm p-3 rounded-lg ${
                                          result.success 
                                            ? 'bg-white text-text-primary' 
                                            : 'bg-red-100 text-error'
                                        }`}>
                                          <pre className="whitespace-pre-wrap break-words font-sans">
                                            {result.success ? result.response : result.error}
                                          </pre>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Ready to Start
                  <div className="text-center py-12">
                    <PlayIcon className="w-20 h-20 text-primary-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-text-primary mb-2">准备就绪！</h2>
                    <p className="text-text-secondary mb-8">
                      点击下方按钮开始执行测试
                    </p>

                    <div className="glass-card p-6 bg-primary-50/30 max-w-md mx-auto text-left space-y-3">
                      <h3 className="font-semibold text-text-primary mb-3">测试配置确认:</h3>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">Agent:</span>
                        <span className="font-medium text-text-primary">
                          {selectedAgent?.name} ({selectedAgent?.region})
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">数据文件:</span>
                        <span className="font-medium text-text-primary">{uploadedFile?.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">执行模式:</span>
                        <span className="font-medium text-text-primary">
                          {executionMode === 'parallel' ? '并行执行' : '串行执行'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">{executionMode === 'parallel' ? '并发数:' : '请求间隔:'}</span>
                        <span className="font-medium text-text-primary">
                          {executionMode === 'parallel' 
                            ? `${maxConcurrency} 个/批` 
                            : (requestDelay === 0 ? '无间隔' : `${requestDelay / 1000} 秒`)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">会话用户ID:</span>
                        <span className="font-medium text-text-primary">
                          {customUserId || '自动生成'}
                        </span>
                      </div>
                    </div>

                    {testError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-w-md mx-auto mt-6"
                      >
                        <p className="text-sm text-error">{testError}</p>
                      </motion.div>
                    )}

                    <motion.button
                      whileHover={{ scale: isTestingLive ? 1 : 1.05 }}
                      whileTap={{ scale: isTestingLive ? 1 : 0.95 }}
                      onClick={handleStartTest}
                      disabled={isTestingLive}
                      className="btn-primary text-lg px-10 py-4 flex items-center space-x-3 mx-auto mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <BeakerIcon className="w-6 h-6" />
                      <span>开始测试</span>
                    </motion.button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleBack}
          disabled={step === 1 || isTestingLive}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all ${
            step === 1 || isTestingLive
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-white text-text-primary hover:bg-primary-50 shadow-md'
          }`}
        >
          <ChevronLeftIcon className="w-5 h-5" />
          <span>上一步</span>
        </button>

        {step < 4 && (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all ${
              !canProceed()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'btn-primary shadow-md'
            }`}
          >
            <span>下一步</span>
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
