import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ArrowLeftIcon,
  ChartBarIcon,
  ClockIcon,
  CpuChipIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import { historyApi } from '../lib/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'

export function ComparePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const ids = searchParams.get('ids')?.split(',').map(Number).filter(Boolean) || []
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set())

  const { data: histories, isLoading } = useQuery({
    queryKey: ['compare-histories', ids],
    queryFn: () => historyApi.getMultiple(ids),
    enabled: ids.length > 0,
  })

  const toggleQuestion = (index: number) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  if (ids.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-text-primary mb-2">未选择对比项</h2>
          <p className="text-text-secondary mb-6">请从历史记录页面选择要对比的测试记录</p>
          <button
            onClick={() => navigate('/history')}
            className="btn-primary"
          >
            返回历史记录
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-text-secondary">加载对比数据中...</p>
        </div>
      </div>
    )
  }

  if (!histories || histories.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <p className="text-text-secondary">未找到测试记录</p>
        </div>
      </div>
    )
  }

  // 准备图表数据
  const chartData = histories.map((h) => ({
    name: `${h.agentName}\n(${h.agent?.region || 'N/A'})`,
    agentName: h.agentName,
    modelName: h.agent?.region || 'N/A',
    successRate: Number(h.successRate) || 0,
    avgResponseTime: Number(h.avgResponseTime) || 0,
    totalQuestions: h.totalQuestions || 0,
    passedCount: h.passedCount || 0,
    failedCount: h.failedCount || 0,
    durationSeconds: h.durationSeconds || 0,
    totalTokens: (h.jsonData as any)?.totalTokens || 0,
    totalCost: (h.jsonData as any)?.totalCost || 0,
  }))

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/history')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6 text-text-secondary" />
          </button>
          <ChartBarIcon className="w-8 h-8 text-primary-500" />
          <h1 className="text-3xl font-bold text-text-primary">模型对比分析</h1>
        </div>
        <div className="text-right">
          <div className="text-sm text-text-secondary">
            对比 {histories.length} 个测试记录
          </div>
          <div className="text-xs text-text-tertiary">
            {histories[0]?.totalQuestions || 0} 个相同问题
          </div>
        </div>
      </div>

      {/* 响应时间对比 */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center">
          <ClockIcon className="w-6 h-6 mr-2 text-primary-500" />
          响应时间对比
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="agentName" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="avgResponseTime"
              name="平均响应时间 (ms)"
              stroke="#3b82f6"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Token消耗对比 */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center">
          <CpuChipIcon className="w-6 h-6 mr-2 text-warning" />
          Token消耗对比
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="agentName" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="totalTokens" name="总Token消耗" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 问题级别对比 */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-text-primary mb-4">问题回复对比</h2>
        <p className="text-sm text-text-secondary mb-4">
          对比不同Agent对相同问题的回复内容
        </p>
        
        {(() => {
          // 获取第一个测试的问题列表作为基准
          const baseResults = (histories[0]?.jsonData as any)?.results || []
          
          return (
            <div className="space-y-4">
              {baseResults.map((baseResult: any, qIndex: number) => {
                const isExpanded = expandedQuestions.has(qIndex)
                
                return (
                  <div key={qIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Question Header - Always visible */}
                    <div 
                      className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleQuestion(qIndex)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-text-primary">
                              问题 {qIndex + 1}
                            </h3>
                            {isExpanded ? (
                              <ChevronUpIcon className="w-5 h-5 text-text-tertiary" />
                            ) : (
                              <ChevronDownIcon className="w-5 h-5 text-text-tertiary" />
                            )}
                          </div>
                          <p className="text-sm text-text-secondary line-clamp-2">{baseResult.question}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Question Details - Expandable */}
                    {isExpanded && (
                      <div className="p-4 border-t border-gray-200">
                        <div className="mb-4">
                          <p className="text-sm text-text-secondary mb-3">
                            <span className="font-semibold">完整问题: </span>
                            {baseResult.question}
                          </p>
                          {baseResult.referenceOutput && (
                            <div className="p-2 bg-blue-50 rounded">
                              <p className="text-xs font-semibold text-blue-700 mb-1">参考答案:</p>
                              <p className="text-xs text-blue-600">{baseResult.referenceOutput}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          {histories.map((history, hIndex) => {
                            const result = ((history.jsonData as any)?.results || [])[qIndex]
                            if (!result) return null
                            
                            return (
                              <div 
                                key={history.id}
                                className="p-4 rounded-lg border-2"
                                style={{ borderColor: colors[hIndex % colors.length] }}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-2">
                                    <div 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: colors[hIndex % colors.length] }}
                                    />
                                    <span className="font-semibold text-text-primary">
                                      {history.agentName}
                                    </span>
                                    {history.agent?.modelName && (
                                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                        {history.agent.modelName}
                                      </span>
                                    )}
                                    {history.agent?.region && (
                                      <span className="text-xs text-text-tertiary">
                                        ({history.agent.region})
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-4 text-xs">
                                    <span className={result.success ? 'text-success' : 'text-error'}>
                                      {result.success ? '✓ 成功' : '✗ 失败'}
                                    </span>
                                    <span className="text-text-tertiary">
                                      {result.responseTime}ms
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="mt-2">
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Agent回复:</p>
                                  {result.success ? (
                                    <div className="text-sm text-text-primary whitespace-pre-wrap bg-gray-50 p-3 rounded">
                                      {result.response}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-error bg-red-50 p-3 rounded">
                                      错误: {result.error}
                                    </div>
                                  )}
                                </div>
                                
                                {result.tokens && (
                                  <div className="mt-2 text-xs text-text-tertiary">
                                    Token消耗: {result.tokens}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* 详细数据表格 */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-text-primary mb-4">统计数据对比</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-text-secondary font-medium">指标</th>
                {histories.map((h, i) => (
                  <th
                    key={i}
                    className="text-left py-3 px-4 font-medium"
                    style={{ color: colors[i % colors.length] }}
                  >
                    {h.agentName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-text-secondary">区域</td>
                {histories.map((h, i) => (
                  <td key={i} className="py-3 px-4 text-text-primary">
                    {h.agent?.region || 'N/A'}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-text-secondary">总问题数</td>
                {histories.map((h, i) => (
                  <td key={i} className="py-3 px-4 text-text-primary">
                    {h.totalQuestions || 0}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-text-secondary">成功数</td>
                {histories.map((h, i) => (
                  <td key={i} className="py-3 px-4 text-success font-semibold">
                    {h.passedCount || 0}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-text-secondary">失败数</td>
                {histories.map((h, i) => (
                  <td key={i} className="py-3 px-4 text-error font-semibold">
                    {h.failedCount || 0}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-text-secondary">成功率</td>
                {histories.map((h, i) => (
                  <td key={i} className="py-3 px-4 text-text-primary font-semibold">
                    {(Number(h.successRate) || 0).toFixed(2)}%
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-text-secondary">总耗时</td>
                {histories.map((h, i) => (
                  <td key={i} className="py-3 px-4 text-text-primary">
                    {h.durationSeconds || 0}s
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-text-secondary">平均响应时间</td>
                {histories.map((h, i) => (
                  <td key={i} className="py-3 px-4 text-text-primary">
                    {(Number(h.avgResponseTime) || 0).toFixed(0)}ms
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-text-secondary">Token消耗</td>
                {histories.map((h, i) => (
                  <td key={i} className="py-3 px-4 text-text-primary">
                    {((h.jsonData as any)?.totalTokens || 0).toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-text-secondary">总成本</td>
                {histories.map((h, i) => (
                  <td key={i} className="py-3 px-4 text-text-primary">
                    ${((h.jsonData as any)?.totalCost || 0).toFixed(4)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-text-secondary">执行模式</td>
                {histories.map((h, i) => (
                  <td key={i} className="py-3 px-4 text-text-primary">
                    {h.executionMode === 'parallel' ? '并行' : '串行'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 text-text-secondary">RPM</td>
                {histories.map((h, i) => (
                  <td key={i} className="py-3 px-4 text-text-primary">
                    {h.rpm || 'N/A'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

