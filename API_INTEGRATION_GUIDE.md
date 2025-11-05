# API 集成指南

## 重要提示 ⚠️

当前 `api/tests.ts` 中的 `callAgentAPI` 函数使用的是模拟数据。在生产环境中使用前，您需要替换为真实的 AI Agent API 调用。

## 需要修改的文件

### `api/tests.ts` - callAgentAPI 函数

当前实现（第 37-81 行）：

```typescript
// Call Agent API
async function callAgentAPI(apiKey: string, region: string, question: string): Promise<{ 
  success: boolean; 
  response?: string; 
  error?: string; 
  responseTime: number;
}> {
  const startTime = Date.now();
  
  try {
    // TODO: Replace with actual API endpoint based on region
    // This is a placeholder - you need to implement the actual API call
    const endpoint = region === 'SG' 
      ? 'https://api.example.com/sg/chat' 
      : 'https://api.example.com/cn/chat';

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // Mock response for now
    const responseTime = Date.now() - startTime;
    
    // Simulate 80% success rate
    const success = Math.random() > 0.2;
    
    if (success) {
      return {
        success: true,
        response: `模拟回答：${question}`,
        responseTime,
      };
    } else {
      return {
        success: false,
        error: '模拟API错误',
        responseTime,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      responseTime: Date.now() - startTime,
    };
  }
}
```

## 如何替换为真实 API

### 方案 1: 使用 HTTP REST API

```typescript
async function callAgentAPI(apiKey: string, region: string, question: string): Promise<{ 
  success: boolean; 
  response?: string; 
  error?: string; 
  responseTime: number;
}> {
  const startTime = Date.now();
  
  try {
    // 根据region选择正确的API端点
    const endpoint = region === 'SG' 
      ? 'https://your-api-domain.com/sg/v1/chat/completions'
      : 'https://your-api-domain.com/cn/v1/chat/completions';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        // 如果需要其他headers，在此添加
      },
      body: JSON.stringify({
        model: 'your-model-name',
        messages: [
          {
            role: 'user',
            content: question
          }
        ],
        // 其他参数根据您的API需求添加
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `HTTP Error: ${response.status}`,
        responseTime,
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      response: data.choices?.[0]?.message?.content || data.answer || '无响应内容',
      responseTime,
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || '网络请求失败',
      responseTime: Date.now() - startTime,
    };
  }
}
```

### 方案 2: 使用 OpenAI 兼容API

如果您的API兼容 OpenAI 格式：

```typescript
import OpenAI from 'openai';

async function callAgentAPI(apiKey: string, region: string, question: string): Promise<{ 
  success: boolean; 
  response?: string; 
  error?: string; 
  responseTime: number;
}> {
  const startTime = Date.now();
  
  try {
    const baseURL = region === 'SG' 
      ? 'https://your-api-domain.com/sg/v1'
      : 'https://your-api-domain.com/cn/v1';

    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
    });

    const completion = await client.chat.completions.create({
      model: 'your-model-name',
      messages: [
        { role: 'user', content: question }
      ],
    });

    const responseTime = Date.now() - startTime;

    return {
      success: true,
      response: completion.choices[0]?.message?.content || '无响应内容',
      responseTime,
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      responseTime: Date.now() - startTime,
    };
  }
}
```

## 配置步骤

1. **安装依赖（如果使用 OpenAI SDK）**:
   ```bash
   npm install openai
   ```

2. **修改 `api/tests.ts`**:
   - 找到 `callAgentAPI` 函数（第 37-81 行）
   - 用上面的方案1或方案2替换现有代码
   - 根据您的实际API调整endpoint URL和请求参数

3. **测试**:
   - 创建一个测试 Agent（在 Agents 页面）
   - 上传测试集模板
   - 运行测试并查看结果

4. **环境变量（可选）**:
   如果API endpoint需要配置，可以在 `.env` 中添加：
   ```
   SG_API_ENDPOINT=https://your-api-domain.com/sg/v1
   CN_API_ENDPOINT=https://your-api-domain.com/cn/v1
   ```

## 注意事项

- 确保API Key权限正确
- 注意API的速率限制（RPM）
- 处理超时和重试逻辑
- 记录详细的错误信息以便调试
- 考虑添加请求缓存以减少API调用

## 当前Mock行为

当前mock实现会：
- 随机延迟 500-1500ms
- 80% 成功率
- 返回包含原始问题的模拟回答

这有助于测试平台的UI和流程，但不会调用真实的AI服务。

