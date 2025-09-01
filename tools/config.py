"""配置文件"""

# 默认API配置
DEFAULT_ENDPOINT = "cn"  # 默认endpoint
DEFAULT_API_KEY = "app-11pMsg7O1mfafnghacH9WsBq"  # CN节点的API Key

# 不同节点的API Keys
API_KEYS_BY_ENDPOINT = {
    "cn": "app-FzcBZOLzqPkziAWhC57Aq5Bf", # 默认是回波医疗的api
    "sg": "app-Npxjw5HUbYkPvzLgfNVTiBLu",  # 默认是简单点的api
    "th": "app-11pMsg7O1mfafnghacH9WsBq"   # 需要替换为TH节点的API Key
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
EXCEL_FILE_PATH = "data/测试集模板.xlsx"
SHEET_NAME = None  # None表示使用第一个sheet

# 其他配置
REQUEST_TIMEOUT = 60  # 请求超时时间（秒）
DEFAULT_USER_ID = "test_user_001"  # 默认用户ID
