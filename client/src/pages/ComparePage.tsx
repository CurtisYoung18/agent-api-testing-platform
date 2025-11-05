import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  ChartBarIcon,
  ClockIcon,
  CpuChipIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { historyApi, TestHistory } from '../lib/api'
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'

export function ComparePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const ids = searchParams.get('ids')?.split(',').map(Number).filter(Boolean) || []

  const { data: histories, isLoading } = useQuery({
    queryKey: ['compare-histories', ids],
    queryFn: () => historyApi.getMultiple(ids),
    enabled: ids.length > 0,
  })

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
    successRate: h.successRate,
    avgResponseTime: h.avgResponseTime || 0,
    totalQuestions: h.totalQuestions,
    passedCount: h.passedCount,
    failedCount: h.failedCount,
    durationSeconds: h.durationSeconds,
    totalTokens: (h.jsonData as any)?.totalTokens || 0,
    totalCost: (h.jsonData as any)?.totalCost || 0,
  }))

  // 雷达图数据
  const radarData = [
    {
      metric: '成功率',
      ...Object.fromEntries(histories.map((h, i) => [`agent${i}`, h.successRate])),
    },
    {
      metric: '响应速度',
      ...Object.fromEntries(
        histories.map((h, i) => [
          `agent${i}`,
          Math.max(0, 100 - ((h.avgResponseTime || 0) / 100)),
        ])
      ),
    },
    {
      metric: '成本效益',
      ...Object.fromEntries(
        histories.map((h, i) => [
          `agent${i}`,
          Math.max(0, 100 - (((h.jsonData as any)?.totalCost || 0) * 100)),
        ])
      ),
    },
  ]

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
        <div className="text-sm text-text-secondary">
          对比 {histories.length} 个测试记录
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {histories.map((history, index) => (
          <motion.div
            key={history.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-6"
            style={{ borderTop: `4px solid ${colors[index % colors.length]}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <CpuChipIcon className="w-8 h-8" style={{ color: colors[index % colors.length] }} />
              <span className="text-xs text-text-tertiary">
                {new Date(history.testDate).toLocaleDateString('zh-CN')}
              </span>
            </div>
            <h3 className="font-bold text-lg text-text-primary mb-1">{history.agentName}</h3>
            <p className="text-sm text-text-secondary mb-4">
              区域: {history.agent?.region || 'N/A'}
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">成功率:</span>
                <span className="font-semibold text-text-primary">
                  {history.successRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">平均耗时:</span>
                <span className="font-semibold text-text-primary">
                  {history.avgResponseTime?.toFixed(0) || 0}ms
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Token:</span>
                <span className="font-semibold text-text-primary">
                  {((history.jsonData as any)?.totalTokens || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 成功率对比 */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center">
          <CheckCircleIcon className="w-6 h-6 mr-2 text-success" />
          成功率对比
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="agentName" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="successRate" name="成功率 (%)" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
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

      {/* 综合评分雷达图 */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-text-primary mb-4">综合性能雷达图</h2>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="metric" />
            <PolarRadiusAxis domain={[0, 100]} />
            {histories.map((h, i) => (
              <Radar
                key={i}
                name={h.agentName}
                dataKey={`agent${i}`}
                stroke={colors[i % colors.length]}
                fill={colors[i % colors.length]}
                fillOpacity={0.3}
              />
            ))}
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 详细数据表格 */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-text-primary mb-4">详细数据对比</h2>
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
                    {h.totalQuestions}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-text-secondary">成功数</td>
                {histories.map((h, i) => (
                  <td key={i} className="py-3 px-4 text-success font-semibold">
                    {h.passedCount}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-text-secondary">失败数</td>
                {histories.map((h, i) => (
                  <td key={i} className="py-3 px-4 text-error font-semibold">
                    {h.failedCount}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-text-secondary">成功率</td>
                {histories.map((h, i) => (
                  <td key={i} className="py-3 px-4 text-text-primary font-semibold">
                    {h.successRate.toFixed(2)}%
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-text-secondary">总耗时</td>
                {histories.map((h, i) => (
                  <td key={i} className="py-3 px-4 text-text-primary">
                    {h.durationSeconds}s
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-text-secondary">平均响应时间</td>
                {histories.map((h, i) => (
                  <td key={i} className="py-3 px-4 text-text-primary">
                    {h.avgResponseTime?.toFixed(0) || 0}ms
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

