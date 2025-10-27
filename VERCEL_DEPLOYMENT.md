# Vercel部署指南

## 前置准备

1. **GitHub账号** - 确保代码已推送到GitHub
2. **Vercel账号** - 注册 https://vercel.com
3. **Neon数据库** - 注册 https://neon.tech (免费PostgreSQL)

---

## 步骤 1: 创建Neon数据库

1. 访问 https://console.neon.tech
2. 创建新项目 (例如: `agent-testing-db`)
3. 获取两个连接字符串：
   - **DATABASE_URL** (Pooled connection) - 用于Prisma查询
   - **DIRECT_URL** (Direct connection) - 用于Prisma迁移

示例格式：
```
DATABASE_URL="postgres://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require&pgbouncer=true"
DIRECT_URL="postgres://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
```

---

## 步骤 2: 推送到GitHub

```bash
# 初始化git（如果还没有）
git init
git add .
git commit -m "feat: refactor to React + Node.js"

# 创建GitHub仓库后
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## 步骤 3: 部署到Vercel

### 3.1 导入项目

1. 访问 https://vercel.com/dashboard
2. 点击 **"Add New Project"**
3. 从GitHub导入你的仓库
4. 选择项目根目录

### 3.2 配置项目

**Framework Preset**: Other

**Root Directory**: `./` (项目根目录)

**Build Command**:
```bash
cd client && npm install && npm run build && cd ../server && npm install && npx prisma generate
```

**Output Directory**: `client/dist`

**Install Command**:
```bash
npm install
```

### 3.3 配置环境变量

在Vercel Dashboard → Settings → Environment Variables 添加：

| Name | Value | Environment |
|------|-------|-------------|
| `DATABASE_URL` | 从Neon复制的Pooled连接 | Production |
| `DIRECT_URL` | 从Neon复制的Direct连接 | Production |
| `CORS_ORIGIN` | `https://your-app.vercel.app` | Production |
| `NODE_ENV` | `production` | Production |

### 3.4 初始化数据库

部署后，需要运行migrations和seed：

```bash
# 安装Vercel CLI
npm i -g vercel

# 登录
vercel login

# 链接项目
vercel link

# 运行数据库初始化
vercel env pull .env.production
cd server
npx prisma db push
npx prisma db seed
```

或者通过Vercel Functions运行：

访问: `https://your-app.vercel.app/api/setup` (需要在server中创建setup路由)

---

## 步骤 4: 更新API地址

部署完成后，需要更新前端API地址：

1. 获取Vercel项目URL (例如: `https://your-app.vercel.app`)
2. 在Vercel中添加环境变量：
   ```
   VITE_API_URL=https://your-app.vercel.app/api
   ```
3. 重新部署

---

## 简化部署方案（推荐）

### 方案A: 分开部署

**前端 (Vercel Static)**
- 仓库: `client/`
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VITE_API_URL=https://your-api.vercel.app`

**后端 (Vercel Serverless)**
- 仓库: `server/`
- Build Command: `npm install && npx prisma generate && npm run build`
- Environment Variables: `DATABASE_URL`, `DIRECT_URL`, `CORS_ORIGIN`

### 方案B: Monorepo部署（当前方案）

使用 `vercel.json` 配置文件统一部署前后端。

---

## 验证部署

1. 访问你的Vercel URL
2. 检查Agents页面是否能加载mock agents
3. 检查History页面
4. 测试API连接：`https://your-app.vercel.app/api/health`

---

## 常见问题

### Q: Prisma无法连接数据库
**A**: 确保在Vercel中配置了 `DATABASE_URL` 和 `DIRECT_URL`

### Q: CORS错误
**A**: 更新 `CORS_ORIGIN` 环境变量为你的Vercel前端URL

### Q: 构建失败
**A**: 检查build命令是否正确，确保 `npx prisma generate` 在build之前运行

### Q: 如何查看日志
**A**: Vercel Dashboard → Deployments → 选择部署 → Function Logs

### Q: 如何更新数据库schema
**A**: 
```bash
# 本地修改schema.prisma后
vercel env pull .env.production
cd server
npx prisma db push
# 提交代码并重新部署
```

---

## 推荐配置

### Vercel项目设置

```json
{
  "buildCommand": "cd client && npm install && npm run build && cd ../server && npm install && npx prisma generate",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": null,
  "outputDirectory": "client/dist"
}
```

### package.json scripts添加

```json
{
  "scripts": {
    "vercel-build": "cd client && npm install && npm run build && cd ../server && npm install && npx prisma generate",
    "vercel-postbuild": "cd server && npx prisma db push"
  }
}
```

---

## 下一步

部署成功后：
1. ✅ 配置自定义域名（可选）
2. ✅ 设置环境变量保护
3. ✅ 配置监控和告警
4. ✅ 优化性能（CDN、缓存等）

---

## 有用的链接

- Vercel文档: https://vercel.com/docs
- Neon文档: https://neon.tech/docs
- Prisma + Vercel: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel

