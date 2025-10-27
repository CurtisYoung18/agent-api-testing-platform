# 🔧 配置Neon数据库并初始化

项目已成功部署到Vercel，但需要配置数据库才能正常使用。

## 步骤 1: 创建Neon数据库

1. 访问 https://console.neon.tech
2. 注册/登录账号
3. 点击 **"Create a project"**
4. 项目名称: `agent-testing-db`
5. 选择区域（推荐: AWS US East）
6. 点击 **"Create project"**

## 步骤 2: 获取连接字符串

创建完成后，你会看到连接信息：

### Pooled Connection (DATABASE_URL)
```
postgres://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
```

### Direct Connection (DIRECT_URL)  
```
postgres://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

## 步骤 3: 在Vercel配置环境变量

1. 前往你的Vercel项目 Dashboard
2. 点击 **Settings** → **Environment Variables**
3. 添加以下变量：

| Name | Value | Environment |
|------|-------|-------------|
| `DATABASE_URL` | 粘贴Pooled Connection | Production, Preview, Development |
| `DIRECT_URL` | 粘贴Direct Connection | Production, Preview, Development |

4. 点击 **Save**

## 步骤 4: 重新部署

1. 前往 **Deployments** 页面
2. 点击最新的部署
3. 点击右上角 **"Redeploy"** 按钮
4. 等待部署完成

## 步骤 5: 初始化数据库

### 方法A: 使用Vercel CLI（推荐）

```bash
# 1. 安装Vercel CLI
npm i -g vercel

# 2. 登录Vercel
vercel login

# 3. 链接项目
cd /Users/curtis/Desktop/agent-api-testing-platform-1
vercel link

# 4. 拉取环境变量
vercel env pull .env.production

# 5. 初始化数据库
cd server
npx prisma db push
npx tsx src/prisma/seed.ts
```

### 方法B: 手动在Neon执行SQL

如果CLI不可用，可以在Neon Console的SQL Editor中执行：

1. 访问Neon Console → SQL Editor
2. 复制 `server/prisma/schema.prisma` 中的表结构
3. 手动执行创建表的SQL
4. 插入6个mock agents

## 步骤 6: 验证部署

访问你的Vercel URL：

1. **测试API健康**: `https://your-app.vercel.app/api/health`
   - 应该返回: `{"status":"ok","timestamp":"...","message":"API运行正常"}`

2. **测试Agents API**: `https://your-app.vercel.app/api/agents`
   - 应该返回: 6个mock agents的JSON数组

3. **测试前端**: `https://your-app.vercel.app`
   - Agents页面应该能看到6个agents
   - History页面应该能看到测试记录（如果有）

## 🎉 完成！

配置完成后，所有功能应该都能正常使用：
- ✅ 查看Agents列表
- ✅ 查看测试历史
- ✅ 下载测试报告
- ✅ 创建新测试

---

## ⚠️ 常见问题

### Q: API返回500错误
**A**: 检查环境变量是否正确配置，特别是 `DATABASE_URL` 和 `DIRECT_URL`

### Q: 数据库连接失败
**A**: 
1. 确认Neon数据库是否正常运行
2. 检查连接字符串格式是否正确
3. 确保包含 `?sslmode=require`

### Q: Prisma生成失败
**A**: 在Vercel中重新部署，确保 `npx prisma generate` 在构建时执行

### Q: 如何查看错误日志
**A**: Vercel Dashboard → Deployments → 选择部署 → Function Logs

---

需要帮助？查看完整文档或联系支持。

