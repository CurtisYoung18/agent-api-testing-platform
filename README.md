# 测试平台

AI Agent API 测试与评估工具，支持命令行和Web界面两种使用方式，可以读取Excel表格中的问题并调用API进行批量测试和性能评估。

## ✨ 功能特点

- 🌐 **Web界面**: 友好的本地Web应用，支持文件上传和结果下载
- 📊 **Excel支持**: 支持Excel文件上传和结果导出
- 🔧 **灵活配置**: 支持自定义API Key和Endpoint
- 📈 **实时监控**: 实时显示测试进度和成功率
- 📋 **详细报告**: 生成包含统计分析的详细测试报告
- 🚀 **多种部署**: 支持命令行和Web应用两种使用方式

## 项目结构

```
测试平台/
├── app.py                       # Web应用主程序
├── start_web_app.py            # Web应用启动脚本（Python版）
├── start_web_app.sh            # Web应用启动脚本（Shell版）
├── requirements.txt            # Python依赖包
├── README.md                   # 项目说明文档
├── UI_CUSTOMIZATION_GUIDE.md   # UI界面定制指南
├── tools/                      # 工具模块
│   ├── config.py              # 配置文件（API配置函数）
│   ├── excel/                 # Excel处理模块
│   │   ├── excel_reader.py    # Excel文件读取
│   │   └── excel_output.py    # Excel结果导出
│   └── api/                   # API调用模块
│       └── api_client.py      # API客户端
├── cli_tools/                  # 命令行工具
│   ├── test_agent.py          # 命令行测试脚本
│   └── run_test.py            # 简化的命令行测试脚本
├── data/                       # 数据文件
│   └── 测试集模板.xlsx         # 测试数据文件模板
└── venv/                       # 虚拟环境
```

## 安装依赖

```bash
pip install -r requirements.txt
```

## 使用方法

### 🌐 Web界面（推荐）

#### 快速启动

**方式一：使用启动脚本**
```bash
# Shell脚本（推荐）
./start_web_app.sh

# 或者Python脚本
python start_web_app.py
```

**方式二：手动启动**
```bash
# 激活虚拟环境
source venv/bin/activate

# 启动Web应用
streamlit run app.py --server.port 8501
```

#### Web界面功能

1. **API配置**: 在侧边栏配置API Key和Endpoint
2. **文件上传**: 上传包含测试问题的Excel文件
3. **测试控制**: 设置测试参数并启动批量测试
4. **实时监控**: 查看测试进度和实时结果，**支持实时显示Agent回答**
5. **结果分析**: 查看详细测试结果和统计分析
6. **报告导出**: 下载Excel或JSON格式的测试报告

### 🎨 界面定制

Web界面支持完全定制，详细说明请参考：[UI界面定制指南](UI_CUSTOMIZATION_GUIDE.md)

**定制功能包括:**
- 修改公司信息和Logo
- 调整颜色主题和样式
- 自定义布局和组件
- 添加新功能模块

#### 支持的API Endpoint
- **cn**: `https://api.gptbots.cn` (中国，默认)
- **sg**: `https://api-sg.gptbots.ai` (新加坡) 
- **th**: `https://api-th.gptbots.ai` (泰国)
- **自定义**: 支持输入任意endpoint名称

> ⚠️ **重要**: 不同的endpoint需要使用不同的API Key。如果SG或TH节点无法创建对话，请参考 [多节点配置指南](MULTI_ENDPOINT_GUIDE.md) 配置正确的API Key。

### 💻 命令行界面

#### 1. 快速开始

使用简化的运行脚本：

```bash
# 激活虚拟环境
source venv/bin/activate

# 测试3个问题（默认）
python cli_tools/run_test.py

# 测试10个问题
python cli_tools/run_test.py -n 10

# 测试所有问题
python cli_tools/run_test.py --all

# 设置请求间隔为1秒
python cli_tools/run_test.py -n 5 -d 1.0
```

### 2. 基本使用

直接运行主脚本：

```bash
python cli_tools/test_agent.py
```

### 3. 测试单独的模块

测试Excel读取功能：
```bash
python -c "from tools.excel.excel_reader import ExcelReader; r = ExcelReader(); print(f'找到{len(r.get_questions())}个问题')"
```

测试API客户端（创建对话和发送消息）：
```bash
python -c "from tools.api.api_client import AgentAPIClient; c = AgentAPIClient(); print('对话ID:', c.create_conversation())"
```

### 4. 自定义测试

在Python中使用：

```python
from cli_tools.test_agent import AgentTester

# 创建测试器
tester = AgentTester()

# 运行测试（测试前5个问题）
results = tester.run_tests(max_questions=5, delay_seconds=1.0)

# 保存结果
tester.save_results()

# 查看失败的测试
tester.print_failed_tests()
```

### 5. 命令行参数说明

`run_test.py` 支持以下参数：

- `-n, --number`: 测试问题数量（默认: 3）
- `-d, --delay`: 请求间隔时间/秒（默认: 2.0）
- `--column`: 指定问题列名（默认: 自动检测）
- `--all`: 测试所有问题

## 配置说明

在 `tools/config.py` 中可以修改以下配置：

- `DEFAULT_API_KEY`: Agent API密钥
- `DEFAULT_ENDPOINT`: 默认API endpoint
- `EXCEL_FILE_PATH`: Excel文件路径
- `DEFAULT_USER_ID`: 默认用户ID
- `REQUEST_TIMEOUT`: 请求超时时间

## 📋 Excel文件格式

### 标准模板格式
- **必须包含**: `input` 列（存放测试问题）
- **可选包含**: `reference_output` 列（期望输出，仅供参考）
- **支持格式**: `.xlsx` 和 `.xls`

### 示例格式
| input | reference_output |
|-------|------------------|
| 设备无法正常开机 | 请检查电源连接... |
| 探头安装方法 | 按照说明书步骤... |
| 设备序列号查看 | 在设备背面标签... |

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

## 扩展功能

工具设计为模块化结构，便于扩展：

- 添加新的数据源支持（CSV、数据库等）
- 实现更多API功能（发送消息V2、获取对话历史等）
- 添加测试报告生成功能
- 实现并发测试以提高效率

## 故障排查

1. **Excel读取失败**: 检查文件路径和格式是否正确
2. **API调用失败**: 检查API key和网络连接
3. **依赖包问题**: 确保所有依赖包已正确安装

## 更新日志

- v1.0: 初始版本，支持Excel读取和对话创建功能
# agent-api-testing-platform
