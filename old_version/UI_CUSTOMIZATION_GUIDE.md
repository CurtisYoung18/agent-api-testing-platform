# UI 前端定制指南

## 📋 概述

该测试平台使用**Streamlit**构建，所有UI界面代码都在`app.py`文件中。本指南将教你如何自定义界面外观和功能。

## 🎨 UI界面修改文件

### 主要文件
- **`app.py`** - 主界面逻辑和UI布局
- **`tools/config.py`** - 配置参数和API设置  

### UI相关代码分布

```python
app.py 文件结构：
├── 页面配置 (第73-78行)          # 设置页面标题、图标等
├── 标题信息 (第83-84行)          # 页面顶部标题
├── 侧边栏配置 (第87-120行)       # 左侧配置面板
├── 主界面布局 (第122-170行)      # 文件上传和控制面板
├── 测试进度显示 (第220-300行)     # 实时测试结果显示
└── 结果展示 (第302-435行)        # 测试完成后的结果分析
```

## 🛠️ 常见UI修改

### 1. 修改页面标题和图标

```python
# 位置: app.py 第73-78行
st.set_page_config(
    page_title="你的标题",           # 浏览器标签页标题
    page_icon="🔥",                # 浏览器标签页图标
    layout="wide",                 # 布局: "centered" 或 "wide"
    initial_sidebar_state="expanded"  # 侧边栏状态
)
```

### 2. 修改主标题

```python
# 位置: app.py 第83-84行
st.title("🚀 你的平台名称")
st.markdown("**你的公司** - 平台描述")
```

### 3. 修改公司信息

```python
# 自定义顶部区域（可根据需要添加）
st.markdown("""
<div style='text-align: right; color: #666; margin-top: 20px;'>
<b>你的公司名称</b><br>
平台描述
</div>
""", unsafe_allow_html=True)
```

### 4. 修改颜色主题

Streamlit支持自定义CSS，可以通过`st.markdown`添加样式：

```python
# 添加自定义CSS
st.markdown("""
<style>
    /* 修改主色调 */
    .stButton > button {
        background-color: #FF6B6B;
        color: white;
    }
    
    /* 修改侧边栏背景 */
    .css-1d391kg {
        background-color: #F0F2F6;
    }
    
    /* 修改成功消息颜色 */
    .stSuccess {
        background-color: #D4EDDA;
        color: #155724;
    }
</style>
""", unsafe_allow_html=True)
```

### 5. 修改侧边栏内容

```python
# 位置: app.py 第87行开始
st.sidebar.header("⚙️ 你的配置标题")

# 添加新的侧边栏组件
st.sidebar.markdown("---")
st.sidebar.info("💡 提示信息")
```

### 6. 修改布局结构

```python
# 使用列布局
col1, col2, col3 = st.columns([2, 1, 1])
with col1:
    st.write("左侧内容")
with col2:
    st.write("中间内容")  
with col3:
    st.write("右侧内容")

# 使用容器
with st.container():
    st.write("容器内容")

# 使用expander折叠面板
with st.expander("点击展开"):
    st.write("折叠内容")
```

### 7. 修改页脚信息

```python
# 位置: web_app.py 第447-460行
st.markdown("""
<div style='text-align: center; color: #666; padding: 20px;'>
<div style='margin-bottom: 10px;'>
🌟 <b>你的平台名称</b> | 你的公司
</div>
<div style='font-size: 12px; color: #999;'>
平台描述 | Copyright © 2025 你的公司
</div>
</div>
""", unsafe_allow_html=True)
```

## 🎯 高级定制

### 1. 添加Logo

```python
# 在标题区域添加logo
col1, col2 = st.columns([1, 4])
with col1:
    st.image("logo.png", width=100)  # 需要将logo.png放在项目目录
with col2:
    st.title("平台名称")
```

### 2. 自定义图表样式

```python
import plotly.express as px
import plotly.graph_objects as go

# 自定义颜色方案
fig = px.pie(
    values=[success_tests, failed_tests],
    names=['成功', '失败'],
    title='测试结果分布',
    color_discrete_map={'成功': '#28a745', '失败': '#dc3545'}  # 自定义颜色
)

# 更新图表样式
fig.update_layout(
    font=dict(family="Arial, sans-serif", size=14),
    title_font_size=16,
    plot_bgcolor='rgba(0,0,0,0)',  # 透明背景
)
```

### 3. 添加动画效果

```python
# 添加进度动画
import time

progress_bar = st.progress(0)
for i in range(100):
    progress_bar.progress(i + 1)
    time.sleep(0.01)
```

### 4. 响应式设计

```python
# 根据屏幕尺寸调整布局
if st.session_state.get('mobile', False):
    # 移动端布局
    st.columns(1)
else:
    # 桌面端布局  
    st.columns([2, 1])
```

## 📊 组件参考

### 常用Streamlit组件

```python
# 文本组件
st.title("标题")
st.header("头部")
st.subheader("子头部")
st.text("纯文本")
st.markdown("**粗体** _斜体_")
st.caption("说明文字")

# 输入组件
st.text_input("文本输入")
st.text_area("多行文本")
st.number_input("数字输入")
st.selectbox("下拉选择", options=['A', 'B', 'C'])
st.multiselect("多选", options=['A', 'B', 'C'])
st.slider("滑块", min_value=0, max_value=100)
st.checkbox("复选框")
st.radio("单选", options=['A', 'B', 'C'])

# 显示组件
st.success("成功消息")
st.error("错误消息")
st.warning("警告消息")
st.info("信息消息")
st.metric("指标", value=100, delta=10)
st.json({"key": "value"})
st.code("print('Hello')", language='python')

# 布局组件
st.columns([1, 2, 1])
st.container()
st.expander("可展开区域")
st.sidebar.text("侧边栏内容")
st.empty()  # 占位符
```

## 🔧 开发调试

### 1. 实时预览

```bash
# 启动开发服务器，修改代码后自动刷新
streamlit run web_app.py --server.runOnSave true
```

### 2. 调试模式

```python
# 在代码中添加调试信息
st.write("调试信息:", variable_name)
st.json(data_dict)  # 显示JSON数据结构
```

### 3. 性能优化

```python
# 使用缓存避免重复计算
@st.cache_data
def load_data():
    return expensive_computation()

# 使用session_state保存状态
if 'counter' not in st.session_state:
    st.session_state.counter = 0
```

## 📚 参考资源

- [Streamlit官方文档](https://docs.streamlit.io/)
- [Streamlit组件库](https://streamlit.io/components)
- [CSS样式参考](https://www.w3schools.com/css/)
- [HTML标签参考](https://www.w3schools.com/tags/)

## ⚡ 快速修改检查清单

- [ ] 修改页面标题和图标
- [ ] 更新公司信息和Logo
- [ ] 调整颜色主题
- [ ] 自定义侧边栏内容
- [ ] 更新页脚信息
- [ ] 测试响应式布局
- [ ] 验证所有功能正常

---

**提示**: 修改UI后记得测试所有功能，确保界面调整不影响核心测试功能。
