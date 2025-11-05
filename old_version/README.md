# Agent API Testing Platform v2.0

现代化的AI Agent API测试与评估平台，采用React + Node.js构建，具有优雅的玻璃拟态UI设计和强大的测试功能。

## ✨ 特性

- 🎨 **现代UI设计** - 柔和浅蓝色玻璃拟态风格
- 🤖 **Agent管理** - 轻松管理多个API Agent配置
- 📊 **批量测试** - 支持Excel文件批量导入测试问题
- 📈 **测试历史** - 完整的测试记录和多格式报告下载
- ⚡ **并行执行** - 支持并行/串行两种测试模式
- 🔒 **类型安全** - TypeScript全栈开发
- 💾 **数据持久化** - PostgreSQL数据库存储

## 🏗️ 技术栈

### 前端
- **React 18** + **TypeScript**
- **Tailwind CSS** - 样式方案
- **React Query** - 数据获取和缓存
- **React Router** - 路由管理
- **Framer Motion** - 动画效果
- **Vite** - 构建工具

### 后端
- **Node.js** + **Express**
- **Prisma** - ORM
- **PostgreSQL** - 数据库
- **TypeScript** - 类型安全

## 🚀 快速开始

### 前置要求

- Node.js 18+
- PostgreSQL (或使用SQLite本地开发)
- npm 或 yarn

### 安装步骤

1. **克隆仓库**
```bash
git clone <repository-url>
cd agent-api-testing-platform-1
```

2. **安装所有依赖**
```bash
npm run setup
```

3. **配置环境变量**

在 `server` 目录下创建 `.env` 文件：
```bash
cd server
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接：
```env
# PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/agent_testing"

# 或使用SQLite本地开发
# DATABASE_URL="file:./dev.db"

PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

4. **初始化数据库**
```bash
# 推送schema到数据库
npm run db:push

# 种子数据（创建6个mock agents）
npm run db:seed
```

5. **启动开发服务器**

在项目根目录运行：
```bash
npm run dev
```

这将同时启动：
- 前端开发服务器: http://localhost:5173
- 后端API服务器: http://localhost:3001

## 📁 项目结构

```
agent-api-testing-platform-1/
├── client/                 # 前端React应用
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── pages/         # 页面组件
│   │   ├── lib/           # 工具库和API客户端
│   │   ├── App.tsx        # 应用根组件
│   │   └── main.tsx       # 入口文件
│   ├── public/
│   ├── index.html
│   └── package.json
│
├── server/                 # 后端Node.js应用
│   ├── src/
│   │   ├── routes/        # API路由
│   │   ├── prisma/        # Prisma相关文件
│   │   └── index.ts       # 服务器入口
│   ├── prisma/
│   │   └── schema.prisma  # 数据库Schema
│   └── package.json
│
├── DESIGN.md              # UI/UX设计文档
├── package.json           # 根package.json
└── README.md
```

## 🎯 使用指南

### 1. Agent管理

访问 `/agents` 页面：
- 查看所有配置的Agents
- 添加新的Agent（名称、区域SG/CN、API Key）
- 编辑或删除现有Agents
- 测试Agent连接

### 2. 创建测试

访问 `/test` 页面：
1. 从下拉框选择一个Agent
2. 上传Excel测试文件（必须包含`input`列）
3. 配置测试参数（并行/串行、RPM限制等）
4. 点击"Start Test"开始测试

### 3. 查看历史

访问 `/history` 页面：
- 查看所有历史测试记录
- 筛选和排序测试结果
- 下载测试报告（Excel、Markdown、JSON）
- 查看详细测试结果
- 删除历史记录

## 🗄️ 数据库

### Schema

项目包含两个主要数据表：

1. **agents** - 存储Agent配置
   - id, name, region, apiKey, status, lastUsed

2. **test_history** - 存储测试历史
   - id, agentId, testDate, totalQuestions, passedCount, failedCount
   - successRate, durationSeconds, avgResponseTime
   - excelBlob, markdownBlob, jsonData

### 管理数据库

```bash
# 查看数据库（Prisma Studio）
npm run db:studio

# 重置数据库并重新种子
npm run db:push && npm run db:seed
```

## 📊 API端点

### Agents
- `GET /api/agents` - 获取所有agents
- `POST /api/agents` - 创建agent
- `GET /api/agents/:id` - 获取单个agent
- `PUT /api/agents/:id` - 更新agent
- `DELETE /api/agents/:id` - 删除agent
- `POST /api/agents/:id/test` - 测试agent连接

### Tests
- `POST /api/tests` - 创建测试
- `GET /api/tests/:id` - 获取测试状态

### History
- `GET /api/history` - 获取测试历史（支持分页、筛选、排序）
- `GET /api/history/:id` - 获取单条历史详情
- `DELETE /api/history/:id` - 删除历史记录
- `GET /api/history/:id/download/:format` - 下载报告

## 🛠️ 开发命令

```bash
# 根目录
npm run dev              # 同时启动前后端开发服务器
npm run setup            # 安装所有依赖
npm run build            # 构建前后端项目

# 前端（client目录）
cd client
npm run dev              # 启动前端开发服务器
npm run build            # 构建生产版本
npm run preview          # 预览构建结果

# 后端（server目录）
cd server
npm run dev              # 启动后端开发服务器
npm run build            # 编译TypeScript
npm start                # 启动生产服务器
npm run db:push          # 同步数据库schema
npm run db:studio        # 打开Prisma Studio
npm run db:seed          # 种子数据
```

## 🌐 部署

### Vercel部署（推荐）

1. **前端部署**
   - 将 `client` 目录部署为静态站点
   - 构建命令: `npm run build`
   - 输出目录: `dist`

2. **后端部署**
   - 将 `server` 目录部署为Serverless Functions
   - 使用Neon PostgreSQL作为数据库

3. **环境变量配置**
   - 在Vercel中配置所有必要的环境变量
   - 更新CORS_ORIGIN为前端URL

## 📝 Excel模板格式

测试Excel文件必须包含以下列：
- **input** (必填) - 测试问题
- **reference_output** (可选) - 期望输出

示例：
| input | reference_output |
|-------|------------------|
| 设备无法开机 | 请检查电源连接... |
| 探头安装方法 | 按照说明书步骤... |

## 🎨 UI设计

- **主色调**: 柔和浅蓝色 (#7CB5EC)
- **设计风格**: 玻璃拟态（Glassmorphism）
- **参考**: Apple、Google等大厂前沿设计
- 详见 `DESIGN.md` 文档

## 🔧 故障排除

### 数据库连接问题
- 检查 `server/.env` 中的 `DATABASE_URL` 是否正确
- 确保PostgreSQL服务正在运行
- 尝试使用SQLite进行本地开发

### 前端无法连接后端
- 确保后端服务器运行在 http://localhost:3001
- 检查CORS配置
- 查看浏览器控制台错误

### 依赖安装失败
```bash
# 清除缓存并重新安装
rm -rf node_modules client/node_modules server/node_modules
rm package-lock.json client/package-lock.json server/package-lock.json
npm run setup
```

## 📄 License

MIT

## 🤝 贡献

欢迎提交Issue和Pull Request！

