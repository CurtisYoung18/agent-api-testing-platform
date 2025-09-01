"""Agent API 测试主程序"""

import time
import json
from datetime import datetime
from typing import List, Dict, Any
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.excel.excel_reader import ExcelReader
from tools.api.api_client import AgentAPIClient


class AgentTester:
    """Agent测试器"""
    
    def __init__(self, excel_file: str = None):
        self.excel_reader = ExcelReader(excel_file) if excel_file else ExcelReader()
        self.api_client = AgentAPIClient()
        self.test_results = []
    
    def run_tests(self, question_column: str = None, max_questions: int = None, 
                 delay_seconds: float = 1.0) -> List[Dict[str, Any]]:
        """运行测试
        
        Args:
            question_column: 问题列名，None表示自动检测
            max_questions: 最大测试问题数量，None表示测试所有
            delay_seconds: 每个请求之间的延迟时间（秒）
            
        Returns:
            List[Dict]: 测试结果列表
        """
        print("=== Agent API 测试开始 ===")
        print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # 读取问题
        try:
            questions = self.excel_reader.get_questions(question_column)
        except Exception as e:
            print(f"读取Excel文件失败: {str(e)}")
            return []
        
        if not questions:
            print("没有找到任何问题，测试结束")
            return []
        
        # 限制测试数量
        if max_questions and max_questions < len(questions):
            questions = questions[:max_questions]
            print(f"限制测试数量为: {max_questions}")
        
        print(f"开始测试 {len(questions)} 个问题")
        print("-" * 50)
        
        self.test_results = []
        success_count = 0
        
        # 逐个测试问题
        for i, question in enumerate(questions, 1):
            print(f"\\n[{i}/{len(questions)}] 测试问题: {question[:100]}...")
            
            try:
                # 测试单个问题
                result = self.api_client.test_single_question(question)
                
                # 添加测试元数据
                result.update({
                    "test_index": i,
                    "timestamp": datetime.now().isoformat(),
                    "question_preview": question[:100]
                })
                
                self.test_results.append(result)
                
                if result["success"]:
                    success_count += 1
                    print(f"✓ 测试成功")
                else:
                    print(f"✗ 测试失败: {result.get('error', '未知错误')}")
                
                # 延迟，避免请求过于频繁
                if delay_seconds > 0 and i < len(questions):
                    time.sleep(delay_seconds)
                    
            except KeyboardInterrupt:
                print("\\n用户中断测试")
                break
            except Exception as e:
                print(f"✗ 测试异常: {str(e)}")
                error_result = {
                    "success": False,
                    "error": f"测试异常: {str(e)}",
                    "question": question,
                    "test_index": i,
                    "timestamp": datetime.now().isoformat(),
                    "question_preview": question[:100]
                }
                self.test_results.append(error_result)
        
        # 输出测试总结
        print("\\n" + "=" * 50)
        print("=== 测试总结 ===")
        print(f"总测试数量: {len(self.test_results)}")
        print(f"成功数量: {success_count}")
        print(f"失败数量: {len(self.test_results) - success_count}")
        print(f"成功率: {success_count/len(self.test_results)*100:.1f}%" if self.test_results else "0%")
        
        return self.test_results
    
    def save_results(self, filename: str = None) -> str:
        """保存测试结果到文件
        
        Args:
            filename: 文件名，None表示自动生成
            
        Returns:
            str: 保存的文件路径
        """
        if not self.test_results:
            print("没有测试结果可保存")
            return ""
        
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"agent_test_results_{timestamp}.json"
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.test_results, f, ensure_ascii=False, indent=2)
            
            print(f"测试结果已保存到: {filename}")
            return filename
            
        except Exception as e:
            print(f"保存结果失败: {str(e)}")
            return ""
    
    def print_failed_tests(self):
        """打印失败的测试"""
        if not self.test_results:
            print("没有测试结果")
            return
        
        failed_tests = [r for r in self.test_results if not r["success"]]
        
        if not failed_tests:
            print("所有测试都成功了！")
            return
        
        print(f"\\n=== 失败的测试 ({len(failed_tests)} 个) ===")
        for i, result in enumerate(failed_tests, 1):
            print(f"\\n{i}. 问题: {result.get('question_preview', result.get('question', ''))}")
            print(f"   错误: {result.get('error', '未知错误')}")
            if 'error_detail' in result:
                print(f"   详情: {result['error_detail']}")


def main():
    """主函数"""
    print("Agent API 测试工具")
    print("作者: Assistant")
    print("=" * 50)
    
    try:
        # 创建测试器
        tester = AgentTester()
        
        # 运行测试 (先测试前3个问题，避免一开始就发送大量请求)
        results = tester.run_tests(max_questions=3, delay_seconds=2.0)
        
        if results:
            # 保存结果
            tester.save_results()
            
            # 显示失败的测试
            tester.print_failed_tests()
            
            print("\\n提示: 如需测试更多问题，请修改 max_questions 参数")
            
    except Exception as e:
        print(f"程序运行出错: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
