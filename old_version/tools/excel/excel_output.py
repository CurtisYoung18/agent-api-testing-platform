"""Excel输出模块"""

import pandas as pd
import io
from typing import List, Dict, Any
from datetime import datetime


class ExcelOutputGenerator:
    """Excel输出生成器"""
    
    def __init__(self):
        pass
    
    def generate_excel_output(self, test_results: List[Dict[str, Any]]) -> io.BytesIO:
        """生成Excel输出文件
        
        Args:
            test_results: 测试结果列表
            
        Returns:
            io.BytesIO: Excel文件的二进制流
        """
        if not test_results:
            # 创建空的DataFrame
            df = pd.DataFrame(columns=['序号', '问题', 'Agent回复', '参考答案', '测试状态', '错误信息', '测试时间', '对话ID', '消息ID'])
        else:
            # 处理测试结果数据
            output_data = []
            
            for i, result in enumerate(test_results, 1):
                # 提取基本信息
                question = result.get('question', '')
                success = result.get('success', False)
                timestamp = result.get('timestamp', '')
                error_msg = result.get('error', '') if not success else ''
                
                # 提取Agent回复内容
                agent_reply = ''
                if success and 'data' in result:
                    data = result['data']
                    if 'output' in data and data['output']:
                        # 提取第一个输出的文本内容
                        first_output = data['output'][0]
                        if 'content' in first_output and 'text' in first_output['content']:
                            agent_reply = first_output['content']['text']
                
                # 格式化时间
                formatted_time = ''
                if timestamp:
                    try:
                        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        formatted_time = dt.strftime('%Y-%m-%d %H:%M:%S')
                    except:
                        formatted_time = timestamp
                
                # 获取参考答案
                reference_output = result.get('reference_output', '')
                
                output_data.append({
                    '序号': i,
                    '问题': question,
                    'Agent回复': agent_reply,
                    '参考答案': reference_output,
                    '测试状态': '成功' if success else '失败',
                    '错误信息': error_msg,
                    '测试时间': formatted_time,
                    '对话ID': result.get('conversation_id', ''),
                    '消息ID': result.get('data', {}).get('message_id', '') if success else ''
                })
            
            df = pd.DataFrame(output_data)
        
        # 创建Excel文件
        buffer = io.BytesIO()
        
        with pd.ExcelWriter(buffer, engine='xlsxwriter') as writer:
            # 写入主要结果数据
            df.to_excel(writer, sheet_name='测试结果', index=False)
            
            # 创建统计汇总表
            if test_results:
                summary_data = self._generate_summary(test_results)
                summary_df = pd.DataFrame(summary_data)
                summary_df.to_excel(writer, sheet_name='统计汇总', index=False)
            
            # 获取工作簿和工作表
            workbook = writer.book
            worksheet = writer.sheets['测试结果']
            
            # 设置列宽
            worksheet.set_column('A:A', 8)   # 序号
            worksheet.set_column('B:B', 30)  # 问题
            worksheet.set_column('C:C', 50)  # Agent回复
            worksheet.set_column('D:D', 50)  # 参考答案
            worksheet.set_column('E:E', 10)  # 测试状态
            worksheet.set_column('F:F', 30)  # 错误信息
            worksheet.set_column('G:G', 20)  # 测试时间
            worksheet.set_column('H:H', 25)  # 对话ID
            worksheet.set_column('I:I', 25)  # 消息ID
            
            # 设置格式
            header_format = workbook.add_format({
                'bold': True,
                'bg_color': '#4CAF50',
                'font_color': 'white',
                'border': 1
            })
            
            success_format = workbook.add_format({
                'bg_color': '#E8F5E8',
                'border': 1
            })
            
            error_format = workbook.add_format({
                'bg_color': '#FFEBEE',
                'border': 1
            })
            
            # 应用格式到标题行
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
            
            # 应用格式到数据行
            for row_num in range(1, len(df) + 1):
                # 获取测试状态来决定格式
                status = df.iloc[row_num-1]['测试状态'] if len(df) > 0 and '测试状态' in df.columns else ''
                row_format = success_format if status == '成功' else error_format
                
                for col_num in range(len(df.columns)):
                    cell_value = df.iloc[row_num-1, col_num] if len(df) > 0 else ''
                    worksheet.write(row_num, col_num, cell_value, row_format)
        
        buffer.seek(0)
        return buffer
    
    def _generate_summary(self, test_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """生成统计汇总数据
        
        Args:
            test_results: 测试结果列表
            
        Returns:
            List[Dict]: 统计汇总数据
        """
        total_tests = len(test_results)
        success_tests = len([r for r in test_results if r.get('success', False)])
        failed_tests = total_tests - success_tests
        success_rate = (success_tests / total_tests * 100) if total_tests > 0 else 0
        
        # 计算token使用情况
        total_tokens = 0
        total_cost = 0.0
        
        for result in test_results:
            if result.get('success', False) and 'data' in result:
                usage = result['data'].get('usage', {})
                if 'tokens' in usage:
                    total_tokens += usage['tokens'].get('total_tokens', 0)
                if 'credits' in usage:
                    total_cost += usage['credits'].get('total_credits', 0.0)
        
        # 测试时间统计
        start_time = min([r.get('timestamp', '') for r in test_results]) if test_results else ''
        end_time = max([r.get('timestamp', '') for r in test_results]) if test_results else ''
        
        summary_data = [
            {'统计项': '总测试数量', '值': total_tests},
            {'统计项': '成功数量', '值': success_tests},
            {'统计项': '失败数量', '值': failed_tests},
            {'统计项': '成功率(%)', '值': f'{success_rate:.1f}%'},
            {'统计项': '总Token消耗', '值': total_tokens},
            {'统计项': '总成本', '值': f'{total_cost:.4f}'},
            {'统计项': '开始时间', '值': start_time},
            {'统计项': '结束时间', '值': end_time}
        ]
        
        return summary_data


def main():
    """测试函数"""
    generator = ExcelOutputGenerator()
    
    # 创建测试数据
    test_data = [
        {
            'success': True,
            'question': '测试问题1',
            'data': {
                'output': [{'content': {'text': '这是测试回复1'}}],
                'message_id': 'msg_001',
                'usage': {'tokens': {'total_tokens': 100}},
                'credits': {'total_credits': 0.01}
            },
            'conversation_id': 'conv_001',
            'timestamp': '2024-01-01T12:00:00'
        },
        {
            'success': False,
            'question': '测试问题2',
            'error': '测试错误信息',
            'timestamp': '2024-01-01T12:01:00'
        }
    ]
    
    # 生成Excel文件
    excel_buffer = generator.generate_excel_output(test_data)
    
    # 保存到文件进行测试
    with open('test_output.xlsx', 'wb') as f:
        f.write(excel_buffer.getvalue())
    
    print("测试Excel文件已生成：test_output.xlsx")


if __name__ == "__main__":
    main()
