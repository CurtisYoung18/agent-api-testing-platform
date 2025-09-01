# 🔐 安全更新说明

## 重要变更

为了提高项目的安全性，我们已经将所有API密钥迁移到环境变量中。**API密钥不再硬编码在源代码中**。

## 📋 设置步骤

### 1. 配置环境变量

复制 `.env.example` 文件为 `.env`：
```bash
cp .env.example .env
```

### 2. 编辑 `.env` 文件

在 `.env` 文件中填入您的真实API密钥：
```bash
# 不同节点的API Keys
API_KEY_CN=your_actual_cn_api_key_here
API_KEY_SG=your_actual_sg_api_key_here  
API_KEY_TH=your_actual_th_api_key_here

# 其他配置保持默认值即可
```

### 3. 验证配置

运行以下命令验证配置是否正确：
```bash
source venv/bin/activate
python -c "from tools.config import API_KEYS_BY_ENDPOINT; print('配置成功！')"
```

## ⚠️ 重要说明

1. **`.env` 文件不会被提交到Git**：该文件已被 `.gitignore` 忽略
2. **不要在任何地方公开您的API密钥**
3. **团队协作时**：每个开发者都需要创建自己的 `.env` 文件
4. **生产环境**：使用服务器的环境变量系统，而不是 `.env` 文件

## 🔄 从旧版本升级

如果您之前使用的是硬编码API密钥的版本：

1. 立即在GPTBots控制台中**撤销/重新生成**所有API密钥
2. 按照上述步骤配置新的 `.env` 文件
3. 使用新的API密钥

## 🚀 启动应用

配置完成后，正常启动应用：
```bash
source venv/bin/activate
python start_web_app.py
```

或使用 Streamlit 直接启动：
```bash
source venv/bin/activate
streamlit run app.py
```

## 💡 故障排除

**问题：ModuleNotFoundError: No module named 'dotenv'**
```bash
source venv/bin/activate
pip install python-dotenv
```

**问题：API密钥为空**
- 检查 `.env` 文件是否存在且格式正确
- 确保API密钥名称与 `.env.example` 中的格式一致

**问题：API调用失败**
- 验证API密钥是否有效且未过期
- 检查网络连接和API服务状态
