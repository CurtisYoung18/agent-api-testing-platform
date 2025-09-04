"""Agent API 测试工具 - Web应用界面"""

import streamlit as st
import pandas as pd
import io
import time
from datetime import datetime
from typing import List, Dict, Any

from tools.excel.excel_reader import ExcelReader
from tools.api.api_client import AgentAPIClient
from tools.excel.excel_output import ExcelOutputGenerator
from tools.excel.markdown_output import MarkdownOutputGenerator
from tools.config import DEFAULT_ENDPOINT, DEFAULT_API_KEY, get_api_key_for_endpoint, API_NAME_BY_ENDPOINT


def init_session_state():
    """初始化session state"""
    if 'test_results' not in st.session_state:
        st.session_state.test_results = []
    if 'test_running' not in st.session_state:
        st.session_state.test_running = False
    if 'test_progress' not in st.session_state:
        st.session_state.test_progress = 0


def validate_excel_template(uploaded_file) -> tuple[bool, str, List[str], List[str]]:
    """验证上传的Excel模板格式
    
    Returns:
        tuple: (是否有效, 错误信息, 问题列表, 参考答案列表)
    """
    try:
        # 读取Excel文件
        df = pd.read_excel(uploaded_file)
        
        # 检查必要的列
        if 'input' not in df.columns:
            return False, "Excel文件必须包含'input'列作为问题列", [], []
        
        # 获取问题列表
        questions = df['input'].dropna().astype(str).tolist()
        questions = [q.strip() for q in questions if q.strip()]
        
        if not questions:
            return False, "未找到有效的问题数据", [], []
        
        # 读取参考答案列表（如果存在）
        reference_outputs = []
        if 'reference_output' in df.columns:
            reference_outputs = df['reference_output'].astype(str).tolist()
            # 保持与questions相同的长度，缺失的用空字符串填充
            reference_outputs = [str(ref) if pd.notna(ref) else "" for ref in reference_outputs]
            # 如果参考答案数量少于问题数量，用空字符串填充
            while len(reference_outputs) < len(questions):
                reference_outputs.append("")
        else:
            # 如果没有reference_output列，创建同等长度的空字符串列表
            reference_outputs = [""] * len(questions)
        
        return True, "", questions, reference_outputs
        
    except Exception as e:
        return False, f"读取Excel文件失败: {str(e)}", [], []


def run_single_test(client: AgentAPIClient, question: str, user_id: str) -> Dict[str, Any]:
    """运行单个测试"""
    try:
        result = client.test_single_question(question, user_id)
        result.update({
            "timestamp": datetime.now().isoformat(),
            "question_preview": question[:100]
        })
        return result
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "question": question,
            "timestamp": datetime.now().isoformat(),
            "question_preview": question[:100]
        }


def main():
    st.set_page_config(
        page_title="测试平台",
        page_icon="🔧",
        layout="wide",
        initial_sidebar_state="expanded"
    )
    
    init_session_state()
    
    # 标题
    st.title("🔧 测试平台")
    st.markdown("AI Agent API 测试与评估工具")
    
    # 侧边栏配置
    st.sidebar.header("⚙️ API 配置")
    
    # API配置
    use_auto_key = st.sidebar.checkbox(
        "自动选择API Key", 
        value=True,
        help="根据选择的endpoint自动使用在tools/config.py中设置的默认对应的API Key"
    )
    
    if use_auto_key:
        api_key = None  # 让系统自动选择
        st.sidebar.info("💡 将根据选择的endpoint自动使用对应的API Key")
    else:
        api_key = st.sidebar.text_input(
            "API Key", 
            value=DEFAULT_API_KEY, 
            type="password",
            help="请输入您的GPTBots API Key"
        )
    
    endpoint = st.sidebar.selectbox(
        "API Endpoint",
        options=["cn", "sg", "th"],
        index=0,
        help="选择API endpoint区域\n• cn: 中国\n• sg: 新加坡\n• th: 泰国"
    )
    
    final_endpoint = endpoint
    
    # 显示最终的API地址和Key信息
    if final_endpoint == "cn":
        api_url = "https://api.gptbots.cn"
    else:
        api_url = f"https://api-{final_endpoint}.gptbots.ai"
    
    # 显示将要使用的API Key
    current_api_key = api_key if api_key else get_api_key_for_endpoint(final_endpoint)
    key_preview = f"{current_api_key[:15]}...{current_api_key[-4:]}" if current_api_key else "None"
    
    st.sidebar.info(f"🌐 API文档地址: {api_url}")
    st.sidebar.info(f"🔑 使用的API Name: {API_NAME_BY_ENDPOINT[final_endpoint]} \n \n 🔑 API Key预览: \n{key_preview}")
    
    # 测试参数
    st.sidebar.header("🎯 测试参数")
    
    user_id = st.sidebar.text_input(
        "用户ID", 
        value="test_user_001",
        help="用于标识测试用户的ID"
    )
    
    max_questions = st.sidebar.number_input(
        "最大测试问题数量", 
        min_value=1, 
        max_value=10000, 
        value=100,
        help="限制测试的问题数量，避免一次性测试过多"
    )
    
    delay_seconds = st.sidebar.slider(
        "问题间隔(秒)", 
        min_value=0.0, 
        max_value=30.0, 
        value= 0.0, 
        step=0.5,
        help="每个问题完整处理完成后的等待时间，避免请求过于频繁。0=无间隔"
    )
    
    # 主界面
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.header("📁 文件上传")
        
        # Excel模板说明
        with st.expander("📋 Excel模板格式说明", expanded=False):
            st.markdown("""
            **标准模板格式：**
            - 必须包含 `input` 列，用于存放测试问题
            - 可选 `reference_output` 列，用于存放期望输出（仅供参考）
            - 支持 `.xlsx` 和 `.xls` 格式
            
            **示例：**
            | input | reference_output |
            |-------|------------------|
            | 设备无法正常开机 | 请检查电源连接... |
            | 探头安装方法 | 按照说明书步骤... |
            """)
        
        uploaded_file = st.file_uploader(
            "选择Excel测试文件",
            type=['xlsx', 'xls'],
            help="上传包含测试问题的Excel文件"
        )
        
        if uploaded_file is not None:
            # 验证文件格式
            is_valid, error_msg, questions, reference_outputs = validate_excel_template(uploaded_file)
            
            if is_valid:
                has_reference = any(ref.strip() for ref in reference_outputs)
                st.success(f"✅ 文件验证成功！找到 {len(questions)} 个测试问题" + 
                          (f"，包含 {sum(1 for ref in reference_outputs if ref.strip())} 个参考答案" if has_reference else ""))
                
                # 显示问题预览
                with st.expander(f"👀 问题预览 ({len(questions)} 个问题)", expanded=False):
                    # 使用容器创建滚动区域
                    with st.container(height=1500):
                        st.info(f"显示全部 {len(questions)} 个问题：")
                        for i, q in enumerate(questions, 1):
                            st.write(f"**{i}. 问题:** {q}")
                            if i <= len(reference_outputs) and reference_outputs[i-1].strip():
                                st.write(f"**参考答案:** {reference_outputs[i-1]}")
                            st.write("---")
                
                # 存储到session state
                st.session_state.uploaded_questions = questions
                st.session_state.uploaded_reference_outputs = reference_outputs
                st.session_state.uploaded_file = uploaded_file
                
            else:
                st.error(f"❌ {error_msg}")
                st.session_state.uploaded_questions = []
    
    with col2:
        st.header("🚀 测试控制")
        
        # 测试按钮
        test_disabled = (
            not hasattr(st.session_state, 'uploaded_questions') or 
            not st.session_state.uploaded_questions or 
            (api_key is not None and not api_key.strip()) or  # 如果api_key不是None且为空字符串时才禁用
            st.session_state.test_running
        )
        
        if st.button(
            "开始测试 🎯", 
            disabled=test_disabled,
            help="开始批量测试上传的问题" if not test_disabled else "请先上传有效的Excel文件并配置API Key"
        ):
            if hasattr(st.session_state, 'uploaded_questions') and st.session_state.uploaded_questions:
                st.session_state.test_running = True
                st.session_state.test_results = []
                st.session_state.test_progress = 0
                st.rerun()
        
        # 测试进度和结果
        if st.session_state.test_running:
            st.header("⏳ 测试进行中...")
            
            questions = st.session_state.uploaded_questions
            total_questions = min(len(questions), max_questions)
            
            # 创建API客户端
            try:
                client = AgentAPIClient(endpoint=final_endpoint, api_key=api_key)
            except Exception as e:
                st.error(f"❌ API客户端创建失败: {str(e)}")
                st.session_state.test_running = False
                st.rerun()
            
            # 进度条
            progress_bar = st.progress(0)
            status_text = st.empty()
            results_container = st.empty()
            
            # 执行测试
            test_results = []
            
            # 创建实时结果显示容器
            live_results = st.empty()
            
            # 获取参考答案（如果有）
            reference_outputs = getattr(st.session_state, 'uploaded_reference_outputs', [])
            
            for i, question in enumerate(questions[:max_questions]):
                current_progress = (i + 1) / total_questions
                progress_bar.progress(current_progress)
                status_text.text(f"正在测试第 {i+1}/{total_questions} 个问题: {question[:50]}...")
                
                # 运行单个测试
                result = run_single_test(client, question, user_id)
                
                # 添加参考答案到结果中（如果存在）
                if i < len(reference_outputs):
                    result['reference_output'] = reference_outputs[i]
                else:
                    result['reference_output'] = ""
                
                test_results.append(result)
                
                # 实时显示结果和回答
                with live_results.container():
                    # 显示统计信息
                    success_count = len([r for r in test_results if r['success']])
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.metric("测试进度", f"{i+1}/{total_questions}")
                    with col2:
                        st.metric("成功数量", success_count)
                    with col3:
                        st.metric("成功率", f"{success_count/(i+1)*100:.1f}%")
                    
                    # 显示当前问题测试结果
                    st.markdown("---")
                    st.markdown(f"**问题 {i+1}:** {question}")
                    
                    if result['success']:
                        st.success("✅ 测试成功")
                        
                        # 提取并显示Agent回答
                        try:
                            data = result.get('data', {})
                            if 'output' in data and data['output']:
                                reply = data['output'][0].get('content', {}).get('text', '')
                                if reply:
                                    st.markdown("**🤖 Agent回答:**")
                                    with st.expander("查看完整回答", expanded=True):
                                        st.markdown(reply)
                                    
                                    # 显示token使用情况
                                    usage = data.get('usage', {})
                                    if usage:
                                        tokens = usage.get('tokens', {})
                                        if tokens:
                                            st.caption(f"Token使用: {tokens.get('total_tokens', 0)} (输入: {tokens.get('prompt_tokens', 0)}, 输出: {tokens.get('completion_tokens', 0)})")
                                else:
                                    st.warning("Agent未返回有效回答")
                            else:
                                st.warning("未获取到Agent回答数据")
                        except Exception as e:
                            st.error(f"解析Agent回答时出错: {str(e)}")
                    else:
                        st.error(f"❌ 测试失败: {result.get('error', '未知错误')}")
                        if 'error_detail' in result:
                            st.json(result['error_detail'])
                    
                    # 显示历史结果概览
                    if i > 0:
                        st.markdown("---")
                        st.markdown("**历史测试概览:**")
                        for j, past_result in enumerate(test_results[:-1], 1):  # 除了当前结果
                            status_icon = "✅" if past_result['success'] else "❌"
                            question_preview = past_result.get('question', '')[:40]
                            question_preview = question_preview + "..." if len(past_result.get('question', '')) > 40 else question_preview
                            
                            # 使用expander显示完整内容
                            with st.expander(f"{status_icon} 问题 {j}: {question_preview}", expanded=False):
                                st.write("**完整问题:**")
                                st.write(past_result.get('question', ''))
                                
                                if past_result['success']:
                                    # 提取Agent回复
                                    agent_reply = ""
                                    if 'data' in past_result and 'output' in past_result['data']:
                                        output = past_result['data']['output']
                                        if output and len(output) > 0:
                                            content = output[0].get('content', {})
                                            agent_reply = content.get('text', '无回复内容')
                                    
                                    st.write("**Agent回复:**")
                                    st.write(agent_reply if agent_reply else '无回复内容')
                                else:
                                    st.write("**错误信息:**")
                                    st.error(past_result.get('error', '未知错误'))
                
                # 延迟（如果设置了间隔时间）
                if delay_seconds > 0 and i < total_questions - 1:  # 最后一个不需要延迟
                    time.sleep(delay_seconds)
            
            # 测试完成
            st.session_state.test_results = test_results
            st.session_state.test_running = False
            st.success("🎉 所有测试完成！")
            st.rerun()
    
    # 测试结果展示
    if st.session_state.test_results and not st.session_state.test_running:
        st.header("📊 测试结果")
        
        results = st.session_state.test_results
        total_tests = len(results)
        success_tests = len([r for r in results if r['success']])
        failed_tests = total_tests - success_tests
        success_rate = (success_tests / total_tests * 100) if total_tests > 0 else 0
        
        # 统计概览
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("总测试数", total_tests)
        with col2:
            st.metric("成功数", success_tests, f"{success_rate:.1f}%")
        with col3:
            st.metric("失败数", failed_tests)
        with col4:
            if success_rate >= 80:
                st.metric("测试状态", "良好 ✅")
            elif success_rate >= 50:
                st.metric("测试状态", "一般 ⚠️")
            else:
                st.metric("测试状态", "差 ❌")
        
        # 详细结果展示
        tab1, tab2, tab3 = st.tabs(["📋 详细结果", "❌ 失败分析", "📈 统计图表"])
        
        with tab1:
            for i, result in enumerate(results, 1):
                with st.expander(
                    f"问题 {i}: {result.get('question_preview', result.get('question', ''))[:60]}{'...' if len(result.get('question', '')) > 60 else ''} - {'✅ 成功' if result['success'] else '❌ 失败'}"
                ):
                    st.write("**问题:**", result.get('question', ''))
                    
                    if result['success']:
                        data = result.get('data', {})
                        if 'output' in data and data['output']:
                            reply = data['output'][0].get('content', {}).get('text', '')
                            st.write("**Agent回复:**")
                            st.write(reply)
                            
                            # 显示usage信息
                            usage = data.get('usage', {})
                            if usage:
                                col1, col2 = st.columns(2)
                                with col1:
                                    tokens = usage.get('tokens', {})
                                    st.write("**Token使用:**")
                                    st.json(tokens)
                                with col2:
                                    credits = usage.get('credits', {})
                                    st.write("**成本:**")
                                    st.json(credits)
                    else:
                        st.error(f"**错误:** {result.get('error', '未知错误')}")
                        if 'error_detail' in result:
                            st.json(result['error_detail'])
        
        with tab2:
            failed_results = [r for r in results if not r['success']]
            if failed_results:
                st.write(f"共有 {len(failed_results)} 个测试失败:")
                for i, result in enumerate(failed_results, 1):
                    st.error(f"**{i}. {result.get('question_preview', result.get('question', ''))}**")
                    st.write(f"错误信息: {result.get('error', '未知错误')}")
                    if 'error_detail' in result:
                        st.json(result['error_detail'])
                    st.write("---")
            else:
                st.success("🎉 所有测试都成功了！")
        
        with tab3:
            # 成功率饼图
            import plotly.express as px
            
            fig = px.pie(
                values=[success_tests, failed_tests],
                names=['成功', '失败'],
                title=f'测试结果分布 (总计: {total_tests})',
                color_discrete_map={'成功': '#4CAF50', '失败': '#F44336'}
            )
            st.plotly_chart(fig)
        
        # 导出功能
        st.header("📥 导出结果")
        
        # 导出格式说明
        with st.expander("ℹ️ 导出格式说明", expanded=False):
            st.markdown("""
            **📊 Excel格式**: 
            - 包含详细测试数据和统计汇总
            - 支持数据分析和进一步处理
            
            **📝 Markdown格式**: 
            - 支持**图片直接显示**（解决Excel中图片链接问题）
            - 更好的文本格式化和阅读体验
            - 支持在GitHub、Notion等平台查看
            - 包含完整的测试报告和统计分析
            
            **📋 JSON格式**: 
            - 原始数据，便于程序处理
            - 包含完整的API响应信息
            """)
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            # 生成Excel文件
            excel_generator = ExcelOutputGenerator()
            excel_buffer = excel_generator.generate_excel_output(results)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            excel_filename = f"agent_test_results_{timestamp}.xlsx"
            
            st.download_button(
                label="📊 下载Excel报告",
                data=excel_buffer.getvalue(),
                file_name=excel_filename,
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                help="下载包含详细测试结果的Excel文件"
            )
        
        with col2:
            # 生成Markdown文件
            markdown_generator = MarkdownOutputGenerator()
            markdown_content = markdown_generator.generate_markdown_output(results)
            markdown_filename = f"agent_test_results_{timestamp}.md"
            
            st.download_button(
                label="📝 下载Markdown报告",
                data=markdown_content,
                file_name=markdown_filename,
                mime="text/markdown",
                help="下载Markdown格式报告，支持图片显示和更好的格式化"
            )
        
        with col3:
            # 生成JSON文件
            import json
            json_str = json.dumps(results, ensure_ascii=False, indent=2)
            json_filename = f"agent_test_results_{timestamp}.json"
            
            st.download_button(
                label="📋 下载JSON数据",
                data=json_str,
                file_name=json_filename,
                mime="application/json",
                help="下载原始测试结果的JSON文件"
            )
    



if __name__ == "__main__":
    main()
