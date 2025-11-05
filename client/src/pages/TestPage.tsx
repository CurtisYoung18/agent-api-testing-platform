import { useState, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { 
  BeakerIcon, 
  FolderOpenIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckCircleIcon,
  CpuChipIcon,
  DocumentArrowUpIcon,
  Cog6ToothIcon,
  PlayIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { api, testsApi } from '../lib/api'

interface Agent {
  id: number
  name: string
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
  const [rpm, setRpm] = useState(60)
  const [testError, setTestError] = useState('')

  // Fetch agents
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await api.get('/agents')
      return response.data as Agent[]
    },
  })

  // Create test mutation
  const createTestMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return testsApi.create(formData)
    },
    onSuccess: () => {
      // Navigate to history page after successful test creation
      navigate('/history')
    },
    onError: (error: any) => {
      setTestError(error.response?.data?.error || '测试创建失败，请重试')
    },
  })

  // Filter agents based on search
  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.region.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // File upload handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadedFile(acceptedFiles[0])
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

  const handleStartTest = () => {
    if (!selectedAgent || !uploadedFile) {
      setTestError('请确保已选择 Agent 和上传文件')
      return
    }

    setTestError('')
    
    const formData = new FormData()
    formData.append('agentId', selectedAgent.id.toString())
    formData.append('file', uploadedFile)
    formData.append('executionMode', executionMode)
    formData.append('rpm', rpm.toString())

    createTestMutation.mutate(formData)
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
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedAgent(agent)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedAgent?.id === agent.id
                            ? 'border-primary-400 bg-primary-50/50 shadow-md'
                            : 'border-primary-100 hover:border-primary-300 hover:bg-primary-50/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-semibold text-text-primary">{agent.name}</h3>
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setUploadedFile(null)
                          }}
                          className="text-sm text-red-500 hover:text-red-600"
                        >
                          移除文件
                        </button>
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

                  {/* RPM */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-3">
                      速率限制 (RPM)
                    </label>
                    <select
                      className="input-field"
                      value={rpm}
                      onChange={(e) => setRpm(Number(e.target.value))}
                    >
                      <option value={10}>10 请求/分钟</option>
                      <option value={30}>30 请求/分钟</option>
                      <option value={60}>60 请求/分钟</option>
                      <option value={120}>120 请求/分钟</option>
                    </select>
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
                    <span className="font-medium">速率限制:</span> {rpm} RPM
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Start Test */}
            {step === 4 && (
              <div className="space-y-6 text-center py-12">
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
                    <span className="text-text-secondary">速率限制:</span>
                    <span className="font-medium text-text-primary">{rpm} RPM</span>
                  </div>
                </div>

                {testError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-w-md mx-auto"
                  >
                    <p className="text-sm text-error">{testError}</p>
                  </motion.div>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStartTest}
                  disabled={createTestMutation.isPending}
                  className="btn-primary text-lg px-10 py-4 flex items-center space-x-3 mx-auto mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <BeakerIcon className="w-6 h-6" />
                  <span>{createTestMutation.isPending ? '提交中...' : '开始测试'}</span>
                </motion.button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all ${
            step === 1
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
