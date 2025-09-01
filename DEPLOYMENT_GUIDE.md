# 🚀 部署指南

## 快速部署步骤

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

### 4. 启动应用
```bash
# 使用启动脚本（推荐）
./start_web_app.sh

# 或手动启动
streamlit run app.py --server.port 8501
```

### 5. 访问应用
打开浏览器访问：http://localhost:8501

## 🔧 API Keys 配置

### 已预配置的节点
项目中已包含以下API Keys配置（在 `tools/config.py` 中）：

- **CN节点 (回波医疗)**: `app-FzcBZOLzqPkziAWhC57Aq5Bf`
- **SG节点 (简单点)**: `app-Npxjw5HUbYkPvzLgfNVTiBLu` 
- **TH节点**: `app-11pMsg7O1mfafnghacH9WsBq` (需要更新为有效密钥)

### 如需修改API Keys：
编辑 `tools/config.py` 文件中的 `API_KEYS_BY_ENDPOINT` 配置。

## 📋 测试数据

项目包含两个测试集模板：
- `data/测试集模板.xlsx` - 原始模板
- `回波测试集模板.xlsx` - 回波医疗专用测试集（50个问题+参考答案）

## 🎯 功能特性

### Web界面功能
- ✅ 多节点支持 (CN/SG/TH)
- ✅ 实时测试进度
- ✅ 历史问题概览（可展开查看完整回答）
- ✅ 问题间隔控制 (0-30秒)
- ✅ 参考答案对比
- ✅ 多格式报告导出 (Excel/Markdown/JSON)

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
2. **API认证失败**: 检查对应节点的API Key是否有效
3. **端口已占用**: 使用 `streamlit run app.py --server.port 8502` 更换端口

### 获取帮助
- 查看 [README.md](README.md) 获取详细使用说明
- 查看 [UI_CUSTOMIZATION_GUIDE.md](UI_CUSTOMIZATION_GUIDE.md) 了解界面定制

## 📞 技术支持

如遇到部署问题，请检查：
1. Python版本兼容性
2. 依赖包安装状态
3. 网络连接和API可达性
4. 配置文件完整性
