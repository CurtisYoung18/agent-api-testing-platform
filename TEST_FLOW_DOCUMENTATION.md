# 测试API与报告生成流程文档

## 📋 完整测试流程

### 1️⃣ **用户上传测试文件** (前端)
**位置**: `client/src/pages/TestPage.tsx`

```typescript
// 用户在界面上：
1. 选择一个 Agent（从数据库加载的Agent列表）
2. 上传 Excel 测试文件（使用 react-dropzone）
3. 配置测试参数：
   - 执行模式：parallel（并行）或 sequential（串行）
   - RPM（每分钟请求数）：控制速率限制
4. 点击"开始测试"按钮

// 前端使用 FormData 发送请求
const formData = new FormData()
formData.append('agentId', agent.id)
formData.append('file', uploadedFile)
formData.append('executionMode', executionMode)
formData.append('rpm', rpm)

// POST 到 /api/tests
```

---

### 2️⃣ **解析 Excel 文件** (后端)
**位置**: `api/tests.ts` - `parseExcelFile()` 函数

```typescript
// 步骤：
1. 读取上传的 Excel 文件（使用 formidable 解析 multipart/form-data）
2. 使用 XLSX 库解析 Excel 内容
3. 从第一个工作表中提取数据
4. 查找 'input'/'Input'/'INPUT' 列（大小写不敏感）
5. 将所有非空的问题提取到数组中

// 返回：
string[] // 问题数组，例如：["问题1", "问题2", "问题3"]
```

**Excel 文件格式要求**：
```
| input        | expected_output | ... |
|--------------|-----------------|-----|
| 你好          | ...            | ... |
| 今天天气怎样？ | ...            | ... |
```

---

### 3️⃣ **调用 GPTBots AI API** (后端)
**位置**: `api/tests.ts` - `callAgentAPI()` 函数

#### 📡 **GPTBots 对话 API 两步调用**

**Step 1: 创建对话 ID**
```typescript
// POST https://api-{region}.gptbots.ai/v1/conversation
{
  user_id: "test_user_1730000000000"  // 每次测试生成唯一ID
}

// 返回：
{
  conversation_id: "67xxxxxxxxxxxxx"
}
```

**Step 2: 发送消息并获取回答**
```typescript
// POST https://api-{region}.gptbots.ai/v2/conversation/message
{
  conversation_id: "67xxxxxxxxxxxxx",
  response_mode: "blocking",  // 阻塞模式，等待完整响应
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "这是测试问题"
        }
      ]
    }
  ]
}

// 返回：
{
  output: [
    {
      content: {
        text: "这是AI的回答"
      }
    }
  ],
  usage: { ... }  // Token 使用情况
}
```

#### 🌍 **支持的区域 (Region)**
- **SG**: `https://api-sg.gptbots.ai` (新加坡节点)
- **CN**: `https://api-cn.gptbots.ai` (中国节点)

#### ⚙️ **返回结果结构**
```typescript
{
  success: boolean,        // 是否成功
  response?: string,       // AI的回答文本
  error?: string,          // 错误信息（如果失败）
  responseTime: number     // 响应时间（毫秒）
}
```

---

### 4️⃣ **执行测试** (后端)
**位置**: `api/tests.ts` - `executeTests()` 函数

#### 🔄 **两种执行模式**

**A. 并行模式 (parallel)**
```typescript
// 依次处理每个问题，但保持速率限制
for (let i = 0; i < questions.length; i++) {
  const result = await callAgentAPI(apiKey, region, questions[i])
  results.push(result)
  
  // 速率限制：根据 RPM 计算延迟
  if (i < questions.length - 1) {
    await delay(60000 / rpm)  // 毫秒
  }
}
```

**B. 串行模式 (sequential)**
```typescript
// 严格按顺序处理，每次调用后都延迟
for (const question of questions) {
  const result = await callAgentAPI(apiKey, region, question)
  results.push(result)
  
  await delay(60000 / rpm)
}
```

#### 📊 **计算统计数据**
```typescript
{
  results: Array<结果对象>,
  totalQuestions: number,      // 总问题数
  passedCount: number,         // 成功数（success: true）
  failedCount: number,         // 失败数（success: false）
  successRate: number,         // 成功率（百分比）
  durationSeconds: number,     // 总执行时长（秒）
  avgResponseTime: number      // 平均响应时间（毫秒）
}
```

---

### 5️⃣ **生成测试报告** (后端)

#### 📄 **A. Excel 报告**
**位置**: `api/tests.ts` - `generateExcelReport()` 函数

```typescript
// 工作表1: 测试摘要
[
  ['测试摘要', ''],
  ['Agent名称', 'mzy'],
  ['测试时间', '2025/11/5 下午2:30:00'],
  ['总问题数', 10],
  ['通过数', 8],
  ['失败数', 2],
  ['成功率', '80.00%'],
  ['执行时长', '45秒'],
  ['平均响应时间', '1234ms'],
  ['执行模式', '串行'],
  ['RPM', 60]
]

// 工作表2: 测试结果
[
  ['序号', '问题', '状态', '响应', '错误信息', '响应时间(ms)'],
  [1, '你好', '通过', '你好！有什么可以帮助你的吗？', '', 1200],
  [2, '今天天气', '失败', '', 'API调用失败: 401', 800],
  ...
]
```

#### 📝 **B. Markdown 报告**
**位置**: `api/tests.ts` - `generateMarkdownReport()` 函数

```markdown
# 测试报告

## 测试摘要

- **Agent名称**: mzy
- **测试时间**: 2025/11/5 下午2:30:00
- **总问题数**: 10
- **通过数**: 8
- **失败数**: 2
- **成功率**: 80.00%
- **执行时长**: 45秒
- **平均响应时间**: 1234ms
- **执行模式**: 串行
- **RPM**: 60

## 测试结果

| 序号 | 问题 | 状态 | 响应时间(ms) |
|------|------|------|-------------|
| 1 | 你好 | ✅ 通过 | 1200 |
| 2 | 今天天气 | ❌ 失败 | 800 |
...
```

#### 🔢 **C. JSON 数据**
```json
{
  "status": "completed",
  "results": [
    {
      "question": "你好",
      "success": true,
      "response": "你好！有什么可以帮助你的吗？",
      "responseTime": 1200
    },
    {
      "question": "今天天气",
      "success": false,
      "error": "API调用失败: 401",
      "responseTime": 800
    }
  ]
}
```

---

### 6️⃣ **保存到数据库** (后端)
**位置**: `api/tests.ts` - Prisma `testHistory.create()`

```typescript
// 保存到 test_history 表
await prismaClient.testHistory.create({
  data: {
    agentId: 10,
    agentName: 'mzy',
    totalQuestions: 10,
    passedCount: 8,
    failedCount: 2,
    successRate: 80.0,
    durationSeconds: 45,
    avgResponseTime: 1234,
    executionMode: 'sequential',
    rpm: 60,
    excelBlob: Buffer,          // Excel 文件的二进制数据
    markdownBlob: Buffer,       // Markdown 文件的二进制数据
    jsonData: {                 // JSON 格式存储详细结果
      status: 'completed',
      results: [...]
    }
  }
})

// 同时更新 Agent 的最后使用时间
await prismaClient.agent.update({
  where: { id: 10 },
  data: { lastUsed: new Date() }
})
```

---

### 7️⃣ **返回测试摘要** (后端 → 前端)

```json
{
  "id": 123,
  "message": "测试执行完成",
  "summary": {
    "totalQuestions": 10,
    "passedCount": 8,
    "failedCount": 2,
    "successRate": "80.00",
    "durationSeconds": 45
  }
}
```

前端收到响应后自动跳转到 `/history` 页面。

---

### 8️⃣ **查看历史记录** (前端)
**位置**: `client/src/pages/HistoryPage.tsx`

```typescript
// 功能：
1. 展示所有测试记录列表（分页）
2. 点击"查看详情"：
   - 显示完整的测试摘要
   - 显示问题和AI回答的对照表
   - 不显示状态和响应时间（已更新）
3. 下载报告：
   - Excel 格式
   - Markdown 格式
   - JSON 格式
4. 删除记录（带确认模态框）
```

---

### 9️⃣ **下载报告文件** (后端)
**位置**: `api/download.ts`

```typescript
// GET /api/download?id={testId}&format={excel|markdown|json}

// 从数据库读取 BYTEA/JSON 字段
const record = await prisma.testHistory.findUnique({
  where: { id },
  select: {
    excelBlob: true,      // Buffer
    markdownBlob: true,   // Buffer
    jsonData: true        // JSON
  }
})

// 设置正确的 Content-Type 和 Content-Disposition
res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
res.setHeader('Content-Disposition', `attachment; filename="test_report_${id}.xlsx"`)
res.send(record.excelBlob)
```

---

## 🔑 关键技术点

### 速率限制 (Rate Limiting)
```typescript
const delayBetweenRequests = (60 * 1000) / rpm

// 示例：
// RPM = 60 → delay = 1000ms (每秒1次)
// RPM = 120 → delay = 500ms (每秒2次)
// RPM = 30 → delay = 2000ms (每30秒1次)
```

### 错误处理
```typescript
// API 调用可能失败的原因：
1. API Key 无效 (401)
2. 对话创建失败 (400/500)
3. 消息发送失败 (400/500)
4. 网络超时
5. API 返回空响应

// 每个失败的请求都会记录：
{
  success: false,
  error: "具体错误信息",
  responseTime: 实际耗时
}
```

### 数据库字段类型
```sql
-- test_history 表
excelBlob      BYTEA        -- 存储 Excel 二进制文件
markdownBlob   BYTEA        -- 存储 Markdown 文本
jsonData       JSONB        -- 存储 JSON 格式的详细结果
successRate    DECIMAL(5,2) -- 百分比，如 80.00
avgResponseTime INT         -- 毫秒
```

---

## 🎯 完整数据流

```
用户上传文件
    ↓
前端 FormData (agentId, file, executionMode, rpm)
    ↓
POST /api/tests
    ↓
parseExcelFile() → 提取问题数组
    ↓
executeTests()
    ↓
    ├─→ callAgentAPI() (问题1)
    │   ├─→ 创建 conversation_id
    │   └─→ 发送消息 & 获取回答
    │
    ├─→ callAgentAPI() (问题2)
    ├─→ callAgentAPI() (问题3)
    └─→ ... (所有问题)
    ↓
计算统计数据 (成功率、平均响应时间等)
    ↓
generateExcelReport() → Excel Buffer
generateMarkdownReport() → Markdown String
    ↓
保存到数据库 (test_history 表)
    ↓
返回测试摘要给前端
    ↓
前端跳转到 /history 页面
    ↓
用户查看详情 & 下载报告
```

---

## 📝 测试示例

### 输入 Excel (测试集模板.xlsx)
```
| input                    |
|--------------------------|
| 你好                     |
| 今天天气怎么样？         |
| 帮我推荐一部电影          |
```

### Agent 配置
```json
{
  "name": "mzy",
  "region": "SG",
  "apiKey": "app-uwMHXO95dlUZeUKkM7C8VtTW"
}
```

### 测试配置
```json
{
  "executionMode": "sequential",
  "rpm": 60
}
```

### 最终输出
- ✅ 测试记录保存在数据库
- ✅ Excel 报告可下载
- ✅ Markdown 报告可下载
- ✅ JSON 数据可下载
- ✅ 历史详情页显示问题和AI回答

---

## 🚀 部署环境

### Vercel 配置
```json
// vercel.json
{
  "rewrites": [
    { "source": "/api/tests", "destination": "/api/tests" }
  ],
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 60  // 防止长时间测试超时
    }
  }
}
```

### 环境变量
```bash
DATABASE_URL=postgresql://...       # Neon PostgreSQL
DIRECT_URL=postgresql://...         # Neon Direct URL (for migrations)
```

---

## ✅ 总结

当前实现已经完成：
1. ✅ 真实 GPTBots API 集成（两步调用）
2. ✅ Excel 文件解析
3. ✅ 并行/串行执行模式
4. ✅ RPM 速率限制
5. ✅ 三种格式报告生成（Excel、Markdown、JSON）
6. ✅ 数据库存储（包括二进制文件）
7. ✅ 历史记录查看（显示问题和回答）
8. ✅ 报告下载功能
9. ✅ 平滑的 UI 动画
10. ✅ 完整的错误处理

**唯一注意事项**：
- 确保 Agent 的 API Key 有效
- 确保 Excel 文件有 `input` 列
- 测试过程中前端会显示加载动画
- 长时间测试（大量问题）可能需要等待

🎉 **系统已完全可用！**

