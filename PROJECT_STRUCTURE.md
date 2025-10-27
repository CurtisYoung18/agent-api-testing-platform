# 项目结构说明

## 📁 目录结构

```
agent-api-testing-platform-1/
│
├── 📂 client/                      # 前端React应用
│   ├── src/
│   │   ├── components/            # React组件
│   │   │   └── Layout.tsx         # 布局和导航组件
│   │   ├── pages/                 # 页面组件
│   │   │   ├── TestPage.tsx       # 测试页面（首页）
│   │   │   ├── AgentsPage.tsx     # Agent管理页面
│   │   │   └── HistoryPage.tsx    # 历史记录页面
│   │   ├── lib/                   # 工具库
│   │   │   └── api.ts             # API客户端
│   │   ├── App.tsx                # 应用根组件
│   │   ├── main.tsx               # 入口文件
│   │   └── index.css              # 全局样式
│   ├── index.html                 # HTML模板
│   ├── vite.config.ts             # Vite配置
│   ├── tailwind.config.js         # Tailwind配置（柔和蓝色主题）
│   ├── tsconfig.json              # TypeScript配置
│   ├── postcss.config.js          # PostCSS配置
│   └── package.json               # 前端依赖
│
├── 📂 server/                      # 后端Node.js应用
│   ├── src/
│   │   ├── routes/                # API路由
│   │   │   ├── agents.ts          # Agent CRUD API
│   │   │   ├── tests.ts           # 测试执行API
│   │   │   └── history.ts         # 历史记录API
│   │   ├── prisma/                # Prisma相关
│   │   │   └── seed.ts            # 数据库种子文件
│   │   └── index.ts               # 服务器入口
│   ├── prisma/
│   │   └── schema.prisma          # 数据库Schema定义
│   ├── tsconfig.json              # TypeScript配置
│   ├── .env.example               # 环境变量示例
│   └── package.json               # 后端依赖
│
├── 📂 _old_python_code/           # 旧代码存档（可删除）
│   ├── app.py                     # 原Streamlit应用
│   ├── start_web_app.py           # 原启动脚本
│   ├── requirements.txt           # Python依赖
│   ├── tools/                     # 原工具模块
│   └── cli_tools/                 # 原命令行工具
│
├── 📂 data/                        # 测试数据
│   └── 测试集模板.xlsx            # Excel模板示例
│
├── 📄 package.json                 # 根package.json（项目脚本）
├── 📄 DESIGN.md                    # UI/UX设计文档 ⭐
├── 📄 README_NEW.md                # 新版README ⭐
├── 📄 QUICKSTART.md                # 快速启动指南 ⭐
├── 📄 REFACTOR_SUMMARY.md          # 重构总结
├── 📄 .gitignore                   # Git忽略配置
└── 📄 README.md                    # 原README（保留）
```

## 🎯 核心文件说明

### 前端 (client/)

#### 页面组件
- **`TestPage.tsx`** - 测试配置页面（首页）
  - Agent选择器
  - 文件上传
  - 测试参数配置
  
- **`AgentsPage.tsx`** - Agent管理页面
  - Agent列表展示
  - 增删改查功能
  - 连接测试
  
- **`HistoryPage.tsx`** - 测试历史页面
  - 历史记录列表
  - 搜索、筛选、排序
  - 报告下载（Excel/Markdown/JSON）

#### 核心组件
- **`Layout.tsx`** - 布局组件
  - 顶部导航栏
  - 页面容器
  - 玻璃拟态效果

#### 工具库
- **`api.ts`** - API客户端
  - Axios实例配置
  - TypeScript类型定义
  - API调用封装

#### 配置文件
- **`tailwind.config.js`** - Tailwind配置
  - 柔和浅蓝色主题色
  - 玻璃拟态效果
  - 动画定义

- **`vite.config.ts`** - Vite配置
  - 路径别名 (@/)
  - 代理配置
  - 构建选项

### 后端 (server/)

#### API路由
- **`agents.ts`** - Agent相关API
  ```
  GET    /api/agents          # 获取所有agents
  POST   /api/agents          # 创建agent
  PUT    /api/agents/:id      # 更新agent
  DELETE /api/agents/:id      # 删除agent
  POST   /api/agents/:id/test # 测试连接
  ```

- **`tests.ts`** - 测试相关API
  ```
  POST /api/tests        # 创建测试
  GET  /api/tests/:id    # 获取测试状态
  ```

- **`history.ts`** - 历史记录API
  ```
  GET    /api/history                        # 获取历史（分页/筛选）
  GET    /api/history/:id                    # 获取详情
  DELETE /api/history/:id                    # 删除记录
  GET    /api/history/:id/download/:format   # 下载报告
  ```

#### 数据库
- **`schema.prisma`** - Prisma Schema
  - `agents` 表定义
  - `test_history` 表定义
  - 关系和索引

- **`seed.ts`** - 种子数据
  - 6个mock agents
  - 1条mock test history

#### 配置
- **`.env.example`** - 环境变量模板
  - DATABASE_URL
  - PORT
  - CORS_ORIGIN

### 文档

- **`DESIGN.md`** ⭐ - 完整UI/UX设计文档
  - 设计理念
  - 配色方案
  - 6个页面详细设计
  - 交互细节
  - 技术实现

- **`README_NEW.md`** ⭐ - 新版项目文档
  - 功能介绍
  - 技术栈
  - 安装指南
  - API文档
  - 部署方案

- **`QUICKSTART.md`** ⭐ - 快速启动指南
  - 5步启动流程
  - 常见问题
  - 验证步骤

- **`REFACTOR_SUMMARY.md`** - 重构总结
  - 完成清单
  - 技术栈
  - 下一步建议

## 🚀 启动命令

```bash
# 根目录
npm run dev              # 同时启动前后端
npm run setup            # 安装所有依赖
npm run build            # 构建项目
npm run db:push          # 同步数据库
npm run db:seed          # 导入种子数据
npm run db:studio        # 打开Prisma Studio

# 前端（client/）
npm run dev              # 启动开发服务器 (5173)
npm run build            # 构建生产版本

# 后端（server/）
npm run dev              # 启动开发服务器 (3001)
npm run build            # 编译TypeScript
npm start                # 启动生产服务器
```

## 📊 数据流

```
用户 → React前端 (5173)
  ↓
  Axios API调用
  ↓
Node.js后端 (3001) → Prisma ORM → PostgreSQL/SQLite
  ↓
返回JSON数据
  ↓
React Query缓存 → UI更新
```

## 🎨 设计系统

### 主题色
- Primary: `#7CB5EC` (柔和浅蓝)
- Success: `#81C784` (柔和绿)
- Warning: `#FFB74D` (柔和橙)
- Error: `#E57373` (柔和红)

### 组件
- Glass Card - 玻璃拟态卡片
- Button (Primary/Secondary/Outline)
- Input Field - 带焦点效果
- Badge - 状态标签

## 🔧 开发建议

### 添加新页面
1. 在 `client/src/pages/` 创建组件
2. 在 `App.tsx` 添加路由
3. 在 `Layout.tsx` 添加导航链接

### 添加新API
1. 在 `server/src/routes/` 创建路由文件
2. 在 `server/src/index.ts` 注册路由
3. 在 `client/src/lib/api.ts` 添加API调用

### 修改数据库
1. 编辑 `server/prisma/schema.prisma`
2. 运行 `npm run db:push`
3. 更新 `seed.ts`（如需要）
4. 运行 `npm run db:seed`

## 📝 注意事项

1. **旧代码** - `_old_python_code/` 中的Python代码已被替代，可以安全删除
2. **环境变量** - 记得配置 `server/.env`
3. **API Key** - 前端显示的API Key会自动mask
4. **CORS** - 开发环境已配置，生产环境需调整
5. **数据库** - 建议开发时使用SQLite，生产使用PostgreSQL

## 🎯 下一步

1. 完善测试执行引擎
2. 实现报告生成
3. 添加实时进度更新
4. 完善UI交互
5. 准备生产部署

详见 `REFACTOR_SUMMARY.md` 的"下一步建议"部分。

