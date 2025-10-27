# 部署前检查清单

## ✅ 代码准备

- [x] 前端代码完成
- [x] 后端API完成
- [x] 数据库Schema定义
- [x] 环境变量配置示例
- [ ] 构建测试通过

## ✅ GitHub准备

- [ ] 代码推送到GitHub
- [ ] .gitignore配置正确
- [ ] README更新

## ✅ Vercel配置

- [ ] 创建Vercel账号
- [ ] 导入GitHub仓库
- [ ] 配置构建命令
- [ ] 配置环境变量

## ✅ 数据库准备

- [ ] 创建Neon数据库
- [ ] 获取DATABASE_URL
- [ ] 获取DIRECT_URL
- [ ] 运行prisma db push
- [ ] 运行seed导入mock数据

## 🚀 部署命令

```bash
# 1. 确保在项目根目录
cd /Users/curtis/Desktop/agent-api-testing-platform-1

# 2. 初始化Git（如果需要）
git init
git add .
git commit -m "feat: ready for Vercel deployment"

# 3. 推送到GitHub
# （需要先在GitHub创建仓库）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main

# 4. 在Vercel导入项目
# 访问 https://vercel.com/new
# 选择GitHub仓库
# 按照VERCEL_DEPLOYMENT.md配置

# 5. 部署后初始化数据库
vercel env pull .env.production
cd server
npx prisma db push
npx tsx src/prisma/seed.ts
```

