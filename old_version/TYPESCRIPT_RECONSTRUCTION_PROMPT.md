# Agent API 测试平台 - TypeScript 重构指南

## 项目概述

这是一个用于测试 GPTBots Agent API 的完整测试平台，支持批量问题测试、实时进度监控、多格式结果导出。请使用 **TypeScript + React** 重构此项目，并优化 UI/UX 体验。

## 核心功能要求

### 1. GPTBots API 集成

#### API 端点配置
- 支持2个区域端点：
  - `cn`: `https://api.gptbots.cn` (中国)
  - `sg`: `https://api-sg.gptbots.ai` (新加坡)

#### API 认证
- 使用 Bearer Token 认证
- 请求头格式：
```typescript
{
  "Authorization": "Bearer {api_key}",
  "Content-Type": "application/json"
}
```

#### API 调用流程（核心逻辑）
每个问题的测试需要两步：

**步骤1：创建对话**
- 端点：`POST {base_url}/v1/conversation`
- 请求体：
```json
{
  "user_id": "test_user_001"
}
```
- 响应：获取 `conversation_id`

**步骤2：发送消息（V2 API）**
- 端点：`POST {base_url}/v2/conversation/message`
- 请求体：
```json
{
  "conversation_id": "{conversation_id}",
  "response_mode": "blocking",
  "messages": [
    {
      "role": "user",
      "content": "{question}"
    }
  ]
}
```
- 响应结构：
```json
{
  "message_id": "msg_xxx",
  "conversation_id": "conv_xxx",
  "output": [
    {
      "content": {
        "text": "Agent的回复内容"
      }
    }
  ],
  "usage": {
    "tokens": {
      "total_tokens": 150,
      "prompt_tokens": 100,
      "completion_tokens": 50
    },
    "credits": {
      "total_credits": 0.015
    }
  }
}
```

#### 错误处理
- 请求超时：60秒
- 需捕获并记录所有失败情况（网络错误、API错误、超时等）
- 失败结果需包含错误详情用于后续分析

### 2. 配置管理

#### 环境变量配置
使用 `.env` 文件管理敏感信息：
```env
# API Keys for different endpoints
API_KEY_CN=your_cn_api_key
API_KEY_SG=your_sg_api_key
API_KEY_TH=your_th_api_key

# API Names (用于UI显示)
API_NAME_CN=中国节点
API_NAME_SG=新加坡节点
API_NAME_TH=泰国节点

# Default settings
DEFAULT_ENDPOINT=cn
DEFAULT_USER_ID=test_user_001
REQUEST_TIMEOUT=60
```

#### 配置功能要求
- 支持自动根据 endpoint 选择对应的 API Key
- 支持手动输入 API Key（覆盖默认配置）
- 在 UI 中显示当前使用的 API Key 预览（前15位+后4位）
- 显示当前 API 地址和 API Name

### 3. Excel 文件处理

#### 输入文件格式
- 支持 `.xlsx` 和 `.xls` 格式
- **必需列**：`input` - 包含测试问题
- **可选列**：`reference_output` - 包含参考答案（用于对比）

示例表格：
| input | reference_output |
|-------|------------------|
| 设备无法正常开机 | 请检查电源连接... |
| 探头安装方法 | 按照说明书步骤... |

#### Excel 读取要求
- 上传前验证文件格式
- 检查必需列是否存在
- 过滤空行和无效数据
- 显示问题数量和预览
- 支持显示参考答案（如果存在）

#### Excel 输出格式
生成包含两个工作表的 Excel 文件：

**工作表1：测试结果**
| 序号 | 问题 | Agent回复 | 参考答案 | 测试状态 | 错误信息 | 测试时间 | 对话ID | 消息ID |
|------|------|----------|----------|----------|----------|----------|--------|--------|

**工作表2：统计汇总**
| 统计项 | 值 |
|--------|-----|
| 总测试数量 | 100 |
| 成功数量 | 95 |
| 失败数量 | 5 |
| 成功率(%) | 95.0% |
| 总Token消耗 | 15,000 |
| 总成本 | 1.5000 |

**格式化要求**：
- 成功行：浅绿色背景 (#E8F5E8)
- 失败行：浅红色背景 (#FFEBEE)
- 标题行：绿色背景 (#4CAF50)，白色文字
- 自动调整列宽

### 4. 测试执行流程

#### 批量测试逻辑
```typescript
for each question in questions:
  1. 创建新对话 (create_conversation)
  2. 发送消息 (send_message)
  3. 记录结果（成功/失败）
  4. 更新进度条
  5. 实时显示当前测试结果
  6. 等待指定间隔时间（如果设置）
  7. 继续下一个问题
```

#### 测试参数
- **用户ID**：用于标识测试用户（默认：test_user_001）
- **最大测试数量**：限制测试问题数（默认：100，最大：10000）
- **问题间隔**：每个问题完成后的等待时间（默认：0秒，范围：0-30秒）

#### 实时进度显示
测试过程中需要实时显示：
- 进度条（当前/总数）
- 当前测试的问题预览
- 实时统计：
  - 测试进度 (X/Y)
  - 成功数量
  - 当前成功率 (%)
- 当前问题的 Agent 回答（展开/折叠）
- Token 使用情况
- 历史测试结果概览（可展开查看详情）

### 5. 结果展示与分析

#### 测试完成后的展示
**统计概览**（4个指标卡片）：
- 总测试数
- 成功数（含成功率百分比）
- 失败数
- 测试状态（良好✅ / 一般⚠️ / 差❌）
  - 成功率 ≥80%：良好
  - 成功率 ≥50%：一般
  - 成功率 <50%：差

**三个Tab页**：

1. **详细结果**
   - 每个问题的完整信息（可展开）
   - 显示：问题、Agent回复、参考答案（如果有）
   - Token使用统计和成本信息

2. **失败分析**
   - 列出所有失败的测试
   - 显示错误信息和错误详情
   - 如果全部成功，显示庆祝消息

3. **统计图表**
   - 成功/失败饼图（使用图表库，如 Recharts）
   - 颜色：成功=#4CAF50，失败=#F44336

### 6. 多格式导出功能

#### 导出格式1：Excel
- 包含详细测试数据和统计汇总
- 支持数据分析和进一步处理
- 格式化（颜色标记、自动列宽）

#### 导出格式2：Markdown（推荐）
生成结构化的 Markdown 报告：

```markdown
# 📊 Agent API 测试结果报告

**报告生成时间**: 2024-01-01 12:00:00
**总测试数量**: 100
**成功数量**: 95
**成功率**: 95.0%

## 📈 统计汇总
| 统计项 | 数值 |
|--------|------|
| 🎯 总测试数量 | 100 |
| ✅ 成功数量 | 95 |
| ❌ 失败数量 | 5 |
| 📊 成功率 | 95.0% |
| 🔧 总Token消耗 | 15,000 |
| 💰 总成本 | 1.5000 |

## 📋 详细测试结果

### ✅ 问题 1: 成功
**问题**: 设备无法正常开机
**测试时间**: 2024-01-01 12:00:00
**📋 参考答案**: 请检查电源连接...
**🤖 Agent回复**:
[Agent的详细回复内容]

---
```

**Markdown 特殊功能**：
- 自动识别文本中的图片链接并转换为 Markdown 图片格式
- 支持 HTML `<img>` 标签转换
- 支持纯图片 URL 转换（jpg, jpeg, png, gif, webp, svg）
- 包含失败分析和错误分类统计

#### 导出格式3：JSON
- 原始测试结果数据
- 便于程序处理和二次开发
- 包含完整的 API 响应信息

### 7. UI/UX 设计要求

#### 整体风格
- 现代化、简洁的设计
- 响应式布局（支持桌面和平板）
- 使用现代 UI 框架（推荐：Ant Design / Material-UI / Shadcn UI）



#### 关键交互
- 文件拖拽上传支持
- 实时进度动画
- 平滑的展开/折叠动画
- 加载状态指示
- 错误提示（Toast/Notification）
- 确认对话框（开始测试前）

#### 侧边栏配置区
- 固定在左侧或顶部
- 包含所有配置选项
- 实时显示当前配置状态
- 配置变更即时生效（无需刷新）

#### 主内容区
- 文件上传区（带预览）
- 测试控制按钮（大而明显）
- 实时进度显示区
- 结果展示区（Tab切换）
- 导出按钮区（三个按钮并排）

### 8. 技术栈建议

#### 前端框架
- **React 18+** with TypeScript
- **Vite** 作为构建工具
- **React Router** 用于路由（如果需要多页面）

#### UI 组件库
选择其一：
- Ant Design (antd)
- Material-UI (MUI)
- Shadcn UI + Tailwind CSS

#### 状态管理
- React Context API（简单场景）
- Zustand / Jotai（中等复杂度）
- Redux Toolkit（复杂场景）

#### 数据处理
- **SheetJS (xlsx)** - Excel 文件读写
- **Axios** - HTTP 请求
- **date-fns** - 日期格式化

#### 图表库
- Recharts
- Chart.js
- Apache ECharts

#### 文件处理
- **file-saver** - 文件下载
- **react-dropzone** - 拖拽上传

### 9. 项目结构建议

```
src/
├── components/
│   ├── ConfigPanel/          # 配置面板
│   ├── FileUpload/           # 文件上传组件
│   ├── TestControl/          # 测试控制组件
│   ├── ProgressDisplay/      # 进度显示组件
│   ├── ResultsDisplay/       # 结果展示组件
│   └── ExportButtons/        # 导出按钮组件
├── services/
│   ├── api/
│   │   ├── client.ts         # API 客户端
│   │   └── types.ts          # API 类型定义
│   ├── excel/
│   │   ├── reader.ts         # Excel 读取
│   │   ├── writer.ts         # Excel 写入
│   │   └── markdown.ts       # Markdown 生成
│   └── config.ts             # 配置管理
├── hooks/
│   ├── useTestRunner.ts      # 测试执行 Hook
│   └── useConfig.ts          # 配置管理 Hook
├── types/
│   ├── api.ts                # API 类型
│   ├── test.ts               # 测试相关类型
│   └── config.ts             # 配置类型
├── utils/
│   ├── formatters.ts         # 格式化工具
│   └── validators.ts         # 验证工具
└── App.tsx                   # 主应用组件
```

### 10. 关键类型定义

```typescript
// API 响应类型
interface APIResponse {
  message_id: string;
  conversation_id: string;
  output: Array<{
    content: {
      text: string;
    };
  }>;
  usage: {
    tokens: {
      total_tokens: number;
      prompt_tokens: number;
      completion_tokens: number;
    };
    credits: {
      total_credits: number;
    };
  };
}

// 测试结果类型
interface TestResult {
  success: boolean;
  question: string;
  data?: APIResponse;
  error?: string;
  error_detail?: any;
  conversation_id?: string;
  timestamp: string;
  reference_output?: string;
}

// 配置类型
interface Config {
  endpoint: 'cn' | 'sg' | 'th';
  apiKey: string | null;
  userId: string;
  maxQuestions: number;
  delaySeconds: number;
  useAutoKey: boolean;
}
```

### 11. 重要实现细节

#### 图片处理（Markdown导出）
在生成 Markdown 时，需要自动处理 Agent 回复中的图片：
1. 将 HTML `<img>` 标签转换为 Markdown 格式：`![图片](url)`
2. 将纯图片 URL 转换为 Markdown 格式
3. 避免重复转换已有的 Markdown 图片格式
4. 支持的图片格式：jpg, jpeg, png, gif, webp, svg

#### 错误分类（失败分析）
自动将错误分类：
- **超时错误**：error 中包含 "timeout"
- **连接错误**：error 中包含 "connection"
- **服务器错误**：error 中包含 "500"
- **客户端错误**：error 中包含 "40x"
- **其他错误**：其他情况

#### 性能优化
- 大量问题测试时使用虚拟滚动
- 实时结果更新使用防抖
- 大文件导出使用 Web Worker
- API 请求失败自动重试（可选）

### 12. 安全考虑

- API Key 不应明文存储在代码中
- 使用环境变量管理敏感信息
- `.env` 文件加入 `.gitignore`
- 提供 `.env.example` 模板文件
- API Key 在 UI 中仅显示部分内容

### 13. 用户体验细节

#### 文件上传
- 支持点击上传和拖拽上传
- 显示文件名和大小
- 上传前验证文件格式
- 显示问题数量和预览（可滚动容器）

#### 测试执行
- 开始前显示确认对话框
- 测试中禁用配置修改
- 支持中断测试（可选）
- 测试完成后播放提示音（可选）

#### 结果查看
- 支持搜索和过滤
- 支持排序（按状态、时间等）
- 长文本自动折叠，点击展开
- 复制单个结果到剪贴板

#### 导出功能
- 显示导出格式说明
- 文件名包含时间戳
- 导出成功后显示提示
- 支持批量导出所有格式

### 14. 额外功能建议（可选）

- 测试历史记录（LocalStorage）
- 测试结果对比功能
- 自定义导出模板
- 测试报告分享链接
- 深色模式支持
- 多语言支持（中英文）
- 测试计划保存和加载
- API 响应时间统计
- 实时日志查看器

## 总结

这个项目的核心是：
1. **与 GPTBots API 的正确集成**（两步调用流程）
2. **Excel 文件的读取和写入**（包含格式化）
3. **批量测试的流程控制**（进度、间隔、错误处理）
4. **实时 UI 更新**（进度、结果、统计）
5. **多格式导出**（Excel、Markdown、JSON）
6. **优秀的用户体验**（现代化 UI、流畅交互）

请确保所有核心功能都能完整实现，特别是 API 调用流程、Excel 处理和实时进度显示。UI 应该现代、直观、响应迅速。

