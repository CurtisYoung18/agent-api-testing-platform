"""Excel文件读取模块"""

import pandas as pd
from typing import List, Dict, Any
import os
from tools.config import EXCEL_FILE_PATH, SHEET_NAME


class ExcelReader:
    """Excel文件读取类"""
    
    def __init__(self, file_path: str = EXCEL_FILE_PATH, sheet_name: str = SHEET_NAME):
        self.file_path = file_path
        self.sheet_name = sheet_name
        self._validate_file()
    
    def _validate_file(self):
        """验证文件是否存在"""
        if not os.path.exists(self.file_path):
            raise FileNotFoundError(f"Excel文件不存在: {self.file_path}")
    
    def read_test_data(self) -> List[Dict[str, Any]]:
        """读取测试数据
        
        Returns:
            List[Dict]: 测试数据列表，每个字典包含一行数据
        """
        try:
            # 读取Excel文件
            data = pd.read_excel(self.file_path, sheet_name=self.sheet_name)
            
            # 如果读取结果是字典（多个sheet），取第一个
            if isinstance(data, dict):
                sheet_names = list(data.keys())
                print(f"发现多个工作表: {sheet_names}")
                df = data[sheet_names[0]]
                print(f"使用工作表: {sheet_names[0]}")
            else:
                df = data
            
            # 打印基本信息
            print(f"成功读取Excel文件: {self.file_path}")
            print(f"数据行数: {len(df)}")
            print(f"列名: {list(df.columns)}")
            
            # 将DataFrame转换为字典列表
            test_data = df.to_dict('records')
            
            # 过滤掉空行
            test_data = [row for row in test_data if any(pd.notna(val) for val in row.values())]
            
            print(f"有效数据行数: {len(test_data)}")
            
            return test_data
            
        except Exception as e:
            print(f"读取Excel文件时出错: {str(e)}")
            raise
    
    def get_questions(self, question_column: str = None) -> List[str]:
        """获取问题列表
        
        Args:
            question_column: 问题所在的列名，如果为None则自动检测
            
        Returns:
            List[str]: 问题列表
        """
        test_data = self.read_test_data()
        
        if not test_data:
            return []
        
        # 如果没有指定列名，尝试自动检测
        if question_column is None:
            # 常见的问题列名
            possible_columns = ['问题', 'question', 'Query', 'query', '测试问题', 'test_question']
            columns = list(test_data[0].keys())
            
            for col in possible_columns:
                if col in columns:
                    question_column = col
                    break
            
            # 如果还是没找到，使用第一列
            if question_column is None:
                question_column = columns[0]
        
        print(f"使用列 '{question_column}' 作为问题列")
        
        # 提取问题
        questions = []
        for row in test_data:
            question = row.get(question_column)
            if pd.notna(question) and str(question).strip():
                questions.append(str(question).strip())
        
        return questions


def main():
    """测试函数"""
    try:
        reader = ExcelReader()
        questions = reader.get_questions()
        
        print(f"\n找到 {len(questions)} 个问题:")
        for i, question in enumerate(questions[:5], 1):  # 只显示前5个
            print(f"{i}. {question}")
        
        if len(questions) > 5:
            print(f"... 还有 {len(questions) - 5} 个问题")
            
    except Exception as e:
        print(f"测试失败: {str(e)}")


if __name__ == "__main__":
    main()
