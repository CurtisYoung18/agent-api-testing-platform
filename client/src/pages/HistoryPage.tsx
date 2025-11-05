import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { historyApi, type TestHistory } from '@/lib/api'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { 
  ClockIcon,
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  DocumentIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

export function HistoryPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [selectedRecord, setSelectedRecord] = useState<TestHistory | null>(null)
  
  const { data, isLoading } = useQuery({
    queryKey: ['history', page],
    queryFn: () => historyApi.getAll({ page, limit: 20 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => historyApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] })
    },
  })

  const handleDownload = (id: number, format: 'excel' | 'markdown' | 'json') => {
    try {
      historyApi.download(id, format)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const handleDelete = (id: number, agentName: string) => {
    if (window.confirm(`确定要删除 "${agentName}" 的测试记录吗？`)) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <ClockIcon className="w-8 h-8 text-primary-500" />
        <h1 className="text-3xl font-bold text-text-primary">测试历史</h1>
      </div>

      {/* Search and Filters */}
      <div className="glass-card p-4 flex items-center space-x-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="text"
            placeholder="搜索..."
            className="input-field pl-10"
          />
        </div>
        <select className="input-field w-48">
          <option value="">所有结果</option>
          <option value="success">仅成功 (&gt;80%)</option>
          <option value="failed">失败测试 (&lt;80%)</option>
        </select>
        <select className="input-field w-48">
          <option value="testDate-desc">最新优先</option>
          <option value="testDate-asc">最旧优先</option>
          <option value="successRate-desc">成功率 (高到低)</option>
        </select>
      </div>

      {/* Test Records */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="glass-card p-6 text-center text-text-secondary">
            加载中...
          </div>
        ) : data && data.data.length > 0 ? (
          data.data.map((record) => (
            <div key={record.id} className="glass-card p-6 hover:shadow-glass-hover transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-text-tertiary">
                    {new Date(record.testDate).toLocaleString('zh-CN')}
                  </p>
                  <h3 className="text-lg font-semibold text-text-primary mt-1">
                    {record.agentName}
                  </h3>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className={`badge flex items-center space-x-1 ${record.successRate >= 80 ? 'badge-success' : 'badge-warning'}`}>
                      {record.successRate >= 80 ? (
                        <CheckCircleIcon className="w-4 h-4" />
                      ) : (
                        <XCircleIcon className="w-4 h-4" />
                      )}
                      <span>{record.passedCount}/{record.totalQuestions} ({record.successRate.toFixed(0)}%)</span>
                    </span>
                    <span className="text-sm text-text-tertiary flex items-center space-x-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>{Math.floor(record.durationSeconds / 60)}分 {record.durationSeconds % 60}秒</span>
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleDownload(record.id, 'excel')}
                    className="btn-outline py-1 px-3 text-sm flex items-center space-x-1"
                    title="下载 Excel 报告"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    <span>Excel</span>
                  </button>
                  <button 
                    onClick={() => handleDownload(record.id, 'markdown')}
                    className="btn-outline py-1 px-3 text-sm flex items-center space-x-1"
                    title="下载 Markdown 报告"
                  >
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>MD</span>
                  </button>
                  <button 
                    onClick={() => handleDownload(record.id, 'json')}
                    className="btn-outline py-1 px-3 text-sm flex items-center space-x-1"
                    title="下载 JSON 数据"
                  >
                    <DocumentIcon className="w-4 h-4" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setSelectedRecord(record)}
                  className="btn-secondary py-1 px-3 text-sm flex items-center space-x-1"
                >
                  <EyeIcon className="w-4 h-4" />
                  <span>查看详情</span>
                </button>
                <button 
                  onClick={() => handleDelete(record.id, record.agentName)}
                  disabled={deleteMutation.isPending}
                  className="btn-secondary py-1 px-3 text-sm text-error flex items-center space-x-1 disabled:opacity-50"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>{deleteMutation.isPending ? '删除中...' : '删除'}</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-card p-12 text-center">
            <ChartBarIcon className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <p className="text-lg text-text-secondary mb-4">暂无测试历史</p>
            <p className="text-sm text-text-tertiary mb-6">
              运行你的第一个测试以查看结果
            </p>
            <a href="/test" className="btn-primary inline-flex items-center space-x-2">
              <ClockIcon className="w-5 h-5" />
              <span>开始第一个测试</span>
            </a>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary"
          >
            上一页
          </button>
          <span className="flex items-center px-4 text-text-secondary">
            第 {page} 页，共 {data.pagination.totalPages} 页
          </span>
          <button
            onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
            disabled={page === data.pagination.totalPages}
            className="btn-secondary"
          >
            下一页
          </button>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedRecord(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-text-primary">测试详情</h2>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="glass-card p-4">
                  <p className="text-sm text-text-tertiary mb-1">总问题数</p>
                  <p className="text-2xl font-bold text-text-primary">{selectedRecord.totalQuestions}</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-sm text-text-tertiary mb-1">通过数</p>
                  <p className="text-2xl font-bold text-green-500">{selectedRecord.passedCount}</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-sm text-text-tertiary mb-1">失败数</p>
                  <p className="text-2xl font-bold text-red-500">{selectedRecord.failedCount}</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-sm text-text-tertiary mb-1">成功率</p>
                  <p className="text-2xl font-bold text-text-primary">{selectedRecord.successRate.toFixed(1)}%</p>
                </div>
              </div>

              {/* Test Info */}
              <div className="glass-card p-4 mb-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Agent 名称:</span>
                  <span className="font-medium text-text-primary">{selectedRecord.agentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">测试时间:</span>
                  <span className="font-medium text-text-primary">{new Date(selectedRecord.testDate).toLocaleString('zh-CN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">执行时长:</span>
                  <span className="font-medium text-text-primary">
                    {Math.floor(selectedRecord.durationSeconds / 60)}分 {selectedRecord.durationSeconds % 60}秒
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">平均响应时间:</span>
                  <span className="font-medium text-text-primary">{selectedRecord.avgResponseTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">执行模式:</span>
                  <span className="font-medium text-text-primary">
                    {selectedRecord.executionMode === 'parallel' ? '并行' : '串行'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">速率限制:</span>
                  <span className="font-medium text-text-primary">{selectedRecord.rpm} RPM</span>
                </div>
              </div>

              {/* Results Table */}
              {selectedRecord.jsonData && selectedRecord.jsonData.results && (
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">测试结果</h3>
                  <div className="glass-card overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-primary-200">
                          <th className="text-left p-3 text-sm font-medium text-text-primary">序号</th>
                          <th className="text-left p-3 text-sm font-medium text-text-primary">问题</th>
                          <th className="text-left p-3 text-sm font-medium text-text-primary">状态</th>
                          <th className="text-left p-3 text-sm font-medium text-text-primary">响应时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRecord.jsonData.results.map((result: any, index: number) => (
                          <tr key={index} className="border-b border-primary-100">
                            <td className="p-3 text-sm text-text-secondary">{index + 1}</td>
                            <td className="p-3 text-sm text-text-primary max-w-md truncate">{result.question}</td>
                            <td className="p-3">
                              {result.success ? (
                                <span className="badge badge-success">✅ 通过</span>
                              ) : (
                                <span className="badge badge-warning">❌ 失败</span>
                              )}
                            </td>
                            <td className="p-3 text-sm text-text-secondary">{result.responseTime}ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Download Buttons */}
              <div className="flex justify-center space-x-3 mt-6">
                <button
                  onClick={() => handleDownload(selectedRecord.id, 'excel')}
                  className="btn-primary flex items-center space-x-2"
                >
                  <DocumentArrowDownIcon className="w-5 h-5" />
                  <span>下载 Excel</span>
                </button>
                <button
                  onClick={() => handleDownload(selectedRecord.id, 'markdown')}
                  className="btn-outline flex items-center space-x-2"
                >
                  <DocumentTextIcon className="w-5 h-5" />
                  <span>下载 Markdown</span>
                </button>
                <button
                  onClick={() => handleDownload(selectedRecord.id, 'json')}
                  className="btn-outline flex items-center space-x-2"
                >
                  <DocumentIcon className="w-5 h-5" />
                  <span>下载 JSON</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
