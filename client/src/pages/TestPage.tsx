import { 
  BeakerIcon, 
  FolderOpenIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

export function TestPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <BeakerIcon className="w-8 h-8 text-primary-500" />
        <h1 className="text-3xl font-bold text-text-primary">新建测试</h1>
      </div>

      {/* Agent Selection */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">选择 Agent</h2>
        <div className="space-y-2">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="搜索或选择 agent..."
              className="input-field pl-10"
            />
          </div>
          <p className="text-sm text-text-tertiary">
            选择一个 agent 开始测试。前往 Agents 页面添加新的 agent。
          </p>
        </div>
      </div>

      {/* File Upload */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">上传测试数据</h2>
        <div className="border-2 border-dashed border-primary-300 rounded-lg p-12 text-center hover:border-primary-400 hover:bg-primary-50/30 transition-all duration-200 cursor-pointer">
          <div className="space-y-3">
            <FolderOpenIcon className="w-16 h-16 text-primary-400 mx-auto" />
            <p className="text-lg font-medium text-text-primary">
              拖放 Excel 文件到这里
            </p>
            <p className="text-sm text-text-secondary">或点击浏览文件</p>
            <p className="text-xs text-text-tertiary mt-4">
              支持格式: .xlsx, .xls • 模板要求: 必须包含 'input' 列
            </p>
          </div>
        </div>
      </div>

      {/* Test Configuration */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">测试配置</h2>
        
        <div className="space-y-4">
          {/* Execution Mode */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              执行模式
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="mode" value="parallel" defaultChecked className="text-primary-400" />
                <span>并行执行</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="mode" value="sequential" className="text-primary-400" />
                <span>串行执行</span>
              </label>
            </div>
          </div>

          {/* RPM */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              速率限制 (RPM)
            </label>
            <select className="input-field">
              <option value="10">10 请求/分钟</option>
              <option value="30">30 请求/分钟</option>
              <option value="60" selected>60 请求/分钟</option>
              <option value="120">120 请求/分钟</option>
            </select>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="flex justify-center items-center space-x-4">
        <button className="btn-primary text-lg px-8 py-3 flex items-center space-x-2" disabled>
          <BeakerIcon className="w-5 h-5" />
          <span>开始测试</span>
        </button>
        <p className="text-sm text-text-tertiary">
          请先选择 agent 并上传测试文件
        </p>
      </div>
    </div>
  )
}
