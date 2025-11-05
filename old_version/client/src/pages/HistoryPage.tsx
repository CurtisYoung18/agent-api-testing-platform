import { useQuery } from '@tanstack/react-query'
import { historyApi } from '@/lib/api'
import { useState } from 'react'
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
} from '@heroicons/react/24/outline'

export function HistoryPage() {
  const [page, setPage] = useState(1)
  
  const { data, isLoading } = useQuery({
    queryKey: ['history', page],
    queryFn: () => historyApi.getAll({ page, limit: 20 }),
  })

  const handleDownload = async (id: number, format: 'excel' | 'markdown' | 'json') => {
    try {
      await historyApi.download(id, format)
    } catch (error) {
      console.error('Download failed:', error)
      alert('下载失败，请重试')
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
                <button className="btn-secondary py-1 px-3 text-sm flex items-center space-x-1">
                  <EyeIcon className="w-4 h-4" />
                  <span>查看详情</span>
                </button>
                <button className="btn-secondary py-1 px-3 text-sm text-error flex items-center space-x-1">
                  <TrashIcon className="w-4 h-4" />
                  <span>删除</span>
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
    </div>
  )
}
