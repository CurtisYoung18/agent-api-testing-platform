import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import XLSX from 'xlsx';
import fs from 'fs/promises';
import { Pool } from 'pg';

// Database connection pool
const getPool = () => new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Parse Excel file and extract test questions with optional reference outputs
async function parseExcelFile(filePath: string): Promise<{ questions: string[]; referenceOutputs: string[] }> {
  const fileBuffer = await fs.readFile(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet);

  const questions: string[] = [];
  const referenceOutputs: string[] = [];
  
  for (const row of data) {
    const input = (row as any).input || (row as any).Input || (row as any).INPUT;
    if (input && typeof input === 'string' && input.trim()) {
      questions.push(input.trim());
      
      const refOutput = (row as any).reference_output || (row as any).Reference_Output || (row as any).REFERENCE_OUTPUT || '';
      referenceOutputs.push(typeof refOutput === 'string' ? refOutput.trim() : '');
    }
  }

  while (referenceOutputs.length < questions.length) {
    referenceOutputs.push('');
  }

  return { questions, referenceOutputs };
}

// Helper function to get base URL
function getBaseUrl(region: string, customBaseUrl?: string | null): string {
  if (region === 'CUSTOM' && customBaseUrl) {
    return customBaseUrl;
  }
  return region === 'SG' 
    ? 'https://api.gptbots.ai'
    : 'https://api.gptbots.cn';
}

// Call Agent API
async function callAgentAPI(apiKey: string, region: string, question: string, customBaseUrl?: string | null): Promise<{ 
  success: boolean; 
  response?: string; 
  error?: string; 
  responseTime: number;
  conversationId?: string;
  messageId?: string;
  usage?: any;
}> {
  const startTime = Date.now();
  
  try {
    const baseUrl = getBaseUrl(region, customBaseUrl);

    // Step 1: Create conversation
    const conversationResponse = await fetch(`${baseUrl}/v1/conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        user_id: 'test_user_' + Date.now()
      }),
    });

    if (!conversationResponse.ok) {
      const errorData = await conversationResponse.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `创建对话失败 (${conversationResponse.status})`,
        responseTime: Date.now() - startTime,
      };
    }

    const conversationData = await conversationResponse.json();
    console.log('[info] Conversation response:', JSON.stringify(conversationData));
    const conversationId = conversationData.conversation_id;

    if (!conversationId) {
      console.error('[error] Failed to get conversation_id. Full response:', JSON.stringify(conversationData));
      return {
        success: false,
        error: `未获取到conversation_id. Response: ${JSON.stringify(conversationData)}`,
        responseTime: Date.now() - startTime,
      };
    }

    // Step 2: Send message
    const messageResponse = await fetch(`${baseUrl}/v2/conversation/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        response_mode: 'blocking',
        messages: [{
          role: 'user',
          content: [{
            type: 'text',
            text: question
          }]
        }]
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!messageResponse.ok) {
      const errorData = await messageResponse.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `API调用失败 (${messageResponse.status})`,
        responseTime,
        conversationId,
      };
    }

    const messageData = await messageResponse.json();

    let responseText = '';
    if (messageData.output && Array.isArray(messageData.output) && messageData.output.length > 0) {
      const firstOutput = messageData.output[0];
      if (firstOutput.content && firstOutput.content.text) {
        responseText = firstOutput.content.text;
      }
    }

    if (!responseText) {
      return {
        success: false,
        error: 'API返回了空响应',
        responseTime,
        conversationId,
        messageId: messageData.message_id,
      };
    }

    return {
      success: true,
      response: responseText,
      responseTime,
      conversationId: conversationId,
      messageId: messageData.message_id,
      usage: messageData.usage || null,
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || '网络请求失败',
      responseTime: Date.now() - startTime,
    };
  }
}

// Execute tests with real-time updates
async function executeTests(
  agent: any,
  questions: string[],
  referenceOutputs: string[],
  executionMode: string,
  rpm: number,
  onProgress?: (data: any) => void
): Promise<{
  results: any[];
  totalQuestions: number;
  passedCount: number;
  failedCount: number;
  successRate: number;
  durationSeconds: number;
  avgResponseTime: number;
  totalTokens: number;
  totalCost: number;
}> {
  const results: any[] = [];
  let passedCount = 0;
  let failedCount = 0;
  let totalTokens = 0;
  let totalCost = 0;
  const startTime = Date.now();

  const delayBetweenRequests = (60 / rpm) * 1000;

  if (executionMode === 'sequential') {
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      // 发送进度更新 - 开始测试
      if (onProgress) {
        onProgress({
          type: 'progress',
          current: i + 1,
          total: questions.length,
          question: question,
          status: 'testing'
        });
      }
      
      const result = await callAgentAPI(agent.api_key, agent.region, question, agent.custom_base_url);
      
      let questionTokens = 0;
      let questionCost = 0;
      if (result.success && result.usage) {
        if (result.usage.tokens) {
          questionTokens = result.usage.tokens.total_tokens || 0;
          totalTokens += questionTokens;
        }
        if (result.usage.credits) {
          questionCost = result.usage.credits.total_credits || 0;
          totalCost += questionCost;
        }
      }

      const resultData = {
        question,
        success: result.success,
        response: result.response || '',
        error: result.error || '',
        responseTime: result.responseTime,
        conversationId: result.conversationId || '',
        messageId: result.messageId || '',
        timestamp: new Date().toISOString(),
        referenceOutput: i < referenceOutputs.length ? referenceOutputs[i] : '',
        tokens: questionTokens,
        cost: questionCost,
      };
      results.push(resultData);

      if (result.success) {
        passedCount++;
      } else {
        failedCount++;
      }

      // 发送进度更新 - 完成测试
      if (onProgress) {
        onProgress({
          type: 'result',
          current: i + 1,
          total: questions.length,
          question: question,
          response: result.response || result.error,
          success: result.success,
          responseTime: result.responseTime,
          tokens: questionTokens
        });
      }

      if (i < questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
      }
    }
  } else {
    // Parallel execution
    const promises = questions.map(async (question, i) => {
      if (onProgress) {
        onProgress({
          type: 'progress',
          current: i + 1,
          total: questions.length,
          question: question,
          status: 'testing'
        });
      }

      const result = await callAgentAPI(agent.api_key, agent.region, question, agent.custom_base_url);
      
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

      const resultData = {
        question,
        success: result.success,
        response: result.response || '',
        error: result.error || '',
        responseTime: result.responseTime,
        conversationId: result.conversationId || '',
        messageId: result.messageId || '',
        timestamp: new Date().toISOString(),
        referenceOutput: i < referenceOutputs.length ? referenceOutputs[i] : '',
        tokens: questionTokens,
        cost: questionCost,
      };

      if (onProgress) {
        onProgress({
          type: 'result',
          current: i + 1,
          total: questions.length,
          question: question,
          response: result.response || result.error,
          success: result.success,
          responseTime: result.responseTime,
          tokens: questionTokens
        });
      }

      return { result: resultData, tokens: questionTokens, cost: questionCost };
    });

    const allResults = await Promise.all(promises);
    
    allResults.forEach(({ result, tokens, cost }) => {
      results.push(result);
      if (result.success) {
        passedCount++;
      } else {
        failedCount++;
      }
      totalTokens += tokens;
      totalCost += cost;
    });
  }

  const totalDuration = Date.now() - startTime;
  const successRate = (passedCount / questions.length) * 100;
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

  return {
    results,
    totalQuestions: questions.length,
    passedCount,
    failedCount,
    successRate,
    durationSeconds: Math.floor(totalDuration / 1000),
    avgResponseTime: Math.round(avgResponseTime),
    totalTokens,
    totalCost,
  };
}

// Generate Excel report
function generateExcelReport(data: any): Buffer {
  const rows = data.results.map((r: any, index: number) => ({
    '序号': index + 1,
    '问题': r.question,
    '参考答案': r.referenceOutput || '',
    '实际输出': r.response || r.error,
    '状态': r.success ? '成功' : '失败',
    '响应时间(ms)': r.responseTime,
    'Token消耗': r.tokens || 0,
    '成本': r.cost || 0,
    '时间戳': r.timestamp,
  }));

  const summaryRow = {
    '序号': '汇总',
    '问题': `Agent: ${data.agentName}`,
    '参考答案': `总问题数: ${data.totalQuestions}`,
    '实际输出': `成功: ${data.passedCount}, 失败: ${data.failedCount}`,
    '状态': `成功率: ${data.successRate.toFixed(2)}%`,
    '响应时间(ms)': `平均: ${data.avgResponseTime}ms`,
    'Token消耗': data.totalTokens,
    '成本': data.totalCost.toFixed(4),
    '时间戳': data.testDate.toISOString(),
  };

  rows.unshift(summaryRow);

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '测试报告');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// Generate Markdown report
function generateMarkdownReport(data: any): string {
  let markdown = `# Agent API 测试报告\n\n`;
  markdown += `**Agent名称**: ${data.agentName}\n`;
  markdown += `**测试时间**: ${data.testDate.toISOString()}\n`;
  markdown += `**执行模式**: ${data.executionMode === 'parallel' ? '并行' : '串行'}\n`;
  markdown += `**RPM**: ${data.rpm}\n\n`;

  markdown += `## 测试汇总\n\n`;
  markdown += `| 指标 | 值 |\n`;
  markdown += `|------|----|\n`;
  markdown += `| 总问题数 | ${data.totalQuestions} |\n`;
  markdown += `| 成功数 | ${data.passedCount} |\n`;
  markdown += `| 失败数 | ${data.failedCount} |\n`;
  markdown += `| 成功率 | ${data.successRate.toFixed(2)}% |\n`;
  markdown += `| 平均响应时间 | ${data.avgResponseTime}ms |\n`;
  markdown += `| 总耗时 | ${data.durationSeconds}s |\n`;
  markdown += `| Token消耗 | ${data.totalTokens} |\n`;
  markdown += `| 总成本 | $${data.totalCost.toFixed(4)} |\n\n`;

  markdown += `## 详细结果\n\n`;
  data.results.forEach((r: any, index: number) => {
    markdown += `### 问题 ${index + 1}\n\n`;
    markdown += `**问题**: ${r.question}\n\n`;
    if (r.referenceOutput) {
      markdown += `**参考答案**: ${r.referenceOutput}\n\n`;
    }
    markdown += `**实际输出**: ${r.response || r.error}\n\n`;
    markdown += `**状态**: ${r.success ? '✅ 成功' : '❌ 失败'}\n\n`;
    markdown += `**响应时间**: ${r.responseTime}ms\n\n`;
    if (r.tokens) {
      markdown += `**Token消耗**: ${r.tokens}\n\n`;
    }
    markdown += `---\n\n`;
  });

  return markdown;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const pool = getPool();
  
  // Check if client wants SSE stream
  const wantsStream = req.headers.accept?.includes('text/event-stream') || req.query.stream === 'true';

  try {
    console.log('=== Tests API Request Started ===');

    // Parse form data
    console.log('Parsing form data...');
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const agentId = fields.agentId?.[0];
    const executionMode = (fields.executionMode?.[0] || 'sequential') as string;
    const rpm = parseInt(fields.rpm?.[0] || '60', 10);
    const file = files.file?.[0];

    console.log('Request params:', { agentId, executionMode, rpm, hasFile: !!file, wantsStream });

    if (!agentId || !file) {
      console.error('Missing required fields');
      return res.status(400).json({ error: '缺少必填字段' });
    }

    // Get agent info
    console.log('Fetching agent:', agentId);
    const agentResult = await pool.query(
      'SELECT * FROM agents WHERE id = $1',
      [parseInt(agentId, 10)]
    );

    if (agentResult.rows.length === 0) {
      console.error('Agent not found:', agentId);
      return res.status(404).json({ error: 'Agent 不存在' });
    }

    const agent = agentResult.rows[0];
    console.log('Agent found:', { id: agent.id, name: agent.name, region: agent.region });

    // Parse Excel file
    console.log('Parsing Excel file:', file.filepath);
    const { questions, referenceOutputs } = await parseExcelFile(file.filepath);
    console.log('Excel parsed:', { questionCount: questions.length });

    if (questions.length === 0) {
      return res.status(400).json({ error: 'Excel文件中未找到有效的测试问题' });
    }

    // Setup SSE if requested
    if (wantsStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      
      // Send initial connection event
      res.write(`data: ${JSON.stringify({ type: 'connected', totalQuestions: questions.length })}\n\n`);
    }

    // Execute tests
    console.log('Starting test execution...');
    const testResults = await executeTests(
      agent, 
      questions, 
      referenceOutputs, 
      executionMode, 
      rpm,
      wantsStream ? (data) => {
        // Send progress via SSE
        try {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch (err) {
          console.error('Failed to write SSE data:', err);
        }
      } : undefined
    );
    console.log('Test execution completed:', {
      totalQuestions: testResults.totalQuestions,
      passedCount: testResults.passedCount,
      successRate: testResults.successRate
    });

    const testData = {
      agentName: agent.name,
      testDate: new Date(),
      ...testResults,
      executionMode,
      rpm,
    };

    // Generate reports
    console.log('Generating reports...');
    const excelBuffer = generateExcelReport(testData);
    const markdownContent = generateMarkdownReport(testData);

    // Save to database
    console.log('Saving to database...');
    const insertResult = await pool.query(
      `INSERT INTO test_history (
        agent_id, agent_name, total_questions, passed_count, failed_count,
        success_rate, duration_seconds, avg_response_time, execution_mode, rpm,
        excel_blob, markdown_blob, json_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        agent.id,
        agent.name,
        testResults.totalQuestions,
        testResults.passedCount,
        testResults.failedCount,
        testResults.successRate,
        testResults.durationSeconds,
        testResults.avgResponseTime,
        executionMode,
        rpm,
        excelBuffer,
        Buffer.from(markdownContent, 'utf-8'),
        JSON.stringify({
          status: 'completed',
          results: testResults.results,
          totalTokens: testResults.totalTokens,
          totalCost: testResults.totalCost,
        })
      ]
    );

    const testHistoryId = insertResult.rows[0].id;
    console.log('Test history saved:', { id: testHistoryId });

    // Update agent last used
    await pool.query(
      'UPDATE agents SET last_used = NOW() WHERE id = $1',
      [agent.id]
    );

    console.log('=== Tests API Request Completed ===');
    
    const responseData = {
      id: testHistoryId,
      message: '测试执行完成',
      summary: {
        totalQuestions: testResults.totalQuestions,
        passedCount: testResults.passedCount,
        failedCount: testResults.failedCount,
        successRate: testResults.successRate.toFixed(2),
        durationSeconds: testResults.durationSeconds,
        totalTokens: testResults.totalTokens,
        totalCost: testResults.totalCost.toFixed(4),
      },
    };
    
    if (wantsStream) {
      // Send final result via SSE
      res.write(`data: ${JSON.stringify({ type: 'complete', ...responseData })}\n\n`);
      res.end();
    } else {
      return res.status(201).json(responseData);
    }

  } catch (error: any) {
    console.error('=== Tests API Error ===');
    console.error('Error:', error);
    return res.status(500).json({
      error: '服务器错误',
      message: error.message,
    });
  } finally {
    await pool.end();
  }
}
