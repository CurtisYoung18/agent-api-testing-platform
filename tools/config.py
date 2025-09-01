"""配置文件"""

import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 默认API配置（从环境变量读取，提供默认值作为备用）
DEFAULT_ENDPOINT = os.getenv("DEFAULT_ENDPOINT", "cn")
DEFAULT_API_KEY = os.getenv("API_KEY_TH", "")  # 使用TH作为默认备用

# 不同节点的API Keys（从环境变量读取）
API_KEYS_BY_ENDPOINT = {
    "cn": os.getenv("API_KEY_CN", ""),  # 回波医疗
    "sg": os.getenv("API_KEY_SG", ""),  # 简单点
    "th": os.getenv("API_KEY_TH", "")   # 泰国节点
}

API_NAME_BY_ENDPOINT = {
    "cn": "回波医疗",
    "sg": "简单点",
    "th": "泰国"
}

# API地址格式化函数
def get_api_base_url(endpoint: str = DEFAULT_ENDPOINT) -> str:
    """根据endpoint生成API base URL"""
    endpoint_mapping = {
        "cn": "https://api.gptbots.cn",        # 中国
        "sg": "https://api-sg.gptbots.ai",     # 新加坡  
        "th": "https://api-th.gptbots.ai"      # 泰国
    }

    
    return endpoint_mapping.get(endpoint, f"https://api-{endpoint}.gptbots.ai")

# 获取指定endpoint的API Key
def get_api_key_for_endpoint(endpoint: str = DEFAULT_ENDPOINT) -> str:
    """根据endpoint获取对应的API Key"""
    return API_KEYS_BY_ENDPOINT.get(endpoint, DEFAULT_API_KEY)

# 请求头配置函数
def get_headers(api_key: str) -> dict:
    """根据API key生成请求头"""
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

# Excel 文件配置
EXCEL_FILE_PATH = os.getenv("EXCEL_FILE_PATH", "data/测试集模板.xlsx")
SHEET_NAME = None  # None表示使用第一个sheet

# 其他配置
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "60"))  # 请求超时时间（秒）
DEFAULT_USER_ID = os.getenv("DEFAULT_USER_ID", "test_user_001")  # 默认用户ID
