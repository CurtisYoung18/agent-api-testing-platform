"""Agent API 客户端"""

import requests
import json
from typing import Dict, Any, Optional
from tools.config import get_api_base_url, get_headers, get_api_key_for_endpoint, REQUEST_TIMEOUT, DEFAULT_USER_ID, DEFAULT_ENDPOINT, DEFAULT_API_KEY


class AgentAPIClient:
    """Agent API 客户端类"""
    
    def __init__(self, endpoint: str = DEFAULT_ENDPOINT, api_key: str = None):
        self.endpoint = endpoint
        # 如果没有提供api_key，则根据endpoint自动选择
        self.api_key = api_key or get_api_key_for_endpoint(endpoint)
        self.base_url = get_api_base_url(endpoint)
        self.headers = get_headers(self.api_key)
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
        # 输出初始化信息
        print(f"初始化API客户端 - Endpoint: {self.endpoint}, Base URL: {self.base_url}")
        print(f"使用API Key: {self.api_key[:20]}...{self.api_key[-4:]}")  # 只显示部分Key保护隐私
    
    def create_conversation(self, user_id: str = DEFAULT_USER_ID) -> Optional[str]:
        """创建对话
        
        Args:
            user_id: 用户ID
            
        Returns:
            str: 对话ID，如果失败返回None
        """
        url = f"{self.base_url}/v1/conversation"
        payload = {
            "user_id": user_id
        }
        
        try:
            print(f"创建对话，用户ID: {user_id}")
            response = self.session.post(url, json=payload, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            
            result = response.json()
            conversation_id = result.get("conversation_id")
            
            if conversation_id:
                print(f"对话创建成功，ID: {conversation_id}")
                return conversation_id
            else:
                print("对话创建失败：未返回conversation_id")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"创建对话时请求失败: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_detail = e.response.json()
                    print(f"错误详情: {error_detail}")
                except:
                    print(f"响应内容: {e.response.text}")
            return None
        except Exception as e:
            print(f"创建对话时发生意外错误: {str(e)}")
            return None
    
    def send_message(self, conversation_id: str, message: str) -> Dict[str, Any]:
        """发送消息V2
        
        Args:
            conversation_id: 对话ID
            message: 消息内容
            
        Returns:
            Dict: API响应结果
        """
        url = f"{self.base_url}/v2/conversation/message"
        payload = {
            "conversation_id": conversation_id,
            "response_mode": "blocking",  # 阻塞模式，等待完整响应
            "messages": [
                {
                    "role": "user",
                    "content": message
                }
            ]
        }
        
        try:
            print(f"发送消息到对话 {conversation_id}: {message[:50]}...")
            response = self.session.post(url, json=payload, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            
            result = response.json()
            print(f"消息发送成功")
            return {
                "success": True,
                "data": result,
                "question": message
            }
            
        except requests.exceptions.RequestException as e:
            print(f"发送消息时请求失败: {str(e)}")
            error_info = {
                "success": False,
                "error": str(e),
                "question": message
            }
            
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_detail = e.response.json()
                    error_info["error_detail"] = error_detail
                except:
                    error_info["response_text"] = e.response.text
            
            return error_info
            
        except Exception as e:
            print(f"发送消息时发生意外错误: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "question": message
            }
    
    def test_single_question(self, question: str, user_id: str = DEFAULT_USER_ID) -> Dict[str, Any]:
        """测试单个问题
        
        Args:
            question: 问题内容
            user_id: 用户ID
            
        Returns:
            Dict: 测试结果
        """
        # 创建对话
        conversation_id = self.create_conversation(user_id)
        if not conversation_id:
            return {
                "success": False,
                "error": "无法创建对话",
                "question": question
            }
        
        # 发送消息
        result = self.send_message(conversation_id, question)
        result["conversation_id"] = conversation_id
        
        return result


def main():
    """测试函数"""
    client = AgentAPIClient()
    
    # 测试创建对话
    print("=== 测试创建对话 ===")
    conversation_id = client.create_conversation()
    
    if conversation_id:
        print(f"对话创建成功: {conversation_id}")
        
        # 测试发送消息
        print("\n=== 测试发送消息 ===")
        test_message = "你好，这是一个测试消息"
        result = client.send_message(conversation_id, test_message)
        print(f"消息测试结果: {result}")
    else:
        print("对话创建失败")


if __name__ == "__main__":
    main()
