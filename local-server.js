import express from 'express';
import cors from 'cors';
import multer from 'multer';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// File upload config
const upload = multer({ dest: '/tmp/uploads/' });

// Local data file path
const LOCAL_DATA_FILE = path.join(__dirname, 'local-data.json');

// Load data from local-data.json
function loadLocalData() {
  try {
    if (fs.existsSync(LOCAL_DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(LOCAL_DATA_FILE, 'utf-8'));
      return {
        agents: data.agents.map(a => ({
          ...a,
          created_at: a.created_at || new Date().toISOString(),
          updated_at: a.updated_at || new Date().toISOString(),
        })),
        nextId: data.nextId || (Math.max(...data.agents.map(a => a.id)) + 1)
      };
    }
  } catch (err) {
    console.error('Failed to load local-data.json:', err.message);
  }
  // Default data if file doesn't exist
  return {
    agents: [],
    nextId: 1
  };
}

// Save data to local-data.json
function saveLocalData() {
  try {
    const data = {
      agents: agents.map(({ created_at, updated_at, ...rest }) => rest),
      nextId
    };
    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to save local-data.json:', err.message);
  }
}

// Initialize data from file
const localData = loadLocalData();
const agents = localData.agents;
let nextId = localData.nextId;

// Helper function to get base URL
function getBaseUrl(region, customBaseUrl) {
  if (region === 'CUSTOM' && customBaseUrl) {
    return customBaseUrl;
  }
  if (region === 'SG') return 'https://api-sg.gptbots.ai';
  if (region === 'TH') return 'https://api-th.gptbots.ai';
  return 'https://api.gptbots.cn';
}

// GET /api/agents - 获取所有 agents
app.get('/api/agents', (req, res) => {
  const result = agents.map(agent => ({
    id: agent.id,
    name: agent.name,
    modelName: agent.model_name,
    region: agent.region,
    apiKey: agent.api_key,
    customBaseUrl: agent.custom_base_url,
    isEvaluator: agent.is_evaluator || false,
    status: agent.status,
    lastUsed: agent.last_used,
    createdAt: agent.created_at,
    updatedAt: agent.updated_at,
  }));
  res.json(result);
});

// POST /api/agents - 创建 agent
app.post('/api/agents', (req, res) => {
  const { name, modelName, region, apiKey, customBaseUrl, isEvaluator } = req.body;
  const newAgent = {
    id: nextId++,
    name,
    model_name: modelName || null,
    region,
    api_key: apiKey,
    custom_base_url: customBaseUrl || null,
    is_evaluator: isEvaluator || false,
    status: 'active',
    last_used: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  agents.push(newAgent);
  saveLocalData();
  res.status(201).json({
    id: newAgent.id,
    name: newAgent.name,
    modelName: newAgent.model_name,
    region: newAgent.region,
    apiKey: newAgent.api_key,
    customBaseUrl: newAgent.custom_base_url,
    isEvaluator: newAgent.is_evaluator || false,
    status: newAgent.status,
    createdAt: newAgent.created_at,
    updatedAt: newAgent.updated_at,
  });
});

// GET /api/agents/:id - 获取单个 agent
app.get('/api/agents/:id', (req, res) => {
  const agent = agents.find(a => a.id === parseInt(req.params.id));
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json({
    id: agent.id,
    name: agent.name,
    modelName: agent.model_name,
    region: agent.region,
    apiKey: agent.api_key,
    customBaseUrl: agent.custom_base_url,
    isEvaluator: agent.is_evaluator || false,
    status: agent.status,
    lastUsed: agent.last_used,
    createdAt: agent.created_at,
    updatedAt: agent.updated_at,
  });
});

// PUT /api/agents/:id - 更新 agent
app.put('/api/agents/:id', (req, res) => {
  const agent = agents.find(a => a.id === parseInt(req.params.id));
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  const { name, modelName, region, apiKey, customBaseUrl, isEvaluator, status } = req.body;
  if (name) agent.name = name;
  if (modelName !== undefined) agent.model_name = modelName || null;
  if (region) agent.region = region;
  if (apiKey) agent.api_key = apiKey;
  if (customBaseUrl !== undefined) agent.custom_base_url = customBaseUrl || null;
  if (isEvaluator !== undefined) agent.is_evaluator = !!isEvaluator;
  if (status) agent.status = status;
  agent.updated_at = new Date().toISOString();
  saveLocalData();
  res.json({
    id: agent.id,
    name: agent.name,
    modelName: agent.model_name,
    region: agent.region,
    apiKey: agent.api_key,
    customBaseUrl: agent.custom_base_url,
    isEvaluator: agent.is_evaluator || false,
    status: agent.status,
    lastUsed: agent.last_used,
    createdAt: agent.created_at,
    updatedAt: agent.updated_at,
  });
});

// DELETE /api/agents/:id - 删除 agent
app.delete('/api/agents/:id', (req, res) => {
  const index = agents.findIndex(a => a.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  agents.splice(index, 1);
  saveLocalData(); // 持久化保存
  res.status(204).send();
});

// POST /api/proxy - 代理请求
app.post('/api/proxy', async (req, res) => {
  try {
    const { agentId, endpoint, method, body, queryParams, streaming } = req.body;

    if (!agentId || !endpoint) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const agent = agents.find(a => a.id === parseInt(agentId));
    if (!agent) {
      return res.status(404).json({ error: 'Agent 不存在' });
    }

    const baseUrl = getBaseUrl(agent.region, agent.custom_base_url);
    
    // Build URL with query params
    let url = `${baseUrl}${endpoint}`;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      url += `?${params.toString()}`;
    }

    console.log('[proxy] Request:', { url, method: method || 'POST', hasBody: !!body });

    const requestMethod = method || 'POST';
    const requestOptions = {
      method: requestMethod,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${agent.api_key}`,
      },
    };

    if (body && (requestMethod === 'POST' || requestMethod === 'PUT' || requestMethod === 'DELETE')) {
      requestOptions.body = JSON.stringify(body);
    }

    // Handle streaming response
    if (streaming) {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          error: errorData.message || `请求失败 (${response.status})`,
          code: errorData.code,
        });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      } catch (streamError) {
        console.error('[proxy] Stream error:', streamError);
        res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
        res.end();
      }
      return;
    }

    // Non-streaming response
    const response = await fetch(url, requestOptions);
    const responseData = await response.json().catch(() => ({}));

    console.log('[proxy] Response status:', response.status, responseData);

    if (!response.ok) {
      return res.status(response.status).json({
        error: responseData.message || `请求失败 (${response.status})`,
        code: responseData.code,
        details: responseData,
      });
    }

    return res.json({
      success: true,
      data: responseData,
    });

  } catch (error) {
    console.error('[proxy] Error:', error.message);
    return res.status(500).json({
      error: error.message || '服务器错误',
    });
  }
});

// POST /api/custom-proxy - 自定义 API 代理 (解决 CORS 问题)
app.post('/api/custom-proxy', async (req, res) => {
  const { url, method, headers, body } = req.body;

  if (!url) {
    return res.status(400).json({ error: '请提供请求 URL' });
  }

  console.log('[custom-proxy] Request:', { 
    url, 
    method, 
    headers: headers ? JSON.stringify(headers) : 'none',
    bodyType: typeof body,
    body: body ? (typeof body === 'string' ? body.substring(0, 200) : JSON.stringify(body).substring(0, 200)) : 'none'
  });

  try {
    const requestOptions = {
      method: method || 'GET',
      headers: headers || {},
    };

    // 处理 body - 如果是字符串形式的 JSON，尝试解析后重新序列化确保格式正确
    if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      if (typeof body === 'string') {
        // 尝试解析 JSON 字符串，确保格式正确
        try {
          const parsedBody = JSON.parse(body);
          requestOptions.body = JSON.stringify(parsedBody);
        } catch {
          // 如果解析失败，直接使用原字符串
          requestOptions.body = body;
        }
      } else {
        requestOptions.body = JSON.stringify(body);
      }
    }
    
    console.log('[custom-proxy] Sending body:', requestOptions.body);

    const startTime = Date.now();
    const response = await fetch(url, requestOptions);
    const endTime = Date.now();

    // Get response as text first
    const responseText = await response.text();
    let responseData;

    // Try to parse as JSON
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { _rawText: responseText };
    }

    console.log('[custom-proxy] Response:', response.status, response.statusText);

    // Return response with metadata
    return res.status(response.status).json({
      _meta: {
        status: response.status,
        statusText: response.statusText,
        duration: `${endTime - startTime}ms`,
        headers: Object.fromEntries(response.headers.entries()),
      },
      ...responseData,
    });
  } catch (error) {
    console.error('[custom-proxy] Error:', error.message);
    return res.status(500).json({
      error: error.message || '请求失败',
      _meta: { status: 500, statusText: 'Proxy Error' },
    });
  }
});

// Test storage
const testResults = new Map();
let testIdCounter = 1;

// Test history storage (模拟数据库)
const testHistory = [];
let historyIdCounter = 1;

// Generate Markdown report
function generateMarkdownReport(data) {
  let markdown = `# Agent API 测试报告\n\n`;
  markdown += `**Agent名称**: ${data.agentName}\n`;
  markdown += `**测试时间**: ${data.testDate}\n`;
  markdown += `**执行模式**: ${data.executionMode === 'parallel' ? '并行' : '串行'}\n`;
  if (data.executionMode === 'parallel') {
    markdown += `**并发数**: ${data.maxConcurrency || 2}\n`;
  } else {
    markdown += `**请求间隔**: ${data.requestDelay || 0}ms\n`;
  }
  if (data.retriedCount > 0) {
    markdown += `**重试问题数**: ${data.retriedCount}\n`;
  }
  markdown += `\n`;

  markdown += `## 测试汇总\n\n`;
  markdown += `| 指标 | 值 |\n`;
  markdown += `|------|----|\n`;
  markdown += `| 总问题数 | ${data.totalQuestions} |\n`;
  markdown += `| 成功数 | ${data.passedCount} |\n`;
  markdown += `| 失败数 | ${data.failedCount} |\n`;
  markdown += `| 成功率 | ${data.successRate}% |\n`;
  markdown += `| 平均响应时间 | ${((data.avgResponseTime || 0) / 1000).toFixed(2)}s |\n`;
  markdown += `| 总耗时 | ${data.durationSeconds}s |\n`;
  markdown += `| Token消耗 | ${data.totalTokens || 0} |\n`;
  markdown += `| 积分消耗 | ${(data.totalCost || 0).toFixed(4)} |\n`;
  markdown += `| 总成本(USD) | $${((data.totalCost || 0) / 100).toFixed(4)} |\n`;
  markdown += `| *换算* | *100积分=1美元 (GPTBots)* |\n`;
  if (data.retriedCount > 0) {
    markdown += `| 重试成功数 | ${data.retriedCount} |\n`;
  }
  if (data.evaluation) {
    markdown += `| 评估模型 | ${data.evaluation.evaluatorAgentName} |\n`;
    if (data.evaluation.avgScore) markdown += `| 平均评分 | ${data.evaluation.avgScore} |\n`;
  }
  markdown += `\n`;

  markdown += `## 详细结果\n\n`;
  data.results.forEach((r, index) => {
    const retryBadge = r.retryCount > 0 ? ` 🔄 (重试${r.retryCount}次后成功)` : '';
    markdown += `### 问题 ${index + 1}${retryBadge}\n\n`;
    markdown += `**问题**: ${r.question}\n\n`;
    if (r.referenceOutput) {
      markdown += `**参考答案**: ${r.referenceOutput}\n\n`;
    }
    markdown += `**实际输出**: ${r.response || r.error}\n\n`;
    if (r.evaluation) {
      markdown += `**AI评估**:\n\n${r.evaluation.evalText || r.evaluation.analysis || ''}\n\n`;
    }
    markdown += `**响应时间**: ${((r.responseTime || 0) / 1000).toFixed(2)}s\n\n`;
    if (r.tokens) {
      markdown += `**Token消耗**: ${r.tokens}\n\n`;
    }
    if (r.cost != null) {
      markdown += `**积分**: ${r.cost.toFixed(4)}\n\n`;
    }
    markdown += `---\n\n`;
  });

  return markdown;
}

// Generate Markdown report (English)
function generateMarkdownReportEn(data) {
  let markdown = `# Agent API Test Report\n\n`;
  markdown += `**Agent Name**: ${data.agentName}\n`;
  markdown += `**Test Date**: ${data.testDate}\n`;
  markdown += `**Execution Mode**: ${data.executionMode === 'parallel' ? 'Parallel' : 'Sequential'}\n`;
  if (data.executionMode === 'parallel') {
    markdown += `**Concurrency**: ${data.maxConcurrency || 2}\n`;
  } else {
    markdown += `**Request Interval**: ${data.requestDelay || 0}ms\n`;
  }
  if (data.retriedCount > 0) {
    markdown += `**Retried Questions**: ${data.retriedCount}\n`;
  }
  markdown += `\n`;

  markdown += `## Summary\n\n`;
  markdown += `| Metric | Value |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Total Questions | ${data.totalQuestions} |\n`;
  markdown += `| Passed | ${data.passedCount} |\n`;
  markdown += `| Failed | ${data.failedCount} |\n`;
  markdown += `| Success Rate | ${data.successRate}% |\n`;
  markdown += `| Avg Response Time | ${((data.avgResponseTime || 0) / 1000).toFixed(2)}s |\n`;
  markdown += `| Duration | ${data.durationSeconds}s |\n`;
  markdown += `| Token Usage | ${data.totalTokens || 0} |\n`;
  markdown += `| Credits | ${(data.totalCost || 0).toFixed(4)} |\n`;
  markdown += `| Total USD Cost | $${((data.totalCost || 0) / 100).toFixed(4)} |\n`;
  markdown += `| *Conversion* | *100 credits = 1 USD (GPTBots)* |\n`;
  if (data.retriedCount > 0) {
    markdown += `| Retried & Passed | ${data.retriedCount} |\n`;
  }
  if (data.evaluation) {
    markdown += `| Evaluator | ${data.evaluation.evaluatorAgentName} |\n`;
    if (data.evaluation.avgScore) markdown += `| Avg Score | ${data.evaluation.avgScore} |\n`;
  }
  markdown += `\n`;

  markdown += `## Detailed Results\n\n`;
  data.results.forEach((r, index) => {
    const retryBadge = r.retryCount > 0 ? ` 🔄 (Passed after ${r.retryCount} retries)` : '';
    markdown += `### Question ${index + 1}${retryBadge}\n\n`;
    markdown += `**Question**: ${r.question}\n\n`;
    if (r.referenceOutput) {
      markdown += `**Reference Answer**: ${r.referenceOutput}\n\n`;
    }
    markdown += `**Actual Output**: ${r.response || r.error}\n\n`;
    if (r.evaluation) {
      markdown += `**AI Evaluation**:\n\n${r.evaluation.evalText || r.evaluation.analysis || ''}\n\n`;
    }
    markdown += `**Response Time**: ${((r.responseTime || 0) / 1000).toFixed(2)}s\n\n`;
    if (r.tokens) {
      markdown += `**Token Usage**: ${r.tokens}\n\n`;
    }
    if (r.cost != null) {
      markdown += `**Credits**: ${r.cost.toFixed(4)}\n\n`;
    }
    markdown += `---\n\n`;
  });

  return markdown;
}

// Generate Excel report
function generateExcelReport(data) {
  const rows = data.results.map((r, index) => {
    const row = {
      '序号': index + 1,
      '问题': r.question,
      '参考答案': r.referenceOutput || '',
      '实际输出': r.response || r.error,
      '状态': r.success ? '成功' : '失败',
      '重试次数': r.retryCount || 0,
      '响应时间(ms)': r.responseTime,
      'Token消耗': r.tokens || 0,
      '成本': r.cost || 0,
      '时间戳': r.timestamp || new Date().toISOString(),
    };
    if (r.evaluation) {
      row['AI评估'] = r.evaluation.evalText || r.evaluation.analysis || '';
    }
    return row;
  });

  const summaryRow = {
    '序号': '汇总',
    '问题': `Agent: ${data.agentName}`,
    '参考答案': `总问题数: ${data.totalQuestions}`,
    '实际输出': `成功: ${data.passedCount}, 失败: ${data.failedCount}`,
    '状态': `成功率: ${data.successRate}%`,
    '响应时间(ms)': `平均: ${data.avgResponseTime}ms`,
    'Token消耗': data.totalTokens || 0,
    '积分': (data.totalCost || 0).toFixed(4),
    '时间戳': data.testDate,
  };
  if (data.evaluation) {
    summaryRow['AI评估'] = `评估模型: ${data.evaluation.evaluatorAgentName}`;
  }

  rows.unshift(summaryRow);

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '测试报告');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// Save test to history
function saveTestToHistory(testData) {
  const historyEntry = {
    id: historyIdCounter++,
    agentId: testData.agentId,
    agentName: testData.agentName,
    totalQuestions: testData.totalQuestions,
    passedCount: testData.passedCount,
    failedCount: testData.failedCount,
    successRate: testData.successRate,
    durationSeconds: testData.durationSeconds,
    avgResponseTime: testData.avgResponseTime,
    executionMode: testData.executionMode,
    rpm: testData.rpm,
    totalTokens: testData.totalTokens || 0,
    totalCost: testData.totalCost || 0,
    testDate: testData.testDate,
    createdAt: new Date().toISOString(),
    evaluation: testData.evaluation || undefined,
    results: testData.results,
    markdownReport: generateMarkdownReport(testData),
    markdownReportEn: generateMarkdownReportEn(testData),
    excelReport: generateExcelReport(testData),
  };
  
  testHistory.unshift(historyEntry); // Add to beginning
  console.log(`[history] Saved test #${historyEntry.id} to history`);
  return historyEntry;
}

// Helper: Parse Excel file
function parseExcelFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet);

  const questions = [];
  const referenceOutputs = [];
  
  for (const row of data) {
    const input = row.input || row.Input || row.INPUT;
    if (input && typeof input === 'string' && input.trim()) {
      questions.push(input.trim());
      const refOutput = row.reference_output || row.Reference_Output || row.REFERENCE_OUTPUT || '';
      referenceOutputs.push(typeof refOutput === 'string' ? refOutput.trim() : '');
    }
  }

  return { questions, referenceOutputs };
}

// Helper: Create fetch with timeout
async function fetchWithTimeout(url, options, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`请求超时 (${timeoutMs / 1000}秒)`);
    }
    throw error;
  }
}

// Helper: Call Agent API
async function callAgentAPI(apiKey, region, question, customBaseUrl, customUserId, timeoutMs = 60000) {
  const startTime = Date.now();
  
  try {
    const baseUrl = getBaseUrl(region, customBaseUrl);
    
    // Use custom user_id if provided, otherwise generate default
    const userId = customUserId || ('test_user_' + Date.now());

    // Step 1: Create conversation (10s timeout for this quick step)
    const conversationResponse = await fetchWithTimeout(`${baseUrl}/v1/conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ user_id: userId }),
    }, 10000);

    if (!conversationResponse.ok) {
      const errorData = await conversationResponse.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `创建对话失败 (${conversationResponse.status})`,
        responseTime: Date.now() - startTime,
      };
    }

    const conversationData = await conversationResponse.json();
    const conversationId = conversationData.conversation_id;

    // Step 2: Send message (use full timeout for AI response)
    const messageResponse = await fetchWithTimeout(`${baseUrl}/v2/conversation/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        response_mode: 'blocking',
        messages: [{ role: 'user', content: [{ type: 'text', text: question }] }],
      }),
    }, timeoutMs);

    const responseTime = Date.now() - startTime;

    if (!messageResponse.ok) {
      const errorData = await messageResponse.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `发送消息失败 (${messageResponse.status})`,
        responseTime,
        conversationId,
      };
    }

    const messageData = await messageResponse.json();
    
    let responseText = '';
    if (messageData.output && Array.isArray(messageData.output)) {
      responseText = messageData.output
        .map(o => o.content?.text || '')
        .filter(t => t)
        .join('\n');
    }

    return {
      success: true,
      response: responseText,
      responseTime,
      conversationId,
      messageId: messageData.message_id,
      usage: messageData.usage,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || '网络错误',
      responseTime: Date.now() - startTime,
    };
  }
}

// POST /api/tests - 开始测试 (支持 SSE 流式)
app.post('/api/tests', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { agentId, executionMode, userId, maxConcurrency, requestDelay, requestTimeout } = req.body;
    const wantsStream = req.query.stream === 'true';
    const timeoutMs = parseInt(requestTimeout) || 60000;

    console.log('[tests] Request:', { 
      agentId, 
      executionMode, 
      ...(executionMode === 'parallel' 
        ? { maxConcurrency: maxConcurrency || 2 } 
        : { requestDelay: `${requestDelay || 0}ms` }),
      timeout: `${timeoutMs / 1000}s`,
      userId: userId || '(auto)', 
      wantsStream, 
      hasFile: !!file 
    });

    if (!file || !agentId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const agent = agents.find(a => a.id === parseInt(agentId));
    if (!agent) {
      return res.status(404).json({ error: 'Agent 不存在' });
    }

    // Parse Excel
    const { questions, referenceOutputs } = parseExcelFile(file.path);
    
    // Clean up file
    fs.unlinkSync(file.path);

    if (questions.length === 0) {
      return res.status(400).json({ error: '测试文件中没有有效的测试问题' });
    }

    console.log(`[tests] Parsed ${questions.length} questions`);

    // If streaming requested, set up SSE
    if (wantsStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      
      // Send initial connection event
      const isParallel = executionMode === 'parallel';
      res.write(`data: ${JSON.stringify({ type: 'connected', totalQuestions: questions.length, mode: isParallel ? 'parallel' : 'sequential' })}\n\n`);

      const startTime = Date.now();
      const results = [];
      let totalTokens = 0;
      let totalCost = 0;
      let completedCount = 0;

      // Helper function to process a single question
      const processQuestion = async (i) => {
        const question = questions[i];
        const refOutput = referenceOutputs[i] || '';

        console.log(`[tests] Running question ${i + 1}/${questions.length}: ${question.slice(0, 50)}...`);

        const result = await callAgentAPI(
          agent.api_key,
          agent.region,
          question,
          agent.custom_base_url,
          userId,
          timeoutMs
        );

        // Extract token/cost info
        let questionTokens = 0;
        let questionCost = 0;
        if (result.success && result.usage) {
          if (result.usage.tokens) {
            questionTokens = result.usage.tokens.total_tokens || 0;
          }
          if (result.usage.credits) {
            questionCost = result.usage.credits.total_credits || 0;
          }
        }

        return {
          type: 'result',
          questionIndex: i,
          question,
          referenceOutput: refOutput,
          response: result.response || '',
          success: result.success,
          error: result.error,
          responseTime: result.responseTime,
          conversationId: result.conversationId,
          messageId: result.messageId,
          tokens: questionTokens,
          cost: questionCost,
          timestamp: new Date().toISOString(),
        };
      };

      if (isParallel) {
        // Parallel execution: run multiple requests concurrently
        const concurrency = parseInt(maxConcurrency) || 2; // default to 2 if not specified
        console.log(`[tests] Parallel mode: concurrency=${concurrency}`);

        // Process in batches with concurrency control
        for (let batchStart = 0; batchStart < questions.length; batchStart += concurrency) {
          const batchEnd = Math.min(batchStart + concurrency, questions.length);
          const batchIndices = [];
          for (let i = batchStart; i < batchEnd; i++) {
            batchIndices.push(i);
          }

          // Send progress event
          res.write(`data: ${JSON.stringify({ 
            type: 'progress', 
            current: batchStart + 1,
            batchSize: batchIndices.length,
            message: `并行执行 ${batchIndices.length} 个请求...`
          })}\n\n`);

          // Execute batch in parallel
          const batchResults = await Promise.all(batchIndices.map(i => processQuestion(i)));

          // Process and send results
          for (const resultData of batchResults) {
            results.push(resultData);
            totalTokens += resultData.tokens || 0;
            totalCost += resultData.cost || 0;
            completedCount++;

            // Send result event
            res.write(`data: ${JSON.stringify(resultData)}\n\n`);
          }

          // Rate limiting between batches (wait 1 second to respect RPM)
          if (batchEnd < questions.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } else {
        // Sequential execution: one request at a time with delay after each response
        const delay = parseInt(requestDelay) || 0;
        console.log(`[tests] Sequential mode: delay=${delay}ms`);

        for (let i = 0; i < questions.length; i++) {
          // Send progress event
          res.write(`data: ${JSON.stringify({ 
            type: 'progress', 
            current: i + 1, 
            question: questions[i].slice(0, 100) 
          })}\n\n`);

          const resultData = await processQuestion(i);

          results.push(resultData);
          totalTokens += resultData.tokens || 0;
          totalCost += resultData.cost || 0;

          // Send result event
          res.write(`data: ${JSON.stringify(resultData)}\n\n`);

          // Rate limiting
          if (i < questions.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // Calculate summary
      const passedCount = results.filter(r => r.success).length;
      const failedCount = results.length - passedCount;
      const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
      const avgResponseTime = Math.round(results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length);
      const successRate = (passedCount / results.length * 100).toFixed(2);

      const wantEval = req.body?.enableEvaluation === true || req.body?.enableEvaluation === 'true';

      // If there are failures or user wants evaluation, don't save yet
      if (failedCount > 0 || wantEval) {
        console.log(`[tests] Test completed: ${failedCount} failures, evaluation=${wantEval}, waiting for user action`);
        res.write(`data: ${JSON.stringify({ 
          type: 'complete', 
          pendingSave: true,
          failedCount,
          passedCount,
          successRate,
          durationSeconds,
          avgResponseTime,
          totalTokens,
          totalCost,
          results,
          testConfig: {
            agentId: parseInt(agentId),
            agentName: agent.name,
            executionMode: executionMode || 'sequential',
            maxConcurrency: parseInt(maxConcurrency) || 2,
            requestDelay: parseInt(requestDelay) || 0,
          }
        })}\n\n`);
        res.end();
        return;
      }

      // All passed, no evaluation - save to history immediately
      const historyEntry = saveTestToHistory({
        agentId: parseInt(agentId),
        agentName: agent.name,
        totalQuestions: results.length,
        passedCount,
        failedCount,
        successRate,
        durationSeconds,
        avgResponseTime,
        executionMode: executionMode || 'sequential',
        maxConcurrency: parseInt(maxConcurrency) || 2,
        requestDelay: parseInt(requestDelay) || 0,
        rpm: 0, // deprecated, kept for compatibility
        totalTokens,
        totalCost,
        testDate: new Date().toISOString(),
        results,
      });

      // Auto-save reports to local directory
      const outputDir = './test_output';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const mdPath = `${outputDir}/test_report_${timestamp}.md`;
      const mdEnPath = `${outputDir}/test_report_${timestamp}_en.md`;
      const xlsxPath = `${outputDir}/test_report_${timestamp}.xlsx`;
      
      fs.writeFileSync(mdPath, historyEntry.markdownReport);
      fs.writeFileSync(mdEnPath, historyEntry.markdownReportEn);
      fs.writeFileSync(xlsxPath, historyEntry.excelReport);
      
      console.log(`\n📁 报告已自动保存到:`);
      console.log(`   - Markdown: ${mdPath}`);
      console.log(`   - Excel: ${xlsxPath}`);

      // Send complete event with history ID
      res.write(`data: ${JSON.stringify({ type: 'complete', historyId: historyEntry.id })}\n\n`);
      res.end();
      
      console.log(`[tests] Test completed with ${results.length} results, saved as history #${historyEntry.id}`);
      return;
    }

    // Non-streaming mode - run in background
    const testId = `test_${testIdCounter++}`;
    const testData = {
      id: testId,
      status: 'running',
      agentId: parseInt(agentId),
      agentName: agent.name,
      modelName: agent.model_name,
      questions,
      referenceOutputs,
      results: [],
      startTime: Date.now(),
      executionMode: executionMode || 'sequential',
      maxConcurrency: parseInt(maxConcurrency) || 2,
      requestDelay: parseInt(requestDelay) || 0,
      requestTimeout: timeoutMs,
      userId: userId || null,
    };

    testResults.set(testId, testData);

    // Run test in background
    runTest(testData, agent);

    res.json({ testId, message: '测试已开始' });
  } catch (error) {
    console.error('[tests] Error:', error);
    res.status(500).json({ error: error.message || '服务器错误' });
  }
});

// POST /api/tests/save - 保存测试结果到历史记录（用于有失败后确认保存）
app.post('/api/tests/save', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const { results, testConfig, durationSeconds, totalTokens, totalCost, evaluation } = req.body;

    if (!results || !testConfig) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const passedCount = results.filter(r => r.success).length;
    const failedCount = results.length - passedCount;
    const avgResponseTime = Math.round(results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length);
    const successRate = (passedCount / results.length * 100).toFixed(2);

    const retriedCount = results.filter(r => r.retryCount && r.retryCount > 0).length;

    const historyEntry = saveTestToHistory({
      agentId: testConfig.agentId,
      agentName: testConfig.agentName,
      totalQuestions: results.length,
      passedCount,
      failedCount,
      successRate,
      durationSeconds: durationSeconds || 0,
      avgResponseTime,
      executionMode: testConfig.executionMode || 'sequential',
      maxConcurrency: testConfig.maxConcurrency || 2,
      requestDelay: testConfig.requestDelay || 0,
      rpm: 0,
      totalTokens: totalTokens || 0,
      totalCost: totalCost || 0,
      testDate: new Date().toISOString(),
      results: results.map(r => ({
        ...r,
        retryCount: r.retryCount || 0,
      })),
      retriedCount,
      evaluation: evaluation || undefined,
    });

    // Auto-save reports to local directory
    const outputDir = './test_output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const mdPath = `${outputDir}/test_report_${timestamp}.md`;
    const mdEnPath = `${outputDir}/test_report_${timestamp}_en.md`;
    const xlsxPath = `${outputDir}/test_report_${timestamp}.xlsx`;
    
    fs.writeFileSync(mdPath, historyEntry.markdownReport);
    fs.writeFileSync(mdEnPath, historyEntry.markdownReportEn);
    fs.writeFileSync(xlsxPath, historyEntry.excelReport);
    
    console.log(`\n📁 报告已自动保存到:`);
    console.log(`   - Markdown: ${mdPath}`);
    console.log(`   - Markdown (EN): ${mdEnPath}`);
    console.log(`   - Excel: ${xlsxPath}`);

    console.log(`[save] Saved test with ${results.length} results (${retriedCount} retried), history #${historyEntry.id}`);

    res.json({ 
      success: true, 
      historyId: historyEntry.id,
      retriedCount,
    });
  } catch (error) {
    console.error('[save] Error:', error);
    res.status(500).json({ error: error.message || '服务器错误' });
  }
});

// POST /api/tests/retry - 重试失败的测试问题 (支持 SSE 流式)
app.post('/api/tests/retry', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const { agentId, questions, executionMode, requestTimeout, maxConcurrency, requestDelay, userId } = req.body;
    const wantsStream = req.query.stream === 'true';
    const timeoutMs = parseInt(requestTimeout) || 60000;

    console.log('[retry] Request:', { 
      agentId, 
      questionsCount: questions?.length,
      executionMode,
      timeout: `${timeoutMs / 1000}s`,
    });

    if (!questions || questions.length === 0 || !agentId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const agent = agents.find(a => a.id === parseInt(agentId));
    if (!agent) {
      return res.status(404).json({ error: 'Agent 不存在' });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.write(`data: ${JSON.stringify({ type: 'connected', totalQuestions: questions.length })}\n\n`);

    const isParallel = executionMode === 'parallel';
    const results = [];

    // Helper function to process a single question
    const processQuestion = async (q) => {
      console.log(`[retry] Running question ${q.questionIndex + 1}: ${q.question.slice(0, 50)}...`);

      const result = await callAgentAPI(
        agent.api_key,
        agent.region,
        q.question,
        agent.custom_base_url,
        userId,
        timeoutMs
      );

      return {
        type: 'result',
        questionIndex: q.questionIndex,
        question: q.question,
        referenceOutput: q.referenceOutput || '',
        response: result.response || '',
        success: result.success,
        error: result.error,
        responseTime: result.responseTime,
        conversationId: result.conversationId,
        messageId: result.messageId,
        isRetry: true,
        timestamp: new Date().toISOString(),
      };
    };

    if (isParallel) {
      const concurrency = parseInt(maxConcurrency) || 2;
      console.log(`[retry] Parallel mode: concurrency=${concurrency}`);

      for (let batchStart = 0; batchStart < questions.length; batchStart += concurrency) {
        const batch = questions.slice(batchStart, batchStart + concurrency);

        res.write(`data: ${JSON.stringify({ 
          type: 'progress', 
          current: batchStart + 1,
          message: `重试 ${batch.length} 个问题...`
        })}\n\n`);

        const batchResults = await Promise.all(batch.map(q => processQuestion(q)));

        for (const resultData of batchResults) {
          results.push(resultData);
          res.write(`data: ${JSON.stringify(resultData)}\n\n`);
        }

        if (batchStart + concurrency < questions.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } else {
      const delay = parseInt(requestDelay) || 0;
      console.log(`[retry] Sequential mode: delay=${delay}ms`);

      for (let i = 0; i < questions.length; i++) {
        res.write(`data: ${JSON.stringify({ 
          type: 'progress', 
          current: i + 1, 
          question: questions[i].question.slice(0, 100) 
        })}\n\n`);

        const resultData = await processQuestion(questions[i]);
        results.push(resultData);
        res.write(`data: ${JSON.stringify(resultData)}\n\n`);

        if (i < questions.length - 1 && delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Send complete event
    res.write(`data: ${JSON.stringify({ type: 'complete', retriedCount: results.length })}\n\n`);
    res.end();

    console.log(`[retry] Completed with ${results.length} results`);
  } catch (error) {
    console.error('[retry] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || '服务器错误' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }
});

// POST /api/tests/evaluate - AI evaluation of test results (SSE)
const DEFAULT_EVAL_SYSTEM_PROMPT = `你是一名专业的答案评估专家。请将测试答案与参考答案进行对比，分两段简要描述：

第一段：给出语义匹配度评分（0-100分），并用一句话说明评分理由。
第二段：简要分析（不超过150字）测试答案与参考答案的异同，包括内容准确性、语气措辞是否恰当等。

直接用自然语言回复，不要使用JSON或其他格式。`;

function buildEvalUserMessage(question, referenceAnswer, testAnswer) {
  return `测试问题: ${question}\n\n参考答案: ${referenceAnswer}\n\n测试答案: ${testAnswer}\n\n请对比测试答案与参考答案，给出评估结果。`;
}

function extractScoreFromText(text) {
  const m = text.match(/(\d{1,3})\s*[分\/]/);
  if (m) return Math.min(100, Math.max(0, parseInt(m[1])));
  const m2 = text.match(/匹配度[：:]\s*(\d{1,3})/);
  if (m2) return Math.min(100, Math.max(0, parseInt(m2[1])));
  const m3 = text.match(/(\d{1,3})%/);
  if (m3) return Math.min(100, Math.max(0, parseInt(m3[1])));
  return 0;
}

app.post('/api/tests/evaluate', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const { evaluatorAgentId, results, executionMode, maxConcurrency, requestDelay, systemPrompt } = req.body;

    if (!evaluatorAgentId || !results || results.length === 0) {
      return res.status(400).json({ error: '缺少必要参数 (evaluatorAgentId, results)' });
    }

    const agent = agents.find(a => a.id === parseInt(evaluatorAgentId));
    if (!agent) {
      return res.status(404).json({ error: '评估模型不存在' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.write(`data: ${JSON.stringify({ type: 'eval_connected', totalQuestions: results.length })}\n\n`);

    const isParallel = executionMode === 'parallel';
    const concurrency = parseInt(maxConcurrency) || 2;
    const delay = parseInt(requestDelay) || 0;
    const evalResults = [];

    const evaluateOne = async (r, idx) => {
      const question = r.question || '';
      const referenceOutput = r.referenceOutput || '';
      const testAnswer = r.response || r.error || '';
      if (!referenceOutput) return null;
      if (!testAnswer) {
        return { questionIndex: idx, evalText: '缺少测试答案', score: 0 };
      }
      const evalPrompt = systemPrompt || DEFAULT_EVAL_SYSTEM_PROMPT;
      const prompt = `${evalPrompt}\n\n${buildEvalUserMessage(question, referenceOutput, testAnswer)}`;
      const apiResult = await callAgentAPI(agent.api_key, agent.region, prompt, agent.custom_base_url);
      if (!apiResult.success || !apiResult.response) {
        return { questionIndex: idx, evalText: `评估失败: ${apiResult.error || '无响应'}`, score: 0 };
      }
      const evalText = apiResult.response.trim();
      const score = extractScoreFromText(evalText);
      return { questionIndex: idx, evalText, score };
    };

    const needsEval = results.filter(r => !!(r.referenceOutput));
    const totalToEval = needsEval.length;

    if (isParallel) {
      for (let i = 0; i < results.length; i += concurrency) {
        const batch = results.slice(i, i + concurrency);
        res.write(`data: ${JSON.stringify({ type: 'eval_progress', current: evalResults.length + 1, total: totalToEval })}\n\n`);
        const batchResults = await Promise.all(batch.map((r, bIdx) => evaluateOne(r, i + bIdx)));
        for (const er of batchResults) {
          if (er) { evalResults.push(er); res.write(`data: ${JSON.stringify({ type: 'eval_result', ...er })}\n\n`); }
        }
        if (i + concurrency < results.length) await new Promise(r => setTimeout(r, 1000));
      }
    } else {
      for (let i = 0; i < results.length; i++) {
        const er = await evaluateOne(results[i], i);
        if (!er) continue;
        res.write(`data: ${JSON.stringify({ type: 'eval_progress', current: evalResults.length + 1, total: totalToEval, question: results[i].question?.slice(0, 60) })}\n\n`);
        evalResults.push(er);
        res.write(`data: ${JSON.stringify({ type: 'eval_result', ...er })}\n\n`);
        if (i < results.length - 1 && delay > 0) await new Promise(r => setTimeout(r, delay));
      }
    }

    const avgScore = evalResults.length > 0
      ? Math.round(evalResults.reduce((s, r) => s + (r.score || 0), 0) / evalResults.length)
      : 0;
    res.write(`data: ${JSON.stringify({
      type: 'eval_complete',
      evaluatorName: agent.name,
      avgScore,
      evaluatedCount: evalResults.length,
      evalResults,
    })}\n\n`);
    res.end();

    console.log(`[evaluate] Completed: ${evalResults.length} questions, avg score: ${avgScore}`);
  } catch (error) {
    console.error('[evaluate] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || '服务器错误' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }
});

// Run test async
async function runTest(testData, agent) {
  const { questions, referenceOutputs, userId, executionMode, maxConcurrency, requestDelay, requestTimeout } = testData;
  const isParallel = executionMode === 'parallel';
  const timeoutMs = requestTimeout || 60000;

  // Helper function to process a single question
  const processQuestion = async (i) => {
    const question = questions[i];
    const refOutput = referenceOutputs[i] || '';

    console.log(`[test] Running question ${i + 1}/${questions.length}: ${question.slice(0, 50)}...`);

    const result = await callAgentAPI(
      agent.api_key,
      agent.region,
      question,
      agent.custom_base_url,
      userId,
      timeoutMs
    );

    return {
      questionIndex: i,
      question,
      referenceOutput: refOutput,
      response: result.response || '',
      success: result.success,
      error: result.error,
      responseTime: result.responseTime,
      conversationId: result.conversationId,
      messageId: result.messageId,
    };
  };

  if (isParallel) {
    // Parallel execution - use maxConcurrency
    const concurrency = maxConcurrency || 2; // default to 2 if not specified
    console.log(`[test] Parallel mode: concurrency=${concurrency}`);

    for (let batchStart = 0; batchStart < questions.length; batchStart += concurrency) {
      const batchEnd = Math.min(batchStart + concurrency, questions.length);
      const batchIndices = [];
      for (let i = batchStart; i < batchEnd; i++) {
        batchIndices.push(i);
      }

      const batchResults = await Promise.all(batchIndices.map(i => processQuestion(i)));
      testData.results.push(...batchResults);

      // Wait 1 second between batches
      if (batchEnd < questions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } else {
    // Sequential execution - wait after each response
    const delay = requestDelay || 0;
    console.log(`[test] Sequential mode: delay=${delay}ms`);

    for (let i = 0; i < questions.length; i++) {
      const result = await processQuestion(i);
      testData.results.push(result);

      // Rate limiting
      if (i < questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  testData.status = 'completed';
  testData.endTime = Date.now();
  console.log(`[test] Test ${testData.id} completed!`);
}

// GET /api/tests/stream - 获取测试状态 (SSE)
app.get('/api/tests/stream', (req, res) => {
  const testId = req.query.testId;

  if (!testId) {
    return res.status(400).json({ error: '缺少 testId' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendUpdate = () => {
    const testData = testResults.get(testId);
    
    if (!testData) {
      res.write(`data: ${JSON.stringify({ error: '测试不存在' })}\n\n`);
      res.end();
      return;
    }

    const passed = testData.results.filter(r => r.success).length;
    const failed = testData.results.filter(r => !r.success).length;

    const update = {
      status: testData.status,
      progress: {
        completed: testData.results.length,
        total: testData.questions.length,
        passed,
        failed,
      },
      results: testData.results,
      agentName: testData.agentName,
      modelName: testData.modelName,
    };

    if (testData.status === 'completed') {
      update.summary = {
        totalQuestions: testData.questions.length,
        passedCount: passed,
        failedCount: failed,
        successRate: (passed / testData.questions.length * 100).toFixed(2),
        durationSeconds: ((testData.endTime - testData.startTime) / 1000).toFixed(2),
        avgResponseTime: testData.results.length > 0
          ? (testData.results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / testData.results.length).toFixed(0)
          : 0,
      };
    }

    res.write(`data: ${JSON.stringify(update)}\n\n`);

    if (testData.status === 'completed') {
      res.end();
    } else {
      setTimeout(sendUpdate, 1000);
    }
  };

  sendUpdate();
});

// GET /api/history - 获取测试历史列表
app.get('/api/history', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const start = (page - 1) * limit;
  const end = start + limit;
  
  const paginatedData = testHistory.slice(start, end).map(h => ({
    id: h.id,
    agentId: h.agentId,
    agentName: h.agentName,
    totalQuestions: h.totalQuestions,
    passedCount: h.passedCount,
    failedCount: h.failedCount,
    successRate: parseFloat(h.successRate),
    durationSeconds: h.durationSeconds,
    avgResponseTime: h.avgResponseTime,
    executionMode: h.executionMode,
    rpm: h.rpm,
    testDate: h.testDate,
    createdAt: h.createdAt,
    // 兼容前端 jsonData 格式
    jsonData: {
      status: 'completed',
      results: h.results,
    },
  }));

  res.json({
    data: paginatedData,
    pagination: {
      total: testHistory.length,
      page,
      limit,
      totalPages: Math.ceil(testHistory.length / limit),
    }
  });
});

// GET /api/history/:id - 获取单个测试详情
app.get('/api/history/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const history = testHistory.find(h => h.id === id);
  
  if (!history) {
    return res.status(404).json({ error: '测试记录不存在' });
  }

  res.json({
    id: history.id,
    agentId: history.agentId,
    agentName: history.agentName,
    totalQuestions: history.totalQuestions,
    passedCount: history.passedCount,
    failedCount: history.failedCount,
    successRate: history.successRate,
    durationSeconds: history.durationSeconds,
    avgResponseTime: history.avgResponseTime,
    executionMode: history.executionMode,
    rpm: history.rpm,
    totalTokens: history.totalTokens,
    totalCost: history.totalCost,
    createdAt: history.createdAt,
    testDate: history.testDate,
    // 兼容前端的 jsonData 格式
    jsonData: {
      status: 'completed',
      results: history.results,
    },
  });
});

// GET /api/history/:id/markdown - 下载 Markdown 报告
app.get('/api/history/:id/markdown', (req, res) => {
  const id = parseInt(req.params.id);
  const history = testHistory.find(h => h.id === id);
  
  if (!history) {
    return res.status(404).json({ error: '测试记录不存在' });
  }

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="test_report_${id}.md"`);
  res.send(history.markdownReport);
});

// GET /api/history/:id/excel - 下载 Excel 报告
app.get('/api/history/:id/excel', (req, res) => {
  const id = parseInt(req.params.id);
  const history = testHistory.find(h => h.id === id);
  
  if (!history) {
    return res.status(404).json({ error: '测试记录不存在' });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="test_report_${id}.xlsx"`);
  res.send(history.excelReport);
});

// DELETE /api/history/:id - 删除测试记录
app.delete('/api/history/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = testHistory.findIndex(h => h.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: '测试记录不存在' });
  }

  testHistory.splice(index, 1);
  res.status(204).send();
});

// GET /api/download - 通用下载端点 (兼容前端)
app.get('/api/download', (req, res) => {
  const id = parseInt(req.query.id);
  const format = req.query.format;
  
  const history = testHistory.find(h => h.id === id);
  
  if (!history) {
    return res.status(404).json({ error: '测试记录不存在' });
  }

  switch (format) {
    case 'markdown':
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="test_report_${id}.md"`);
      res.send(history.markdownReport);
      break;
      
    case 'markdown-en':
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="test_report_${id}_en.md"`);
      const mdEn = history.markdownReportEn || generateMarkdownReportEn({
        agentName: history.agentName,
        testDate: history.testDate,
        executionMode: history.executionMode,
        maxConcurrency: history.maxConcurrency,
        requestDelay: history.requestDelay,
        retriedCount: history.retriedCount,
        totalQuestions: history.totalQuestions,
        passedCount: history.passedCount,
        failedCount: history.failedCount,
        successRate: history.successRate,
        avgResponseTime: history.avgResponseTime,
        durationSeconds: history.durationSeconds,
        totalTokens: history.totalTokens,
        totalCost: history.totalCost,
        results: history.results,
        evaluation: history.evaluation,
      });
      res.send(mdEn);
      break;
      
    case 'excel':
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="test_report_${id}.xlsx"`);
      res.send(history.excelReport);
      break;
      
    case 'json':
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="test_report_${id}.json"`);
      res.json({
        id: history.id,
        agentName: history.agentName,
        testDate: history.testDate,
        totalQuestions: history.totalQuestions,
        passedCount: history.passedCount,
        failedCount: history.failedCount,
        successRate: history.successRate,
        durationSeconds: history.durationSeconds,
        avgResponseTime: history.avgResponseTime,
        results: history.results,
      });
      break;
      
    default:
      res.status(400).json({ error: '不支持的格式' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 本地 API 服务器运行在 http://localhost:${PORT}`);
  console.log(`\n📋 已添加 Agent:`);
  console.log(`   - ID: 1`);
  console.log(`   - 名称: mzt-QA`);
  console.log(`   - 模型: MiniMax-M2`);
  console.log(`   - 区域: CUSTOM`);
  console.log(`   - Base URL: http://27.156.118.33:40443`);
  console.log(`\n💡 前端需要连接到 http://localhost:3001`);
  console.log(`\n✅ 支持的功能:`);
  console.log(`   - API请求代理`);
  console.log(`   - 测试流程 (SSE流式)`);
  console.log(`   - 测试历史记录`);
  console.log(`   - 报告导出 (Excel/Markdown/JSON)`);
});

