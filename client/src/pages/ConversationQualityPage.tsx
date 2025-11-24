import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  PaperClipIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  SparklesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

type QualityTag = 'resolved' | 'partially_resolved' | 'unresolved'

interface QualityResult {
  tag: QualityTag
  confidence: number
  reasoning?: string
}

const tagConfig: Record<QualityTag, { label: string; color: string; icon: any }> = {
  resolved: {
    label: '已解决',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: CheckCircleIcon,
  },
  partially_resolved: {
    label: '部分解决',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: ExclamationCircleIcon,
  },
  unresolved: {
    label: '未解决',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: XCircleIcon,
  },
}

export function ConversationQualityPage() {
  const [conversationText, setConversationText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<QualityResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!conversationText.trim()) {
      setError('请输入对话内容')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setResult(null)

    // TODO: 实现实际的 API 调用
    // 这里先模拟一个分析结果
    setTimeout(() => {
      const mockResults: QualityResult[] = [
        { tag: 'resolved', confidence: 0.92, reasoning: '客户问题已得到完整解答，AI 提供了明确的解决方案，客户表示满意。' },
        { tag: 'partially_resolved', confidence: 0.68, reasoning: 'AI 提供了部分相关信息，但未能完全解决客户的核心问题，需要进一步跟进。' },
        { tag: 'unresolved', confidence: 0.85, reasoning: '客户问题未得到有效解决，AI 的回答偏离主题或未能理解客户需求。' },
      ]
      const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)]
      setResult(randomResult)
      setIsAnalyzing(false)
    }, 2000)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      setError('请上传 .txt 格式的文件')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setConversationText(content)
      setError(null)
    }
    reader.onerror = () => {
      setError('文件读取失败')
    }
    reader.readAsText(file)
  }

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6 text-primary-500" />
            输入对话内容
          </h2>

          {/* File Upload */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-text-secondary">
              上传对话文件
            </label>
            <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-primary-300 rounded-lg cursor-pointer hover:border-primary-400 transition-colors">
              <div className="flex flex-col items-center gap-2">
                <PaperClipIcon className="w-8 h-8 text-primary-400" />
                <span className="text-sm text-text-secondary">
                  点击上传或拖拽文件到此处
                </span>
                <span className="text-xs text-text-tertiary">支持 .txt 格式</span>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".txt,text/plain"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {/* Text Input */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-text-secondary">
              或直接输入对话内容
            </label>
            <textarea
              value={conversationText}
              onChange={(e) => {
                setConversationText(e.target.value)
                setError(null)
              }}
              placeholder="请输入完整的对话内容，包括客户和 AI 的所有消息..."
              className="w-full h-64 px-4 py-3 border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none bg-white text-text-primary placeholder-text-tertiary"
            />
            <div className="mt-2 text-xs text-text-tertiary text-right">
              {conversationText.length} 字符
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !conversationText.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
          >
            {isAnalyzing ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5" />
                开始分析
              </>
            )}
          </button>
        </motion.div>

        {/* Result Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <SparklesIcon className="w-6 h-6 text-primary-500" />
            分析结果
          </h2>

          <AnimatePresence mode="wait">
            {!result && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-64 text-text-tertiary"
              >
                <ChatBubbleLeftRightIcon className="w-16 h-16 mb-4 opacity-50" />
                <p>输入对话内容后，点击"开始分析"查看结果</p>
              </motion.div>
            )}

            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-64"
              >
                <ArrowPathIcon className="w-12 h-12 text-primary-500 animate-spin mb-4" />
                <p className="text-text-secondary">AI 正在分析对话内容...</p>
              </motion.div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                {/* Tag Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-text-secondary">完成度标签：</span>
                    <div
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${tagConfig[result.tag].color}`}
                    >
                      <tagConfig[result.tag].icon className="w-5 h-5" />
                      <span className="font-semibold">{tagConfig[result.tag].label}</span>
                    </div>
                  </div>
                </div>

                {/* Confidence Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-secondary">置信度：</span>
                    <span className="text-lg font-bold text-primary-600">
                      {(result.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${result.confidence * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-3 rounded-full ${
                        result.confidence >= 0.8
                          ? 'bg-green-500'
                          : result.confidence >= 0.6
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Reasoning */}
                {result.reasoning && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-semibold text-text-primary mb-2">分析理由：</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {result.reasoning}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setConversationText('')
                      setResult(null)
                      setError(null)
                    }}
                    className="flex-1 px-4 py-2 border border-primary-300 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
                  >
                    清空内容
                  </button>
                  <button
                    onClick={handleAnalyze}
                    className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    重新分析
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <h3 className="text-lg font-semibold text-text-primary mb-3">功能说明</h3>
        <ul className="space-y-2 text-sm text-text-secondary">
          <li className="flex items-start gap-2">
            <span className="text-primary-500 mt-1">•</span>
            <span>
              <strong>已解决：</strong>客户问题已得到完整解答，AI 提供了明确的解决方案，客户表示满意。
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-500 mt-1">•</span>
            <span>
              <strong>部分解决：</strong>AI 提供了部分相关信息，但未能完全解决客户的核心问题，需要进一步跟进。
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-500 mt-1">•</span>
            <span>
              <strong>未解决：</strong>客户问题未得到有效解决，AI 的回答偏离主题或未能理解客户需求。
            </span>
          </li>
        </ul>
      </motion.div>
    </div>
  )
}

