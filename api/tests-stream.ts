import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import XLSX from 'xlsx';
import fs from 'fs/promises';

// Initialize Prisma Client lazily
let prisma: any;

async function getPrismaClient() {
  if (!prisma) {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

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
async function callAgentAPI(apiKey: string, region: string, question: string): Promise<any> {
  const startTime = Date.now();
  
  try {
    const baseUrl = region === 'SG' 
      ? 'https://api-sg.gptbots.ai' 
      : region === 'CN'
      ? 'https://api.gptbots.cn'
      : 'https://api-cn.gptbots.ai';

    const userId = `test_user_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create conversation
    const conversationResponse = await fetch(`${baseUrl}/v1/conversation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId }),
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
    const conversationId = conversationData.conversation_id;

    if (!conversationId) {
      return {
        success: false,
        error: '未获取到conversation_id',
        responseTime: Date.now() - startTime,
      };
    }

    // Send message
    const messageResponse = await fetch(`${baseUrl}/v2/conversation/message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        response_mode: 'blocking',
        messages: [{ role: 'user', content: question }],
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

export const config = {
  api: {
    bodyParser: false,
  },
};

// SSE streaming endpoint for real-time test updates
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const prismaClient = await getPrismaClient();

    // Parse form data
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const agentId = fields.agentId?.[0];
    const executionMode = (fields.executionMode?.[0] || 'sequential') as string;
    const rpm = parseInt(fields.rpm?.[0] || '60', 10);
    const file = files.file?.[0];

    if (!agentId || !file) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: '缺少必填字段' })}\n\n`);
      return res.end();
    }

    // Get agent info
    const agent = await prismaClient.agent.findUnique({
      where: { id: parseInt(agentId, 10) },
    });

    if (!agent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Agent 不存在' })}\n\n`);
      return res.end();
    }

    // Parse Excel file
    const { questions, referenceOutputs } = await parseExcelFile(file.filepath);

    if (questions.length === 0) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Excel文件中未找到有效的测试问题' })}\n\n`);
      return res.end();
    }

    // Send initial info
    res.write(`data: ${JSON.stringify({ 
      type: 'init', 
      totalQuestions: questions.length,
      agentName: agent.name
    })}\n\n`);

    // Execute tests with streaming updates
    const results: any[] = [];
    let totalTokens = 0;
    let totalCost = 0.0;
    const startTime = Date.now();
    const delayBetweenRequests = (60 * 1000) / rpm;

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      // Send progress update
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        current: i + 1,
        total: questions.length,
        question: question,
      })}\n\n`);

      // Call API
      const result = await callAgentAPI(agent.apiKey, agent.region, question);
      
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
      };
      results.push(resultData);

      // Track usage
      if (result.success && result.usage) {
        if (result.usage.tokens) {
          totalTokens += result.usage.tokens.total_tokens || 0;
        }
        if (result.usage.credits) {
          totalCost += result.usage.credits.total_credits || 0;
        }
      }

      // Send result update
      const passedCount = results.filter(r => r.success).length;
      const successRate = results.length > 0 ? (passedCount / results.length) * 100 : 0;

      res.write(`data: ${JSON.stringify({
        type: 'result',
        index: i,
        result: resultData,
        stats: {
          current: i + 1,
          total: questions.length,
          passedCount,
          failedCount: results.length - passedCount,
          successRate: successRate.toFixed(2),
        }
      })}\n\n`);

      // Rate limiting
      if (i < questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
      }
    }

    // Calculate final stats
    const totalDuration = Date.now() - startTime;
    const passedCount = results.filter(r => r.success).length;
    const failedCount = results.length - passedCount;
    const successRate = results.length > 0 ? (passedCount / results.length) * 100 : 0;
    const avgResponseTime = results.length > 0 
      ? results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length 
      : 0;

    // Generate and save reports (reuse from tests.ts)
    const XLSX = await import('xlsx');
    
    const testData = {
      agentName: agent.name,
      testDate: new Date(),
      totalQuestions: questions.length,
      passedCount,
      failedCount,
      successRate,
      durationSeconds: Math.floor(totalDuration / 1000),
      avgResponseTime: Math.round(avgResponseTime),
      totalTokens,
      totalCost,
      executionMode,
      rpm,
      jsonData: { results },
    };

    // Simple report generation (inline)
    const wb = XLSX.default.utils.book_new();
    const summaryData = [
      ['统计项', '值'],
      ['Agent名称', testData.agentName],
      ['总测试数量', testData.totalQuestions],
      ['成功数量', testData.passedCount],
      ['失败数量', testData.failedCount],
      ['成功率(%)', `${testData.successRate.toFixed(2)}%`],
    ];
    const summarySheet = XLSX.default.utils.aoa_to_sheet(summaryData);
    XLSX.default.utils.book_append_sheet(wb, summarySheet, '统计汇总');

    const resultsData = [
      ['序号', '问题', 'Agent回复', '参考答案', '状态'],
      ...results.map((r: any, i: number) => [
        i + 1,
        r.question,
        r.response || '',
        r.referenceOutput || '',
        r.success ? '成功' : '失败',
      ]),
    ];
    const resultsSheet = XLSX.default.utils.aoa_to_sheet(resultsData);
    XLSX.default.utils.book_append_sheet(wb, resultsSheet, '测试结果');
    const excelBuffer = XLSX.default.write(wb, { type: 'buffer', bookType: 'xlsx' });

    let markdown = `# 📊 测试报告\n\n## 统计汇总\n\n`;
    markdown += `- 成功率: ${testData.successRate.toFixed(2)}%\n`;
    markdown += `- 总问题数: ${testData.totalQuestions}\n\n`;

    // Save to database
    const testHistory = await prismaClient.testHistory.create({
      data: {
        agentId: agent.id,
        agentName: agent.name,
        totalQuestions: testData.totalQuestions,
        passedCount: testData.passedCount,
        failedCount: testData.failedCount,
        successRate: testData.successRate,
        durationSeconds: testData.durationSeconds,
        avgResponseTime: testData.avgResponseTime,
        executionMode,
        rpm,
        excelBlob: excelBuffer,
        markdownBlob: Buffer.from(markdown, 'utf-8'),
        jsonData: {
          status: 'completed',
          results,
          totalTokens,
          totalCost,
        },
      },
    });

    // Update agent's lastUsed
    await prismaClient.agent.update({
      where: { id: agent.id },
      data: { lastUsed: new Date() },
    });

    // Send completion
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      historyId: testHistory.id,
      summary: {
        totalQuestions: testData.totalQuestions,
        passedCount: testData.passedCount,
        failedCount: testData.failedCount,
        successRate: testData.successRate.toFixed(2),
        durationSeconds: testData.durationSeconds,
        totalTokens,
        totalCost: totalCost.toFixed(4),
      }
    })}\n\n`);

    res.end();

  } catch (error: any) {
    console.error('Tests Stream Error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
}

