import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import XLSX from 'xlsx';
import fs from 'fs/promises';
import { Pool } from 'pg';

// Database connection
const getPool = () => new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Parse Excel file
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

// Call Agent API
async function callAgentAPI(apiKey: string, region: string, question: string): Promise<{ 
  success: boolean; 
  response?: string; 
  error?: string; 
  responseTime: number;
  usage?: any;
}> {
  const startTime = Date.now();
  
  try {
    const baseUrl = region === 'SG' 
      ? 'https://api.gptbots.ai'
      : 'https://api.gptbots.cn';

    // Create conversation
    const conversationResponse = await fetch(`${baseUrl}/v2/conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({}),
    });

    if (!conversationResponse.ok) {
      return {
        success: false,
        error: `创建对话失败 (${conversationResponse.status})`,
        responseTime: Date.now() - startTime,
      };
    }

    const conversationData = await conversationResponse.json();
    const conversationId = conversationData.conversation_id;

    // Send message
    const messageResponse = await fetch(`${baseUrl}/v2/conversation/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        inputs: [{
          input_type: 'text',
          content: { text: question },
        }],
        model_config: {
          model: 'default',
          temperature: 0.7,
        },
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!messageResponse.ok) {
      return {
        success: false,
        error: `API调用失败 (${messageResponse.status})`,
        responseTime,
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

    return {
      success: !!responseText,
      response: responseText || undefined,
      error: responseText ? undefined : 'API返回了空响应',
      responseTime,
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const pool = getPool();

  try {
    // Parse form data
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const agentId = fields.agentId?.[0];
    const executionMode = (fields.executionMode?.[0] || 'sequential') as string;
    const rpm = parseInt(fields.rpm?.[0] || '60', 10);
    const file = files.file?.[0];

    if (!agentId || !file) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: '缺少必填字段' })}\n\n`);
      return res.end();
    }

    // Get agent
    const agentResult = await pool.query('SELECT * FROM agents WHERE id = $1', [parseInt(agentId, 10)]);
    if (agentResult.rows.length === 0) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Agent 不存在' })}\n\n`);
      return res.end();
    }

    const agent = agentResult.rows[0];

    // Parse Excel
    const { questions, referenceOutputs } = await parseExcelFile(file.filepath);
    
    res.write(`data: ${JSON.stringify({ 
      type: 'start', 
      total: questions.length,
      agentName: agent.name 
    })}\n\n`);

    const results: any[] = [];
    let passedCount = 0;
    let failedCount = 0;
    let totalTokens = 0;
    let totalCost = 0;
    const startTime = Date.now();
    const delayBetweenRequests = (60 / rpm) * 1000;

    // Execute tests
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      // Send progress
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        current: i + 1,
        total: questions.length,
        question: question,
        status: 'testing'
      })}\n\n`);

      const result = await callAgentAPI(agent.api_key, agent.region, question);

      let questionTokens = 0;
      let questionCost = 0;
      if (result.success && result.usage) {
        questionTokens = result.usage.tokens?.total_tokens || 0;
        questionCost = result.usage.credits?.total_credits || 0;
        totalTokens += questionTokens;
        totalCost += questionCost;
      }

      const resultData = {
        question,
        success: result.success,
        response: result.response || '',
        error: result.error || '',
        responseTime: result.responseTime,
        referenceOutput: referenceOutputs[i] || '',
        tokens: questionTokens,
        cost: questionCost,
        timestamp: new Date().toISOString(),
      };
      
      results.push(resultData);

      if (result.success) passedCount++;
      else failedCount++;

      // Send result
      res.write(`data: ${JSON.stringify({
        type: 'result',
        current: i + 1,
        total: questions.length,
        question: question,
        response: result.response || result.error,
        success: result.success,
        responseTime: result.responseTime,
        tokens: questionTokens
      })}\n\n`);

      if (i < questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
      }
    }

    const totalDuration = Date.now() - startTime;
    const successRate = (passedCount / questions.length) * 100;

    // Send completion
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      summary: {
        totalQuestions: questions.length,
        passedCount,
        failedCount,
        successRate,
        durationSeconds: Math.floor(totalDuration / 1000),
        totalTokens,
        totalCost
      }
    })}\n\n`);

    res.end();

  } catch (error: any) {
    console.error('SSE Error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  } finally {
    await pool.end();
  }
}
