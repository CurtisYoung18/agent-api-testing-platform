# 实时测试显示实现指南

## 📊 功能说明

参考旧Python/Streamlit版本的实时测试结果展示，我们为React版本实现了Server-Sent Events (SSE)流式API。

## 🔧 已完成的后端

### 1. 新建API端点：`/api/tests-stream`
- **文件**: `api/tests-stream.ts`
- **功能**: 使用SSE实时推送测试进度和结果
- **路由**: 已在`vercel.json`中配置

### 2. SSE消息类型

```typescript
// 初始化
{
  type: 'init',
  totalQuestions: 10,
  agentName: 'Agent名称'
}

// 进度更新
{
  type: 'progress',
  current: 1,
  total: 10,
  question: '当前正在测试的问题'
}

// 单个测试结果
{
  type: 'result',
  index: 0,
  result: {
    question: '问题内容',
    success: true,
    response: 'Agent回答',
    error: '',
    responseTime: 1234,
    ...
  },
  stats: {
    current: 1,
    total: 10,
    passedCount: 1,
    failedCount: 0,
    successRate: '100.00'
  }
}

// 完成
{
  type: 'complete',
  historyId: 123,
  summary: {
    totalQuestions: 10,
    passedCount: 8,
    failedCount: 2,
    successRate: '80.00',
    ...
  }
}

// 错误
{
  type: 'error',
  message: '错误信息'
}
```

## 📝 前端实现步骤

### 需要在 `TestPage.tsx` 中实现：

1. **状态管理**（已添加）：
```typescript
const [isTestingLive, setIsTestingLive] = useState(false)
const [liveResults, setLiveResults] = useState<any[]>([])
const [liveStats, setLiveStats] = useState({ current: 0, total: 0, passedCount: 0, failedCount: 0, successRate: '0.00' })
const [currentQuestion, setCurrentQuestion] = useState('')
```

2. **修改 handleStartTest 函数**：
```typescript
const handleStartTest = async () => {
  if (!selectedAgent || !uploadedFile) return

  setIsTestingLive(true)
  setLiveResults([])
  setLiveStats({ current: 0, total: 0, passedCount: 0, failedCount: 0, successRate: '0.00' })
  
  const formData = new FormData()
  formData.append('agentId', selectedAgent.id.toString())
  formData.append('executionMode', executionMode)
  formData.append('rpm', rpm.toString())
  formData.append('file', uploadedFile)

  try {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/tests/stream`, {
      method: 'POST',
      body: formData,
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.substring(6));
          
          // 处理不同类型的消息
          switch (data.type) {
            case 'init':
              setLiveStats(prev => ({ ...prev, total: data.totalQuestions }));
              break;
            case 'progress':
              setCurrentQuestion(data.question);
              break;
            case 'result':
              setLiveResults(prev => [...prev, data.result]);
              setLiveStats(data.stats);
              break;
            case 'complete':
              setTimeout(() => navigate('/history'), 1500);
              break;
            case 'error':
              setTestError(data.message);
              break;
          }
        }
      }
    }
  } catch (error: any) {
    setTestError(error.message);
  } finally {
    setIsTestingLive(false);
  }
}
```

3. **UI显示实时结果**（在Step 4中）：

```tsx
{isTestingLive && (
  <div className="space-y-6">
    {/* 进度统计 */}
    <div className="grid grid-cols-3 gap-4">
      <div className="glass-card p-4">
        <p className="text-sm text-text-secondary">测试进度</p>
        <p className="text-2xl font-bold text-text-primary">
          {liveStats.current}/{liveStats.total}
        </p>
      </div>
      <div className="glass-card p-4">
        <p className="text-sm text-text-secondary">成功数量</p>
        <p className="text-2xl font-bold text-success">{liveStats.passedCount}</p>
      </div>
      <div className="glass-card p-4">
        <p className="text-sm text-text-secondary">成功率</p>
        <p className="text-2xl font-bold text-text-primary">{liveStats.successRate}%</p>
      </div>
    </div>

    {/* 当前测试问题 */}
    {currentQuestion && (
      <div className="glass-card p-4 bg-primary-50/30">
        <p className="text-sm font-semibold text-text-primary mb-2">
          正在测试第 {liveStats.current}/{liveStats.total} 个问题:
        </p>
        <p className="text-text-secondary">{currentQuestion}</p>
      </div>
    )}

    {/* 实时结果列表 */}
    <div className="space-y-3 max-h-96 overflow-y-auto">
      <AnimatePresence>
        {liveResults.map((result, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-card p-4 ${
              result.success ? 'border-l-4 border-success' : 'border-l-4 border-error'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-text-primary mb-1">
                  {result.success ? '✅' : '❌'} 问题 {index + 1}
                </p>
                <p className="text-sm text-text-secondary line-clamp-2">
                  {result.question}
                </p>
                {result.success && (
                  <p className="text-xs text-text-tertiary mt-2 line-clamp-2">
                    {result.response}
                  </p>
                )}
                {!result.success && (
                  <p className="text-xs text-error mt-2">
                    {result.error}
                  </p>
                )}
              </div>
              <span className="text-xs text-text-tertiary">
                {result.responseTime}ms
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  </div>
)}
```

## 🎯 效果预期

1. **测试开始**：显示"正在测试第 X/Y 个问题"
2. **实时更新**：每完成一个问题，立即显示结果卡片
3. **统计实时更新**：成功数、失败数、成功率实时变化
4. **完成后**：自动跳转到历史记录页面

## ⚠️ 注意事项

1. Vercel的函数超时限制：已设置为300秒（5分钟）
2. 如果测试数量很多，考虑分批次执行
3. SSE连接在移动网络下可能不稳定，需要添加重连逻辑

## 🔍 调试

查看浏览器控制台的Network标签，找到`tests/stream`请求，可以看到实时的SSE消息流。

