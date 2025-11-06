import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import XLSX from 'xlsx';
import fs from 'fs/promises';

// Initialize Prisma Client - create new instance for each request to avoid cache issues
async function getPrismaClient() {
  const { PrismaClient } = await import('@prisma/client');
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

// Parse Excel file and extract test questions with optional reference outputs
async function parseExcelFile(filePath: string): Promise<{ questions: string[]; referenceOutputs: string[] }> {
  const fileBuffer = await fs.readFile(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet);

  // Extract 'input' column and optional 'reference_output' column (matching old Python version)
  const questions: string[] = [];
  const referenceOutputs: string[] = [];
  
  for (const row of data) {
    const input = (row as any).input || (row as any).Input || (row as any).INPUT;
    if (input && typeof input === 'string' && input.trim()) {
      questions.push(input.trim());
      
      // Read reference_output if exists (matching Python version)
      const refOutput = (row as any).reference_output || (row as any).Reference_Output || (row as any).REFERENCE_OUTPUT || '';
      referenceOutputs.push(typeof refOutput === 'string' ? refOutput.trim() : '');
    }
  }

  // Ensure referenceOutputs has the same length as questions
  while (referenceOutputs.length < questions.length) {
    referenceOutputs.push('');
  }

  return { questions, referenceOutputs };
}

// Call Agent API using GPTBots Conversation API (matching old Python version)
async function callAgentAPI(apiKey: string, region: string, question: string): Promise<{ 
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
    // Step 1: Create conversation_id
    const baseUrl = region === 'SG' 
      ? 'https://api-sg.gptbots.ai' 
      : region === 'CN'
      ? 'https://api.gptbots.cn'
      : 'https://api-cn.gptbots.ai';

    // Generate a unique user_id for this test session
    const userId = `test_user_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create conversation
    const conversationResponse = await fetch(`${baseUrl}/v1/conversation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
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
    const conversationId = conversationData.conversation_id;

    if (!conversationId) {
      return {
        success: false,
        error: '未获取到conversation_id',
        responseTime: Date.now() - startTime,
      };
    }

    // Step 2: Send message (matching old Python version format)
    const messageResponse = await fetch(`${baseUrl}/v2/conversation/message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        response_mode: 'blocking',
        messages: [
          {
            role: 'user',
            content: question  // Send as string, matching Python version
          },
        ],
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

    // Extract text response from output (matching Python version)
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
      usage: messageData.usage || null,  // Include usage data for cost tracking
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || '网络请求失败',
      responseTime: Date.now() - startTime,
    };
  }
}

// Execute tests with rate limiting (matching old Python version behavior)
async function executeTests(
  agent: any,
  questions: string[],
  referenceOutputs: string[],
  executionMode: string,
  rpm: number
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
  const startTime = Date.now();
  const results: any[] = [];
  let totalTokens = 0;
  let totalCost = 0.0;

  const delayBetweenRequests = (60 * 1000) / rpm; // milliseconds between requests

  if (executionMode === 'parallel') {
    // Parallel execution with rate limiting (batch processing)
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      // Call API
      const result = await callAgentAPI(agent.apiKey, agent.region, question);
      // Track usage (matching old Python version)
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
        referenceOutput: i < referenceOutputs.length ? referenceOutputs[i] : '',  // Add reference output
        tokens: questionTokens,  // Add token count for this question
        cost: questionCost,  // Add cost for this question
      };
      results.push(resultData);

      // Rate limiting
      if (i < questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
      }
    }
  } else {
    // Sequential execution (matching old Python delay_seconds)
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
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
        referenceOutput: i < referenceOutputs.length ? referenceOutputs[i] : '',  // Add reference output
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

      // Rate limiting delay (matching old Python delay_seconds)
      if (i < questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
      }
    }
  }

  const totalDuration = Date.now() - startTime;
  const passedCount = results.filter(r => r.success).length;
  const failedCount = results.length - passedCount;
  const successRate = results.length > 0 ? (passedCount / results.length) * 100 : 0;
  const avgResponseTime = results.length > 0 
    ? results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length 
    : 0;

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

// Generate Excel report (matching old Python version format)
function generateExcelReport(testData: any): Buffer {
  const wb = XLSX.utils.book_new();
  
  // Summary sheet (matching Python version)
  const summaryData = [
    ['统计项', '值'],
    ['Agent名称', testData.agentName],
    ['测试时间', new Date(testData.testDate).toLocaleString('zh-CN')],
    ['总测试数量', testData.totalQuestions],
    ['成功数量', testData.passedCount],
    ['失败数量', testData.failedCount],
    ['成功率(%)', `${testData.successRate.toFixed(2)}%`],
    ['总Token消耗', testData.totalTokens || 0],
    ['总成本', testData.totalCost ? testData.totalCost.toFixed(4) : '0.0000'],
    ['执行时长(秒)', testData.durationSeconds],
    ['平均响应时间(ms)', testData.avgResponseTime],
    ['执行模式', testData.executionMode === 'parallel' ? '并行' : '串行'],
    ['RPM', testData.rpm],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, '统计汇总');

  // Results sheet (matching Python version)
  const resultsData = [
    ['序号', '问题', 'Agent回复', '参考答案', '测试状态', '错误信息', '测试时间', '对话ID', '消息ID', '响应时间(ms)'],
    ...testData.jsonData.results.map((r: any, i: number) => [
      i + 1,
      r.question,
      r.response || '',
      r.referenceOutput || '',  // Include reference output
      r.success ? '成功' : '失败',
      r.error || '',
      r.timestamp ? new Date(r.timestamp).toLocaleString('zh-CN') : '',
      r.conversationId || '',
      r.messageId || '',
      r.responseTime,
    ]),
  ];
  
  const resultsSheet = XLSX.utils.aoa_to_sheet(resultsData);
  XLSX.utils.book_append_sheet(wb, resultsSheet, '测试结果');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// Process images in text for Markdown (matching Python version)
function processImagesInText(text: string): string {
  let processed = text;
  
  // Convert HTML img tags to Markdown
  processed = processed.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/g, '![图片]($1)');
  
  // Convert plain image URLs to Markdown
  const imageUrlPattern = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^\s]*)?)/g;
  processed = processed.replace(imageUrlPattern, '![图片]($1)');
  
  return processed;
}

// Generate Markdown report (matching old Python version format)
function generateMarkdownReport(testData: any): string {
  const currentTime = new Date().toLocaleString('zh-CN');
  
  let md = `# 📊 Agent API 测试结果报告\n\n`;
  md += `**报告生成时间**: ${currentTime}  \n`;
  md += `**Agent名称**: ${testData.agentName}  \n`;
  md += `**总测试数量**: ${testData.totalQuestions}  \n`;
  md += `**成功数量**: ${testData.passedCount}  \n`;
  md += `**失败数量**: ${testData.failedCount}  \n`;
  md += `**成功率**: ${testData.successRate.toFixed(2)}%  \n\n`;
  md += `---\n\n`;
  
  // Statistics summary (matching Python version)
  md += `## 📈 统计汇总\n\n`;
  md += `| 统计项 | 数值 |\n`;
  md += `|--------|------|\n`;
  md += `| 🎯 总测试数量 | ${testData.totalQuestions} |\n`;
  md += `| ✅ 成功数量 | ${testData.passedCount} |\n`;
  md += `| ❌ 失败数量 | ${testData.failedCount} |\n`;
  md += `| 📊 成功率 | ${testData.successRate.toFixed(2)}% |\n`;
  md += `| 🔧 总Token消耗 | ${(testData.totalTokens || 0).toLocaleString()} |\n`;
  md += `| 💰 总成本 | ${testData.totalCost ? testData.totalCost.toFixed(4) : '0.0000'} |\n`;
  md += `| ⏱️ 总耗时 | ${testData.durationSeconds}秒 |\n`;
  md += `| ⚡ 平均响应时间 | ${testData.avgResponseTime}ms |\n`;
  md += `| 🔄 执行模式 | ${testData.executionMode === 'parallel' ? '并行' : '串行'} |\n`;
  md += `| 🚀 RPM | ${testData.rpm} |\n\n`;
  md += `---\n\n`;
  
  // Detailed results (matching Python version)
  md += `## 📋 详细测试结果\n\n`;
  
  testData.jsonData.results.forEach((r: any, i: number) => {
    const status = r.success ? '✅ 成功' : '❌ 失败';
    md += `### ${status} 问题 ${i + 1}\n\n`;
    md += `**问题**: ${r.question}\n`;
    md += `**测试时间**: ${r.timestamp ? new Date(r.timestamp).toLocaleString('zh-CN') : '未知'}\n\n`;
    
    // Display reference output if exists (matching Python version)
    if (r.referenceOutput && r.referenceOutput.trim()) {
      md += `**📋 参考答案**:\n\n`;
      md += `${r.referenceOutput}\n\n`;
    }
    
    if (r.success) {
      const processedResponse = processImagesInText(r.response || '');
      md += `**🤖 Agent回复**:\n\n`;
      md += `${processedResponse}\n\n`;
    } else {
      md += `**❌ 错误信息**: ${r.error}\n\n`;
    }
    
    md += `---\n\n`;
  });
  
  // Failure analysis (matching Python version)
  const failedResults = testData.jsonData.results.filter((r: any) => !r.success);
  if (failedResults.length > 0) {
    md += `## ❌ 失败分析\n\n`;
    md += `共有 **${failedResults.length}** 个测试失败:\n\n`;
    
    failedResults.forEach((r: any, i: number) => {
      md += `**${i + 1}.** ${r.question.substring(0, 60)}${r.question.length > 60 ? '...' : ''}\n`;
      md += `   - ❌ ${r.error}\n\n`;
    });
  }
  
  return md;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
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
    console.log('=== Tests API Request Started ===');
    const prismaClient = await getPrismaClient();

    try {
      // Parse form data
      console.log('Parsing form data...');
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const agentId = fields.agentId?.[0];
    const executionMode = (fields.executionMode?.[0] || 'sequential') as string;
    const rpm = parseInt(fields.rpm?.[0] || '60', 10);
    const file = files.file?.[0];

    console.log('Request params:', { agentId, executionMode, rpm, hasFile: !!file });

    if (!agentId || !file) {
      console.error('Missing required fields:', { agentId: !!agentId, file: !!file });
      return res.status(400).json({ error: '缺少必填字段' });
    }

    // Get agent info
    console.log('Fetching agent:', agentId);
    const agent = await prismaClient.agent.findUnique({
      where: { id: parseInt(agentId, 10) },
    });

    if (!agent) {
      console.error('Agent not found:', agentId);
      return res.status(404).json({ error: 'Agent 不存在' });
    }

    console.log('Agent found:', { id: agent.id, name: agent.name, region: agent.region });

    // Parse Excel file
    console.log('Parsing Excel file:', file.filepath);
    const { questions, referenceOutputs } = await parseExcelFile(file.filepath);
    console.log('Excel parsed:', { questionCount: questions.length });

    if (questions.length === 0) {
      return res.status(400).json({ error: 'Excel文件中未找到有效的测试问题（请确保有"input"列）' });
    }

    // Execute tests
    console.log('Starting test execution...');
    const testResults = await executeTests(agent, questions, referenceOutputs, executionMode, rpm);
    console.log('Test execution completed:', {
      totalQuestions: testResults.totalQuestions,
      passedCount: testResults.passedCount,
      failedCount: testResults.failedCount,
      successRate: testResults.successRate
    });

    const testData = {
      agentName: agent.name,
      testDate: new Date(),
      ...testResults,
      executionMode,
      rpm,
      jsonData: { results: testResults.results },
    };

    // Generate reports
    console.log('Generating reports...');
    const excelBuffer = generateExcelReport(testData);
    const markdownContent = generateMarkdownReport(testData);
    console.log('Reports generated:', { excelSize: excelBuffer.length, markdownSize: markdownContent.length });

    // Save to database
    console.log('Saving to database...');
    const testHistory = await prismaClient.testHistory.create({
      data: {
        agentId: agent.id,
        agentName: agent.name,
        totalQuestions: testResults.totalQuestions,
        passedCount: testResults.passedCount,
        failedCount: testResults.failedCount,
        successRate: testResults.successRate,
        durationSeconds: testResults.durationSeconds,
        avgResponseTime: testResults.avgResponseTime,
        executionMode,
        rpm,
        excelBlob: excelBuffer,
        markdownBlob: Buffer.from(markdownContent, 'utf-8'),
        jsonData: {
          status: 'completed',
          results: testResults.results,
          totalTokens: testResults.totalTokens,
          totalCost: testResults.totalCost,
        },
      },
    });

    console.log('Test history saved:', { id: testHistory.id });

    // Update agent's lastUsed timestamp
    console.log('Updating agent lastUsed...');
    await prismaClient.agent.update({
      where: { id: agent.id },
      data: { lastUsed: new Date() },
    });

    console.log('=== Tests API Request Completed Successfully ===');
    return res.status(201).json({
      id: testHistory.id,
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
    });
    } finally {
      // Always disconnect Prisma client
      await prismaClient.$disconnect();
    }
  } catch (error: any) {
    console.error('=== Tests API Error ===');
    console.error('Error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    return res.status(500).json({
      error: '服务器错误',
      message: error.message,
    });
  }
}
