# 测试平台

AI Agent API 测试与评估工具，支持命令行和Web界面两种使用方式，可以读取Excel表格中的问题并调用API进行批量测试和性能评估。

## ✨ 功能特点

- 🌐 **Web界面**: 友好的本地Web应用，支持文件上传和结果下载
- 📊 **Excel支持**: 支持Excel文件上传和结果导出
- 🔧 **灵活配置**: 支持自定义API Key和Endpoint
- 📈 **实时监控**: 实时显示测试进度和成功率
- 📋 **详细报告**: 生成包含统计分析的详细测试报告
- 🚀 **多种部署**: 支持命令行和Web应用两种使用方式



## 🚀 快速部署指南


### 1. 克隆项目
```bash
git clone https://github.com/CurtisYoung18/agent-api-testing-platform.git
cd agent-api-testing-platform
```

### 2. 创建虚拟环境
```bash
# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate  # macOS/Linux
# 或 venv\Scripts\activate  # Windows
```

### 3. 安装依赖
```bash
pip install -r requirements.txt
```

### 4. 配置API密钥
```bash
# 复制配置模板
cp .env.example .env

# 编辑.env文件，填入您的API密钥
# API_KEY_CN=your_actual_api_key_here
# API_KEY_SG=your_actual_api_key_here  
# API_KEY_TH=your_actual_api_key_here
```

### 5. 启动应用
```bash
# python运行启动
python3 start_web_app.py
```

### 6. 访问应用
若未自动弹出web应用，请手动打开浏览器访问：http://localhost:8501

## 🔧 API Keys 配置

### ⚠️ 重要安全说明
为了保护您的API密钥安全，项目现在使用环境变量进行配置。**请勿在源代码中硬编码API密钥！**

### 🚀 快速配置步骤

1. **复制配置模板**
   ```bash
   cp .env.example .env
   ```

2. **编辑 `.env` 文件**
   ```bash
   # 不同节点的API Keys - 请替换为您的真实密钥
   API_KEY_CN=your_cn_api_key_here
   API_KEY_SG=your_sg_api_key_here
   API_KEY_TH=your_th_api_key_here
   
   # 其他配置（可选）
   DEFAULT_ENDPOINT=cn
   DEFAULT_USER_ID=test_user_001
   REQUEST_TIMEOUT=60
   ```

3. **验证配置**
   ```bash
   source venv/bin/activate
   python -c "from tools.config import API_KEYS_BY_ENDPOINT; print('✅ 配置成功！')"
   ```

## 📝 配置说明

项目使用 `.env` 文件进行配置管理。所有配置项都可以在 `.env` 文件中修改：

### 🔑 API 配置
- `API_KEY_CN`: 中国节点API密钥
- `API_KEY_SG`: 新加坡节点API密钥  
- `API_KEY_TH`: 泰国节点API密钥
- `DEFAULT_ENDPOINT`: 默认API endpoint (cn/sg/th)

### ⚙️ 应用配置
- `DEFAULT_USER_ID`: 默认用户ID (默认: test_user_001)
- `REQUEST_TIMEOUT`: API请求超时时间/秒 (默认: 60)
- `EXCEL_FILE_PATH`: 默认Excel文件路径

### 🔧 高级配置
如需修改更多配置，请查看 `tools/config.py` 文件中的详细选项。所有配置都支持通过环境变量覆盖。


### 💡 配置提示
- `.env` 文件不会被Git提交，保护您的密钥安全
- 每个开发者都需要创建自己的 `.env` 文件
- 在Web界面中也可以临时输入不同的API Key


## 📋 测试数据
项目包含一个测试集模板：
- `data/测试集模板.xlsx` - 原始模板（回波医疗测试）


### 命令行工具
```bash
# 测试3个问题（默认）
python cli_tools/run_test.py

# 测试10个问题，间隔1秒
python cli_tools/run_test.py -n 10 -d 1.0

# 测试所有问题，无间隔
python cli_tools/run_test.py --all -d 0
```



## ⚠️ 注意事项

1. **端口占用**: 默认使用8501端口，如被占用可修改启动命令
2. **API限流**: 建议设置适当的请求间隔避免触发限流
3. **文件权限**: 确保启动脚本有执行权限 (`chmod +x start_web_app.sh`)
4. **Python版本**: 推荐使用Python 3.8+

## 🛟 故障排除

### 常见问题
1. **模块导入错误**: 确保虚拟环境已激活且依赖已安装
2. **API认证失败**: 检查 `.env` 文件中的API Key是否正确且有效
3. **配置文件问题**: 确保 `.env` 文件存在且格式正确
4. **端口已占用**: 使用 `streamlit run app.py --server.port 8502` 更换端口

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

### 获取帮助
- 查看 [UI_CUSTOMIZATION_GUIDE.md](UI_CUSTOMIZATION_GUIDE.md) 了解界面定制



### 兼容性说明
Web界面会自动验证文件格式，确保包含必要的列。命令行工具会自动检测以下列名：
- `input` (推荐)
- `问题`、`question`、`Query`、`query`
- `测试问题`、`test_question`

如果没有找到这些列名，会使用第一列作为问题列。

## 📊 输出结果

### Web界面输出
- **实时进度**: 测试过程中实时显示进度和成功率
- **统计概览**: 总测试数、成功数、失败数、成功率
- **详细结果**: 每个问题的Agent回复和错误信息
- **可视化图表**: 成功率饼图等统计图表
- **Excel报告**: 包含详细结果和统计汇总的Excel文件
- **Markdown报告**: 支持图片直接显示的格式化报告
- **JSON数据**: 原始测试结果的JSON格式文件

### 报告格式详情

#### 📊 Excel报告
- **测试结果** 工作表：详细的测试记录
- **统计汇总** 工作表：总体统计信息
- 支持颜色标记：成功为绿色，失败为红色
- 适合数据分析和进一步处理

#### 📝 Markdown报告 (推荐)
- **图片直接显示**：解决Excel中图片链接无法显示的问题
- **格式化内容**：支持表格、列表、标题等丰富格式
- **统计汇总**：包含详细的测试统计和成功率分析
- **失败分析**：自动分类错误类型并提供详细分析
- **兼容性强**：支持GitHub、Notion、Typora等平台查看
- **易于分享**：可直接在各种Markdown编辑器中查看和编辑

### JSON数据格式
```json
{
  "success": true,
  "data": {
    "output": [...],
    "usage": {"tokens": {...}, "credits": {...}}
  },
  "question": "测试问题",
  "conversation_id": "对话ID",
  "message_id": "消息ID",
  "test_index": 1,
  "timestamp": "2024-01-01T12:00:00",
  "question_preview": "问题预览..."
}
```

## 注意事项

1. **虚拟环境**: 建议在虚拟环境中运行，避免依赖冲突
2. **请求频率**: 默认每个请求间隔2秒，避免请求过于频繁
3. **超时设置**: API请求超时时间设为60秒，适合大部分Agent响应时间
4. **错误处理**: 工具包含完善的错误处理，会记录所有失败的情况
5. **测试数量**: 建议先用少量数据测试，确认API调用正常后再增加测试数量
6. **API配额**: 注意API使用配额限制，大量测试前请确认账户余额


## 更新日志

- v1.0: 初始版本，支持Excel读取和对话创建功能
# agent-api-testing-platform
