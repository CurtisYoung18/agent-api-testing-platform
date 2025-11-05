# Agent API Testing Platform - UI/UX Design

## 设计理念

采用现代化玻璃拟态（Glassmorphism）设计风格，参考Apple、Google等大厂的前沿设计语言，打造简洁、优雅、高效的测试平台体验。整体风格以**柔和浅蓝色**为主调，营造轻松专业的氛围。

### 核心设计原则
- **简洁优雅**: 最小化视觉噪音，专注核心功能
- **层次清晰**: 使用玻璃拟态效果营造空间层次感
- **响应迅速**: 实时反馈，流畅动画，零等待感
- **智能引导**: 渐进式表单，智能默认值，减少用户决策负担
- **公共使用**: 无需登录，开箱即用

---

## 设计系统

### 配色方案（柔和浅蓝色系）
```
主色调：
- Primary: #7CB5EC (柔和浅蓝)
- Primary Light: #A8D0F0 (更浅的蓝)
- Primary Dark: #5A9BD5 (稍深的蓝)
- Secondary: #B4D7F1 (淡蓝灰)
- Accent: #9EC5E8 (点缀蓝)

功能色：
- Success: #81C784 (柔和绿)
- Warning: #FFB74D (柔和橙)
- Error: #E57373 (柔和红)
- Info: #64B5F6 (信息蓝)

背景：
- Background Primary: rgba(249, 252, 255, 0.85) - 浅蓝白色
- Background Secondary: rgba(236, 245, 252, 0.7) - 淡蓝灰
- Background Card: rgba(255, 255, 255, 0.9) - 卡片背景
- Backdrop: rgba(124, 181, 236, 0.03) - 蓝色背景层

文字：
- Text Primary: #2C3E50 (深蓝灰)
- Text Secondary: #5A7A95 (中蓝灰)
- Text Tertiary: #8FA9BA (浅蓝灰)
- Text Light: #B8CCD9 (极浅蓝灰)
```

### 玻璃拟态效果（柔和蓝色调）
```css
backdrop-filter: blur(20px) saturate(160%);
background: rgba(249, 252, 255, 0.85);
border: 1px solid rgba(124, 181, 236, 0.15);
box-shadow: 0 8px 32px 0 rgba(124, 181, 236, 0.12);
```

### 动画参数
- 标准过渡: 0.3s cubic-bezier(0.4, 0, 0.2, 1)
- 快速交互: 0.15s ease-out
- 页面切换: 0.4s cubic-bezier(0.16, 1, 0.3, 1)

---

## 导航结构

### 主导航（顶部导航栏）
```
┌─────────────────────────────────────────────────┐
│ [Logo] Testing Platform  [Test] [Agents] [History] │
└─────────────────────────────────────────────────┘
```

**页面列表**
1. **Test** - 测试页面（首页/默认页）
2. **Agents** - Agent管理页面
3. **History** - 测试历史记录页面

---

## 页面设计

### 1. Test Page (测试页面 - 首页)

**布局结构**
```
┌─────────────────────────────────────────────────┐
│  [Logo] Testing Platform  [Test] [Agents] [History] │
├─────────────────────────────────────────────────┤
│                                                 │
│  🧪 New Test                                    │
│                                                 │
│  Select Agent                                   │
│  ┌─────────────────────────────────────────┐  │
│  │  🔍 Search or select agent...      [▼] │  │
│  │                                          │  │
│  │  Recently Used:                         │  │
│  │  • Production SG Agent (used 2h ago)   │  │
│  │  • Test CN Agent (used today)          │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  Upload Test Data                               │
│  ┌─────────────────────────────────────────┐  │
│  │     📁 Drag & Drop Excel File           │  │
│  │        or Click to Browse               │  │
│  │                                          │  │
│  │  Supported: .xlsx, .xls                 │  │
│  │  Template: Must include 'input' column  │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  Test Configuration                             │
│  ┌─────────────────────────────────────────┐  │
│  │  Execution Mode                         │  │
│  │  ◉ Parallel   ○ Sequential             │  │
│  │                                          │  │
│  │  Rate Limit (RPM)                       │  │
│  │  [60  ▼] requests per minute           │  │
│  │                                          │  │
│  │  ▼ Advanced Options                     │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│              [Start Test →]                     │
└─────────────────────────────────────────────────┘
```

**交互细节**
- **Agent选择器**:
  - 搜索框支持模糊搜索Agent名称和区域
  - 下拉列表显示所有可用Agents（初始有6个mock agents）
  - 最近使用的Agent显示在顶部
  - 每个Agent项显示：名称、区域标签(SG/CN)、状态指示器
  - 如果没有Agent，显示提示："No agents available. Go to Agents page to add one."
  - 支持键盘导航(↑↓选择，Enter确认)
  
- **文件上传区域**:
  - 支持拖拽上传，拖拽时边框高亮(浅蓝色)
  - 上传后显示文件名、问题数量、文件大小
  - 点击预览按钮可查看问题列表
  - 可移除并重新上传
  
- **测试配置**:
  - Parallel/Sequential 大号单选按钮，带图标
  - RPM下拉选择: 10, 30, 60, 120 或自定义
  - Advanced Options 默认折叠：超时时间、重试次数
  
- **Start Test按钮**:
  - Agent和文件都选择后才可点击
  - 点击后跳转到测试执行页面

**优化点**
- 智能预填：记住上次选择的Agent和配置
- 实时验证：上传文件后立即验证格式
- 快捷操作：支持快捷键(Ctrl+Enter开始测试)

---

### 2. Agents Page (Agent管理页面)

**布局结构**
```
┌─────────────────────────────────────────────────┐
│  [Logo] Testing Platform  [Test] [Agents] [History] │
├─────────────────────────────────────────────────┤
│                                                 │
│  🤖 Agent Management                            │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │  [🔍 Search agents...]  [+ Add Agent]  │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  Agent List (6/10 agents)                      │
│  ┌─────────────────────────────────────────┐  │
│  │ ┌───────────────────────────────────┐  │  │
│  │ │ Production SG Agent    [Edit][Del]│  │  │
│  │ │ 🌏 SG • Active                    │  │  │
│  │ │ API: sk-***************4Xz7       │  │  │
│  │ │ Last used: 2 hours ago            │  │  │
│  │ └───────────────────────────────────┘  │  │
│  │                                          │  │
│  │ ┌───────────────────────────────────┐  │  │
│  │ │ Test CN Agent         [Edit][Del]│  │  │
│  │ │ 🇨🇳 CN • Active                    │  │  │
│  │ │ API: sk-***************9Ab2       │  │  │
│  │ │ Last used: Yesterday              │  │  │
│  │ └───────────────────────────────────┘  │  │
│  │                                          │  │
│  │ ... (4 more agents)                    │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘

Add/Edit Agent Modal (右侧滑入)
┌─────────────────────────────────┐
│  Add New Agent            [✕]   │
├─────────────────────────────────┤
│                                 │
│  Agent Name *                   │
│  [_________________________]    │
│                                 │
│  Region *                       │
│  ○ SG (Singapore)               │
│  ○ CN (China)                   │
│                                 │
│  API Key *                      │
│  [_________________________][👁]│
│  Format: sk-...                 │
│                                 │
│  [Test Connection]              │
│  ✓ Connection successful        │
│                                 │
│  [Cancel]        [Save Agent]   │
└─────────────────────────────────┘
```

**交互细节**
- **搜索框**: 实时过滤Agent列表，支持名称和区域搜索
- **Add Agent按钮**: 点击后从右侧滑出表单Modal
- **Agent卡片**:
  - 显示名称、区域图标、状态、API Key预览、最后使用时间
  - Edit按钮：打开编辑Modal，预填现有数据
  - Delete按钮：弹出确认对话框，确认后删除
  - 悬停时卡片轻微上浮，边框高亮(浅蓝色)
- **Add/Edit Modal**:
  - 右侧滑入动画(400ms)
  - Agent Name: 必填，最多50字符
  - Region: 单选，只保留SG和CN（移除TH）
  - API Key: 
    - 密码输入框，点击眼睛图标切换显示/隐藏
    - 实时验证格式
  - Test Connection: 
    - 点击后验证API Key有效性
    - Loading状态显示转圈动画
    - 成功显示绿色勾，失败显示红色叉和错误信息
  - Save按钮: 
    - 所有必填项填写且验证通过后才可点击
    - 保存成功后显示Toast提示"Agent saved successfully"
    - 关闭Modal并刷新列表

**Mock初始数据（6个Agents）**
```javascript
const mockAgents = [
  { id: 1, name: "Production SG Agent", region: "SG", apiKey: "sk-prod-sg-***4Xz7", status: "active", lastUsed: "2024-10-27 12:30" },
  { id: 2, name: "Test SG Agent", region: "SG", apiKey: "sk-test-sg-***9Bc3", status: "active", lastUsed: "2024-10-27 08:15" },
  { id: 3, name: "Production CN Agent", region: "CN", apiKey: "sk-prod-cn-***6Mn8", status: "active", lastUsed: "2024-10-26 16:45" },
  { id: 4, name: "Test CN Agent", region: "CN", apiKey: "sk-test-cn-***2Lp4", status: "active", lastUsed: "2024-10-26 14:20" },
  { id: 5, name: "Dev SG Agent", region: "SG", apiKey: "sk-dev-sg-***8Qr5", status: "active", lastUsed: "2024-10-25 11:00" },
  { id: 6, name: "QA CN Agent", region: "CN", apiKey: "sk-qa-cn-***3Wy9", status: "active", lastUsed: "2024-10-24 09:30" }
]
```

**优化点**
- 批量操作：可选择多个Agent批量删除
- 排序功能：按名称、区域、最后使用时间排序
- 导入导出：支持导出Agent列表配置(不包含完整API Key)
- 状态指示：显示Agent的连接状态(active/inactive)

---

### 3. History Page (测试历史页面)

**布局结构**
```
┌─────────────────────────────────────────────────┐
│  [Logo] Testing Platform  [Test] [Agents] [History] │
├─────────────────────────────────────────────────┤
│                                                 │
│  📜 Test History                                │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │  [🔍 Search...]  [Filter ▼]  [Sort ▼] │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  Test Records                                   │
│  ┌─────────────────────────────────────────┐  │
│  │ ┌───────────────────────────────────┐  │  │
│  │ │ Oct 27, 2024 14:30                │  │  │
│  │ │ Production SG Agent               │  │  │
│  │ │ ✓ 142/150 (95%) • 3m 45s         │  │  │
│  │ │ [📊 Excel] [📝 MD] [📋 JSON]    │  │  │
│  │ │ [View Details] [Delete]           │  │  │
│  │ └───────────────────────────────────┘  │  │
│  │                                          │  │
│  │ ┌───────────────────────────────────┐  │  │
│  │ │ Oct 27, 2024 08:15                │  │  │
│  │ │ Test CN Agent                     │  │  │
│  │ │ ✓ 88/100 (88%) • 2m 10s          │  │  │
│  │ │ [📊 Excel] [📝 MD] [📋 JSON]    │  │  │
│  │ │ [View Details] [Delete]           │  │  │
│  │ └───────────────────────────────────┘  │  │
│  │                                          │  │
│  │ ┌───────────────────────────────────┐  │  │
│  │ │ Oct 26, 2024 16:45                │  │  │
│  │ │ Production CN Agent               │  │  │
│  │ │ ✗ 45/100 (45%) • 5m 20s          │  │  │
│  │ │ [📊 Excel] [📝 MD] [📋 JSON]    │  │  │
│  │ │ [View Details] [Delete]           │  │  │
│  │ └───────────────────────────────────┘  │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  [Load More]                                    │
└─────────────────────────────────────────────────┘

Details Modal
┌─────────────────────────────────────┐
│  Test Details              [✕]      │
├─────────────────────────────────────┤
│                                     │
│  Test Information                   │
│  Date: Oct 27, 2024 14:30          │
│  Agent: Production SG Agent         │
│  Duration: 3m 45s                   │
│  Total Questions: 150               │
│                                     │
│  Results Summary                    │
│  ┌────────┐ ┌────────┐ ┌────────┐ │
│  │  95%   │ │  142   │ │   8    │ │
│  │Success │ │ Passed │ │ Failed │ │
│  └────────┘ └────────┘ └────────┘ │
│                                     │
│  Configuration                      │
│  Mode: Parallel                     │
│  RPM: 60                            │
│  Timeout: 30s                       │
│                                     │
│  Failed Questions (8)               │
│  ┌─────────────────────────────┐  │
│  │ Q15: 系统错误E501           │  │
│  │ Q42: 探头连接异常           │  │
│  │ ...                          │  │
│  └─────────────────────────────┘  │
│                                     │
│  [Download Excel] [Download MD]     │
│  [Rerun Test] [Delete Record]       │
└─────────────────────────────────────┘
```

**交互细节**
- **搜索框**: 搜索Agent名称、日期、问题内容
- **Filter下拉**:
  - All Results
  - Success Only (>80%)
  - Failed Tests (<80%)
  - By Agent (选择特定Agent)
  - By Date Range
- **Sort下拉**:
  - Newest First (默认)
  - Oldest First
  - Success Rate (High to Low)
  - Duration (Shortest to Longest)
- **记录卡片**:
  - 显示日期时间、Agent名称、结果统计、耗时
  - 成功率>=80%显示绿色勾，<80%显示橙色叉
  - 三个下载按钮：Excel、Markdown、JSON
  - View Details：打开详情Modal
  - Delete：删除记录（带确认）
- **下载按钮**:
  - 点击立即下载对应格式的报告文件
  - 文件名格式: `test_report_[agent]_[date].[ext]`
  - 下载进度显示(如果文件较大)
- **Details Modal**:
  - 显示完整测试信息和配置
  - Results Summary: 大号数字卡片展示
  - Failed Questions: 列表显示所有失败的问题
  - 可在Modal内直接下载报告
  - Rerun Test: 基于该记录快速创建新测试
  - Delete Record: 删除该测试记录

**数据存储（数据库设计）**
```sql
-- test_history 表
CREATE TABLE test_history (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES agents(id),
  agent_name VARCHAR(100),
  test_date TIMESTAMP DEFAULT NOW(),
  total_questions INTEGER,
  passed_count INTEGER,
  failed_count INTEGER,
  success_rate DECIMAL(5,2),
  duration_seconds INTEGER,
  execution_mode VARCHAR(20), -- parallel/sequential
  rpm INTEGER,
  timeout_seconds INTEGER,
  excel_file_path TEXT, -- 存储Excel文件的路径或blob
  markdown_file_path TEXT, -- 存储Markdown文件
  json_data JSONB, -- 完整的测试结果JSON
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引优化
CREATE INDEX idx_test_date ON test_history(test_date DESC);
CREATE INDEX idx_agent_id ON test_history(agent_id);
CREATE INDEX idx_success_rate ON test_history(success_rate);
```

**优化点**
- 分页加载：每页显示10-20条记录，支持无限滚动
- 快速筛选：常用筛选条件放在顶部快捷按钮
- 批量操作：可选择多个记录批量下载或删除
- 统计概览：顶部显示总测试次数、平均成功率等
- 空状态：无历史记录时显示精美插图和"Run your first test"引导

---

---

### 4. Test Execution Page (测试执行页面)

**布局结构**
```
┌─────────────────────────────────────────────────┐
│  [Logo] Testing Platform                [Pause] │
├─────────────────────────────────────────────────┤
│                                                 │
│  🔄 Testing in Progress...                     │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │  [████████████░░░░░░░] 65%             │  │
│  │  98/150 questions • 2m 30s remaining    │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  Real-time Statistics                           │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│  │  92%   │ │  98    │ │   8    │ │  2.8s  │ │
│  │Success │ │ Passed │ │ Failed │ │Avg Time│ │
│  └────────┘ └────────┘ └────────┘ └────────┘ │
│                                                 │
│  Live Results Feed                              │
│  ┌─────────────────────────────────────────┐  │
│  │ ✓ Q98: 设备开机异常处理          1.8s │  │
│  │   Response: 请检查电源连接...          │  │
│  │   [Expand]                              │  │
│  │                                          │  │
│  │ ✓ Q97: 探头校准标准流程          2.1s │  │
│  │   Response: 按照以下步骤...            │  │
│  │   [Expand]                              │  │
│  │                                          │  │
│  │ ✗ Q96: 系统错误代码E501解决      30.0s│  │
│  │   Error: Request timeout after 30s     │  │
│  │   [Retry] [Skip]                        │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘

Test Complete Modal
┌─────────────────────────────────────┐
│  ✨ Test Completed!         [✕]    │
├─────────────────────────────────────┤
│                                     │
│  ┌────────┐                         │
│  │  92%   │  Excellent!             │
│  │Success │  142 of 150 passed      │
│  └────────┘                         │
│                                     │
│  Test Summary                       │
│  Duration: 3m 45s                   │
│  Avg Response Time: 2.8s            │
│  Failed: 8 questions                │
│                                     │
│  [View Full Report]                 │
│  [Download Excel] [Download MD]     │
│  [Run New Test] [Close]             │
└─────────────────────────────────────┘
```

**交互细节**
- **进度条**: 
  - 浅蓝色渐变填充，流畅动画
  - 实时显示百分比、完成数量、预估剩余时间
  - 剩余时间动态计算(基于平均响应时间)
- **Pause/Resume按钮**: 
  - 点击暂停测试，按钮变为Resume
  - 暂停时保持当前状态，可随时恢复
  - 悬停显示Tooltip: "Pause (Space)"
- **Real-time Statistics**:
  - 四个大号数字卡片，实时更新
  - Success Rate: 环形进度条 + 百分比
  - 数字变化时带有计数动画(count-up effect)
  - 卡片背景带有柔和浅蓝色渐变
- **Live Results Feed**:
  - 自动滚动到最新结果
  - 成功项: 绿色勾 + 简短回复预览
  - 失败项: 红色叉 + 错误信息
  - Expand按钮: 展开查看完整回复
  - Retry按钮: 单独重试该问题
  - 列表最多显示最新20条，可滚动查看
- **Test Complete Modal**:
  - 测试完成后自动弹出
  - 显示大号成功率和评价文案
  - 提供查看完整报告和下载选项
  - Run New Test: 快速开始新测试
  - 数据自动保存到数据库

**优化点**
- WebSocket实时更新：避免轮询，降低延迟
- 断点续传：网络中断后可恢复测试
- 后台运行：切换页面时测试继续，完成后浏览器通知
- 实时图表：可选显示响应时间折线图
- 一键停止：Stop按钮终止测试并保存当前进度

---

### 5. Test Results Detail Page (测试结果详情页 - 可选)

> **注意**: 此页面可选，也可以将详情直接在History页面的Modal中展示

**布局结构**
```
┌─────────────────────────────────────────────────┐
│  ← Back to History          Test Results        │
│                              [Export ▼] [Retest]│
├─────────────────────────────────────────────────┤
│  Test Summary                                   │
│  ┌─────────────────────────────────────────┐  │
│  │  Production SG Agent • Oct 27, 14:30    │  │
│  │                                          │  │
│  │  ┌──────┐                               │  │
│  │  │ 92%  │  142/150 Passed               │  │
│  │  │Success│  8 Failed • 3m 45s           │  │
│  │  └──────┘  Avg Response: 2.8s           │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  [All (150)] [Passed (142)] [Failed (8)]       │
│                                                 │
│  Question Results                               │
│  ┌─────────────────────────────────────────┐  │
│  │ ✓ Q1: 设备无法正常开机            2.1s │  │
│  │   Response: 请按照以下步骤...          │  │
│  │   Tokens: 256 • Credits: 0.002         │  │
│  │   [View Full] [Copy]                    │  │
│  ├─────────────────────────────────────────┤  │
│  │ ✗ Q15: 系统错误代码E501            30s │  │
│  │   Error: Request timeout after 30s     │  │
│  │   [Retry]                               │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  [Load More]                                    │
└─────────────────────────────────────────────────┘
```

**交互细节**
- **Summary卡片**: 环形进度图 + 关键指标
- **Export下拉**: Excel / Markdown / JSON
- **Retest按钮**: 基于此测试创建新测试
- **标签筛选**: All / Passed / Failed，带数量
- **结果列表**: 
  - 虚拟滚动，支持大量数据
  - View Full: Modal显示完整回复
  - Copy: 复制回复内容
  - Retry: 重新测试该问题

---

### 6. Settings Page (设置页面 - 可选)

> **注意**: 此页面为可选功能，如需简化可将设置集成到其他页面

**布局结构**
```
┌─────────────────────────────────────────────────┐
│  [Logo] Testing Platform  [Test] [Agents] [History] │
├─────────────────────────────────────────────────┐
│  ⚙️ Settings                            [Save]  │
│                                                  │
│  Default Test Configuration                     │
│  ┌──────────────────────────────────────────┐ │
│  │  Execution Mode                          │ │
│  │  ◉ Parallel   ○ Sequential              │ │
│  │                                           │ │
│  │  Rate Limit (RPM)                        │ │
│  │  [60  ▼]                                 │ │
│  │                                           │ │
│  │  Timeout (seconds)                       │ │
│  │  [30  ▼]                                 │ │
│  │                                           │ │
│  │  Retry Count                             │ │
│  │  [3  ▼]                                  │ │
│  └──────────────────────────────────────────┘ │
│                                                  │
│  Data Management                                │
│  ┌──────────────────────────────────────────┐ │
│  │  Auto-delete history after               │ │
│  │  [30 ▼] days                             │ │
│  │                                           │ │
│  │  [Clear All History]                     │ │
│  └──────────────────────────────────────────┘ │
│                                                  │
│  Appearance                                     │
│  ┌──────────────────────────────────────────┐ │
│  │  Theme                                    │ │
│  │  ◉ Light   ○ Dark   ○ Auto              │ │
│  │                                           │ │
│  │  ☑ Enable animations                     │ │
│  └──────────────────────────────────────────┘ │
│                                                  │
│  About                                          │
│  Version: 2.0.0                                 │
│  Built with React + Node.js                    │
│  [Documentation] [GitHub]                       │
└─────────────────────────────────────────────────┘
```

**功能说明**
- **Default Test Configuration**: 设置测试的默认参数
- **Data Management**: 历史记录自动清理
- **Appearance**: 主题切换和动画设置
- **About**: 版本信息和文档链接

---

## 响应式设计

### 桌面端 (>1024px)
- 双栏/三栏布局
- 侧边栏常驻
- 大号卡片和数据展示

### 平板端 (768px - 1024px)
- 单栏布局，内容居中
- 侧边栏折叠为抽屉
- 适中的卡片尺寸

### 移动端 (<768px)
- 纵向单栏布局
- 底部导航栏
- 简化的信息展示
- 全屏模态框

---

## 交互动画

### 页面切换
- 淡入淡出 + 轻微位移
- 0.4s cubic-bezier(0.16, 1, 0.3, 1)

### 卡片交互
- 悬停: 上浮 + 阴影加深
- 点击: 轻微缩小再恢复

### 加载状态
- 骨架屏替代loading spinner
- 微光效果(shimmer effect)

### 数据更新
- 数字计数动画
- 进度条平滑过渡
- 列表项淡入

### 表单交互
- 输入框聚焦时边框渐变
- 错误提示抖动 + 变红
- 成功提示打勾动画

---

## 可访问性

- **键盘导航**: 所有功能可通过键盘操作
- **焦点指示**: 清晰的焦点样式
- **语义化HTML**: 正确的标签和ARIA属性
- **色彩对比**: 符合WCAG 2.1 AA标准
- **屏幕阅读器**: 完整的aria-label和alt文本

---

## 性能优化

- **代码分割**: 路由级别的懒加载
- **虚拟滚动**: 处理大量数据列表
- **图片优化**: WebP格式 + 懒加载
- **缓存策略**: Service Worker + IndexedDB
- **SSR/SSG**: 首屏快速渲染

---

## 技术实现要点

### 前端技术栈
- **React 18**: 使用Hooks和Concurrent特性
- **TypeScript**: 类型安全
- **Tailwind CSS**: 原子化CSS + 自定义柔和蓝色主题配置
- **Framer Motion**: 流畅动画
- **React Query (TanStack Query)**: 数据获取、缓存和状态管理
- **Zustand**: 轻量全局状态管理
- **React Router v6**: 客户端路由

### 后端技术栈
- **Node.js 18+**: 运行时环境
- **Express.js**: Web框架
- **PostgreSQL (Neon DB)**: 数据库(部署到Vercel时使用)
- **Prisma**: ORM，类型安全的数据库操作
- **XLSX**: Excel文件处理
- **Node-fetch**: API请求

### 组件库
- **Headless UI**: 无样式可访问组件(下拉、对话框等)
- **Radix UI**: 底层UI原语(可选)
- **React-Dropzone**: 文件上传
- **Recharts**: 数据可视化

### 开发工具
- **Vite**: 快速构建工具
- **ESLint + Prettier**: 代码规范
- **Vitest**: 单元测试
- **Playwright**: E2E测试(可选)

### 数据库设计

#### Agents表
```sql
CREATE TABLE agents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  region VARCHAR(10) NOT NULL CHECK (region IN ('SG', 'CN')),
  api_key VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 初始化6个mock agents
INSERT INTO agents (name, region, api_key, last_used) VALUES
  ('Production SG Agent', 'SG', 'sk-prod-sg-mock1234567890abcdef4Xz7', NOW() - INTERVAL '2 hours'),
  ('Test SG Agent', 'SG', 'sk-test-sg-mock1234567890abcdef9Bc3', NOW() - INTERVAL '8 hours'),
  ('Production CN Agent', 'CN', 'sk-prod-cn-mock1234567890abcdef6Mn8', NOW() - INTERVAL '1 day'),
  ('Test CN Agent', 'CN', 'sk-test-cn-mock1234567890abcdef2Lp4', NOW() - INTERVAL '1 day'),
  ('Dev SG Agent', 'SG', 'sk-dev-sg-mock1234567890abcdef8Qr5', NOW() - INTERVAL '2 days'),
  ('QA CN Agent', 'CN', 'sk-qa-cn-mock1234567890abcdef3Wy9', NOW() - INTERVAL '3 days');
```

#### Test History表
```sql
CREATE TABLE test_history (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  agent_name VARCHAR(100),
  test_date TIMESTAMP DEFAULT NOW(),
  total_questions INTEGER NOT NULL,
  passed_count INTEGER NOT NULL,
  failed_count INTEGER NOT NULL,
  success_rate DECIMAL(5,2) NOT NULL,
  duration_seconds INTEGER NOT NULL,
  avg_response_time DECIMAL(6,3),
  execution_mode VARCHAR(20) CHECK (execution_mode IN ('parallel', 'sequential')),
  rpm INTEGER,
  timeout_seconds INTEGER,
  retry_count INTEGER,
  excel_blob BYTEA, -- 或存储路径 TEXT
  markdown_blob BYTEA, -- 或存储路径 TEXT
  json_data JSONB, -- 完整测试结果
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_test_date ON test_history(test_date DESC);
CREATE INDEX idx_agent_id ON test_history(agent_id);
CREATE INDEX idx_success_rate ON test_history(success_rate);
```

### API端点设计

#### Agents API
```
GET    /api/agents          - 获取所有agents
POST   /api/agents          - 创建新agent
GET    /api/agents/:id      - 获取单个agent
PUT    /api/agents/:id      - 更新agent
DELETE /api/agents/:id      - 删除agent
POST   /api/agents/:id/test - 测试agent连接
```

#### Test API
```
POST   /api/tests           - 创建并执行测试
GET    /api/tests/:id       - 获取测试状态
GET    /api/tests/:id/progress - WebSocket/SSE实时进度
POST   /api/tests/:id/pause  - 暂停测试
POST   /api/tests/:id/resume - 恢复测试
POST   /api/tests/:id/stop   - 停止测试
```

#### History API
```
GET    /api/history         - 获取测试历史(支持分页、筛选、排序)
GET    /api/history/:id     - 获取单条历史详情
DELETE /api/history/:id     - 删除历史记录
GET    /api/history/:id/download/:format - 下载报告(excel/md/json)
```

### 部署方案

#### Vercel部署
1. **前端**: React应用部署为静态站点
2. **后端**: Node.js API部署为Serverless Functions
3. **数据库**: Neon PostgreSQL (Vercel官方推荐)
4. **文件存储**: 
   - 小文件: 直接存储在数据库BYTEA字段
   - 大文件: Vercel Blob Storage

#### 本地开发
1. **数据库**: 使用SQLite或本地PostgreSQL
2. **Mock模式**: 初始化6个mock agents，可直接测试UI
3. **API Mock**: 可选择mock API响应用于前端开发

### Tailwind配置（柔和浅蓝色主题）

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f8ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#7CB5EC', // 主色
          500: '#5A9BD5',
          600: '#4A8BC4',
          700: '#3A7BB3',
          800: '#2B6BA2',
          900: '#1C5B91',
        },
        soft: {
          blue: '#A8D0F0',
          gray: '#B4D7F1',
          accent: '#9EC5E8',
        }
      },
      backdropBlur: {
        glass: '20px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(124, 181, 236, 0.12)',
        'glass-hover': '0 12px 40px 0 rgba(124, 181, 236, 0.18)',
      }
    }
  }
}
```

