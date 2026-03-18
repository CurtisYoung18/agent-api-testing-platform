# GPTBOTs - Agent API 测试平台

## 本地部署

### 前置要求

- Node.js 18+
- npm

### 安装与启动

> 一键部署
```bash
git clone https://github.com/CurtisYoung18/agent-api-testing-platform
cd agent-api-testing-platform
npm run setup
npm run dev
```


> 后端 API：http://localhost:3001
> 前端界面：http://localhost:5173

### 本地数据

本地运行时无需配置数据库，数据保存在项目根目录：

- `local-data.json`：Agent 配置
- `history-data.json`：测试历史记录（重启后保留）