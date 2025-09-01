"""Markdown输出模块"""

import re
import io
from typing import List, Dict, Any
from datetime import datetime


class MarkdownOutputGenerator:
    """Markdown输出生成器"""
    
    def __init__(self):
        pass
    
    def generate_markdown_output(self, test_results: List[Dict[str, Any]]) -> str:
        """生成Markdown输出内容
        
        Args:
            test_results: 测试结果列表
            
        Returns:
            str: Markdown格式的内容
        """
        if not test_results:
            return self._generate_empty_markdown()
        
        markdown_content = []
        
        # 添加标题和概览
        markdown_content.extend(self._generate_header(test_results))
        
        # 添加统计汇总
        markdown_content.extend(self._generate_summary(test_results))
        
        # 添加详细测试结果
        markdown_content.extend(self._generate_detailed_results(test_results))
        
        # 添加失败分析（如果有）
        failed_results = [r for r in test_results if not r.get('success', False)]
        if failed_results:
            markdown_content.extend(self._generate_failure_analysis(failed_results))
        
        return '\n'.join(markdown_content)
    
    def _generate_empty_markdown(self) -> str:
        """生成空结果的Markdown"""
        return """# 📊 测试结果报告

## ⚠️ 无测试数据

当前没有可用的测试结果数据。

---
*报告生成时间: {}*
""".format(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    
    def _generate_header(self, test_results: List[Dict[str, Any]]) -> List[str]:
        """生成页面头部"""
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        total_tests = len(test_results)
        success_tests = len([r for r in test_results if r.get('success', False)])
        success_rate = (success_tests / total_tests * 100) if total_tests > 0 else 0
        
        return [
            "# 📊 Agent API 测试结果报告",
            "",
            f"**报告生成时间**: {current_time}  ",
            f"**总测试数量**: {total_tests}  ",
            f"**成功数量**: {success_tests}  ",
            f"**失败数量**: {total_tests - success_tests}  ",
            f"**成功率**: {success_rate:.1f}%  ",
            "",
            "---",
            ""
        ]
    
    def _generate_summary(self, test_results: List[Dict[str, Any]]) -> List[str]:
        """生成统计汇总"""
        total_tests = len(test_results)
        success_tests = len([r for r in test_results if r.get('success', False)])
        failed_tests = total_tests - success_tests
        success_rate = (success_tests / total_tests * 100) if total_tests > 0 else 0
        
        # 计算Token和成本统计
        total_tokens = 0
        total_cost = 0.0
        
        for result in test_results:
            if result.get('success', False) and 'data' in result:
                usage = result['data'].get('usage', {})
                if 'tokens' in usage:
                    total_tokens += usage['tokens'].get('total_tokens', 0)
                if 'credits' in usage:
                    total_cost += usage['credits'].get('total_credits', 0.0)
        
        # 时间统计
        timestamps = [r.get('timestamp', '') for r in test_results if r.get('timestamp')]
        start_time = min(timestamps) if timestamps else ''
        end_time = max(timestamps) if timestamps else ''
        
        if start_time and end_time:
            try:
                start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                duration = (end_dt - start_dt).total_seconds()
                start_time = start_dt.strftime('%H:%M:%S')
                end_time = end_dt.strftime('%H:%M:%S')
            except:
                duration = 0
        else:
            duration = 0
        
        summary = [
            "## 📈 统计汇总",
            "",
            "| 统计项 | 数值 |",
            "|--------|------|",
            f"| 🎯 总测试数量 | {total_tests} |",
            f"| ✅ 成功数量 | {success_tests} |",
            f"| ❌ 失败数量 | {failed_tests} |",
            f"| 📊 成功率 | {success_rate:.1f}% |",
            f"| 🔧 总Token消耗 | {total_tokens:,} |",
            f"| 💰 总成本 | {total_cost:.4f} |",
            f"| ⏰ 开始时间 | {start_time} |",
            f"| ⏰ 结束时间 | {end_time} |",
        ]
        
        if duration > 0:
            summary.append(f"| ⏱️ 总耗时 | {duration:.1f} 秒 |")
        
        summary.extend([
            "",
            "---",
            ""
        ])
        
        return summary
    
    def _generate_detailed_results(self, test_results: List[Dict[str, Any]]) -> List[str]:
        """生成详细测试结果"""
        content = [
            "## 📋 详细测试结果",
            ""
        ]
        
        for i, result in enumerate(test_results, 1):
            question = result.get('question', f'问题 {i}')
            success = result.get('success', False)
            timestamp = result.get('timestamp', '')
            
            # 格式化时间
            formatted_time = self._format_timestamp(timestamp)
            
            # 状态图标和颜色
            status_icon = "✅" if success else "❌"
            status_text = "成功" if success else "失败"
            
            content.extend([
                f"### {status_icon} 问题 {i}: {status_text}",
                "",
                f"**问题**: {question}",
                f"**测试时间**: {formatted_time}",
                ""
            ])
            
            # 显示参考答案（如果存在）
            reference_output = result.get('reference_output', '')
            if reference_output.strip():
                content.extend([
                    "**📋 参考答案**:",
                    "",
                    reference_output,
                    ""
                ])
            
            if success:
                # 成功的情况，显示Agent回复
                agent_reply = self._extract_agent_reply(result)
                if agent_reply:
                    # 处理图片链接
                    processed_reply = self._process_images_in_text(agent_reply)
                    content.extend([
                        "**🤖 Agent回复**:",
                        "",
                        processed_reply,
                        ""
                    ])
            else:
                # 失败的情况，显示错误信息
                error_msg = result.get('error', '未知错误')
                content.extend([
                    f"**❌ 错误信息**: {error_msg}",
                    ""
                ])
                
                if 'error_detail' in result:
                    error_detail = result['error_detail']
                    if isinstance(error_detail, dict):
                        content.extend([
                            "**错误详情**:",
                            f"- 错误码: {error_detail.get('code', 'N/A')}",
                            f"- 错误消息: {error_detail.get('message', 'N/A')}",
                            ""
                        ])
            
            content.append("---")
            content.append("")
        
        return content
    
    def _generate_failure_analysis(self, failed_results: List[Dict[str, Any]]) -> List[str]:
        """生成失败分析"""
        content = [
            "## ❌ 失败分析",
            "",
            f"共有 **{len(failed_results)}** 个测试失败:",
            ""
        ]
        
        # 按错误类型分类
        error_categories = {}
        for result in failed_results:
            error = result.get('error', '未知错误')
            # 提取主要错误类型
            if 'timeout' in error.lower():
                error_type = '超时错误'
            elif 'connection' in error.lower():
                error_type = '连接错误'
            elif '500' in error:
                error_type = '服务器内部错误'
            elif '40' in error[:3]:
                error_type = '客户端错误'
            else:
                error_type = '其他错误'
            
            if error_type not in error_categories:
                error_categories[error_type] = []
            error_categories[error_type].append(result)
        
        # 生成错误分类统计
        content.extend([
            "### 📊 错误分类统计",
            "",
            "| 错误类型 | 数量 | 占比 |",
            "|----------|------|------|"
        ])
        
        for error_type, errors in error_categories.items():
            count = len(errors)
            percentage = (count / len(failed_results)) * 100
            content.append(f"| {error_type} | {count} | {percentage:.1f}% |")
        
        content.extend([
            "",
            "### 🔍 失败详情",
            ""
        ])
        
        # 列出具体失败的问题
        for i, result in enumerate(failed_results, 1):
            question = result.get('question', f'问题 {i}')[:60]
            if len(result.get('question', '')) > 60:
                question += "..."
            error = result.get('error', '未知错误')
            
            content.extend([
                f"**{i}.** {question}",
                f"   - ❌ {error}",
                ""
            ])
        
        return content
    
    def _extract_agent_reply(self, result: Dict[str, Any]) -> str:
        """提取Agent回复内容"""
        if not result.get('success', False) or 'data' not in result:
            return ""
        
        data = result['data']
        if 'output' not in data or not data['output']:
            return ""
        
        first_output = data['output'][0]
        if 'content' not in first_output or 'text' not in first_output['content']:
            return ""
        
        return first_output['content']['text']
    
    def _extract_usage_info(self, result: Dict[str, Any]) -> str:
        """提取Token使用信息"""
        if not result.get('success', False) or 'data' not in result:
            return ""
        
        usage = result['data'].get('usage', {})
        if not usage:
            return ""
        
        tokens = usage.get('tokens', {})
        credits = usage.get('credits', {})
        
        info_parts = []
        
        if tokens:
            total = tokens.get('total_tokens', 0)
            prompt = tokens.get('prompt_tokens', 0)
            completion = tokens.get('completion_tokens', 0)
            info_parts.append(f"- Token总量: {total:,} (输入: {prompt:,}, 输出: {completion:,})")
        
        if credits:
            total_cost = credits.get('total_credits', 0.0)
            if total_cost > 0:
                info_parts.append(f"- 成本: {total_cost:.4f}")
        
        return '\n'.join(info_parts)
    
    def _process_images_in_text(self, text: str) -> str:
        """处理文本中的图片链接，转换为Markdown图片格式"""
        processed_text = text
        
        # 第一步：处理HTML img标签
        img_tag_pattern = r'<img[^>]*src=["\']([^"\']+)["\'][^>]*>'
        processed_text = re.sub(img_tag_pattern, r'![图片](\1)', processed_text)
        
        # 第二步：处理纯图片URL（简化逻辑，避免复杂的负向断言）
        # 先标记已存在的Markdown图片格式，避免重复处理
        existing_md_images = re.findall(r'!\[[^\]]*\]\([^\)]+\)', processed_text)
        temp_placeholders = {}
        
        # 用临时占位符替换已有的Markdown图片
        for i, img in enumerate(existing_md_images):
            placeholder = f"__MD_IMG_{i}__"
            temp_placeholders[placeholder] = img
            processed_text = processed_text.replace(img, placeholder, 1)
        
        # 现在处理纯图片URL
        pure_url_pattern = r'(https?://[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^\s]*)?)'
        processed_text = re.sub(pure_url_pattern, r'![图片](\1)', processed_text)
        
        # 恢复原有的Markdown图片
        for placeholder, original_img in temp_placeholders.items():
            processed_text = processed_text.replace(placeholder, original_img)
        
        # 第三步：清理可能的重复格式化
        # 修复可能的嵌套问题
        duplicate_pattern = r'!\[([^\]]*)\]\(!\[[^\]]*\]\(([^\)]+)\)\)'
        while re.search(duplicate_pattern, processed_text):
            processed_text = re.sub(duplicate_pattern, r'![\1](\2)', processed_text)
        
        # 处理行尾空格
        lines = processed_text.split('\n')
        processed_lines = [line.rstrip() for line in lines]
        
        return '\n'.join(processed_lines)
    
    def _format_timestamp(self, timestamp: str) -> str:
        """格式化时间戳"""
        if not timestamp:
            return "未知"
        
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            return dt.strftime('%Y-%m-%d %H:%M:%S')
        except:
            return timestamp


def main():
    """测试函数"""
    generator = MarkdownOutputGenerator()
    
    # 创建测试数据
    test_data = [
        {
            'success': True,
            'question': '设备无法正常开机，如何处理？',
            'data': {
                'output': [{
                    'content': {
                        'text': '设备无法开机时，请检查以下几个方面：\n\n1. **电源连接**\n\n请确认电源线连接正常。\n\n2. **图片示例**\n\n![设备图片](https://example.com/device.png)\n\n这是设备的示意图。'
                    }
                }],
                'usage': {
                    'tokens': {'total_tokens': 150, 'prompt_tokens': 100, 'completion_tokens': 50},
                    'credits': {'total_credits': 0.015}
                }
            },
            'conversation_id': 'conv_001',
            'timestamp': '2024-01-01T12:00:00'
        },
        {
            'success': False,
            'question': '探头邮寄地址是什么？',
            'error': '500 Server Error: Internal Server Error',
            'error_detail': {'code': 50000, 'message': 'Internal Server Error'},
            'timestamp': '2024-01-01T12:01:00'
        }
    ]
    
    # 生成Markdown
    markdown_content = generator.generate_markdown_output(test_data)
    
    # 保存到文件进行测试
    with open('test_output.md', 'w', encoding='utf-8') as f:
        f.write(markdown_content)
    
    print("测试Markdown文件已生成：test_output.md")
    print("前100个字符预览:")
    print(markdown_content[:100] + "...")


if __name__ == "__main__":
    main()
