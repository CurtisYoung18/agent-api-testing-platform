export function TestPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <span className="text-3xl">🧪</span>
        <h1 className="text-3xl font-bold text-text-primary">New Test</h1>
      </div>

      {/* Agent Selection */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Select Agent</h2>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="🔍 Search or select agent..."
            className="input-field"
          />
          <p className="text-sm text-text-tertiary">
            Select an agent to start testing. Go to Agents page to add new agents.
          </p>
        </div>
      </div>

      {/* File Upload */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Upload Test Data</h2>
        <div className="border-2 border-dashed border-primary-300 rounded-lg p-12 text-center hover:border-primary-400 hover:bg-primary-50/30 transition-all duration-200 cursor-pointer">
          <div className="space-y-3">
            <div className="text-5xl">📁</div>
            <p className="text-lg font-medium text-text-primary">
              Drag & Drop Excel File
            </p>
            <p className="text-sm text-text-secondary">or Click to Browse</p>
            <p className="text-xs text-text-tertiary mt-4">
              Supported: .xlsx, .xls • Template: Must include 'input' column
            </p>
          </div>
        </div>
      </div>

      {/* Test Configuration */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Test Configuration</h2>
        
        <div className="space-y-4">
          {/* Execution Mode */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Execution Mode
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="mode" value="parallel" defaultChecked className="text-primary-400" />
                <span>Parallel</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="mode" value="sequential" className="text-primary-400" />
                <span>Sequential</span>
              </label>
            </div>
          </div>

          {/* RPM */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Rate Limit (RPM)
            </label>
            <select className="input-field">
              <option value="10">10 requests per minute</option>
              <option value="30">30 requests per minute</option>
              <option value="60" selected>60 requests per minute</option>
              <option value="120">120 requests per minute</option>
            </select>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="flex justify-center">
        <button className="btn-primary text-lg px-8 py-3" disabled>
          Start Test →
        </button>
        <p className="ml-4 text-sm text-text-tertiary flex items-center">
          Please select an agent and upload a test file
        </p>
      </div>
    </div>
  )
}

