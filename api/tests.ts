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

// Parse Excel file and extract test questions
async function parseExcelFile(filePath: string): Promise<string[]> {
  const fileBuffer = await fs.readFile(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet);

  // Extract 'input' column
  const questions: string[] = [];
  for (const row of data) {
    const input = (row as any).input || (row as any).Input || (row as any).INPUT;
    if (input && typeof input === 'string' && input.trim()) {
      questions.push(input.trim());
    }
  }

  return questions;
}

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

// Execute tests with rate limiting
async function executeTests(
  agent: any,
  questions: string[],
  executionMode: string,
  rpm: number
): Promise<{
  results: Array<{ question: string; success: boolean; response?: string; error?: string; responseTime: number }>;
  totalQuestions: number;
  passedCount: number;
  failedCount: number;
  successRate: number;
  durationSeconds: number;
  avgResponseTime: number;
}> {
  const startTime = Date.now();
  const results = [];
  const delayBetweenRequests = (60 * 1000) / rpm; // milliseconds between requests

  if (executionMode === 'parallel') {
    // Parallel execution with rate limiting
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      // Call API
      const result = await callAgentAPI(agent.apiKey, agent.region, question);
      results.push({
        question,
        ...result,
      });

      // Rate limiting
      if (i < questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
      }
    }
  } else {
    // Sequential execution
    for (const question of questions) {
      const result = await callAgentAPI(agent.apiKey, agent.region, question);
      results.push({
        question,
        ...result,
      });
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
    }
  }

  const passedCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  const totalQuestions = questions.length;
  const successRate = totalQuestions > 0 ? (passedCount / totalQuestions) * 100 : 0;
  const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

  return {
    results,
    totalQuestions,
    passedCount,
    failedCount,
    successRate,
    durationSeconds,
    avgResponseTime: Math.round(avgResponseTime),
  };
}

// Generate Excel report
function generateExcelReport(testData: any): Buffer {
  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = [
    ['测试摘要', ''],
    ['Agent名称', testData.agentName],
    ['测试时间', new Date(testData.testDate).toLocaleString('zh-CN')],
    ['总问题数', testData.totalQuestions],
    ['通过数', testData.passedCount],
    ['失败数', testData.failedCount],
    ['成功率', `${testData.successRate.toFixed(2)}%`],
    ['执行时长', `${testData.durationSeconds}秒`],
    ['平均响应时间', `${testData.avgResponseTime}ms`],
    ['执行模式', testData.executionMode === 'parallel' ? '并行' : '串行'],
    ['RPM', testData.rpm],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, '测试摘要');

  // Results sheet
  const resultsData = [
    ['序号', '问题', '状态', '响应', '错误信息', '响应时间(ms)'],
    ...testData.jsonData.results.map((r: any, i: number) => [
      i + 1,
      r.question,
      r.success ? '通过' : '失败',
      r.response || '',
      r.error || '',
      r.responseTime,
    ]),
  ];
  
  const resultsSheet = XLSX.utils.aoa_to_sheet(resultsData);
  XLSX.utils.book_append_sheet(wb, resultsSheet, '测试结果');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// Generate Markdown report
function generateMarkdownReport(testData: any): string {
  let md = `# 测试报告\n\n`;
  md += `## 测试摘要\n\n`;
  md += `- **Agent名称**: ${testData.agentName}\n`;
  md += `- **测试时间**: ${new Date(testData.testDate).toLocaleString('zh-CN')}\n`;
  md += `- **总问题数**: ${testData.totalQuestions}\n`;
  md += `- **通过数**: ${testData.passedCount}\n`;
  md += `- **失败数**: ${testData.failedCount}\n`;
  md += `- **成功率**: ${testData.successRate.toFixed(2)}%\n`;
  md += `- **执行时长**: ${testData.durationSeconds}秒\n`;
  md += `- **平均响应时间**: ${testData.avgResponseTime}ms\n`;
  md += `- **执行模式**: ${testData.executionMode === 'parallel' ? '并行' : '串行'}\n`;
  md += `- **RPM**: ${testData.rpm}\n\n`;

  md += `## 测试结果\n\n`;
  md += `| 序号 | 问题 | 状态 | 响应时间(ms) |\n`;
  md += `|------|------|------|-------------|\n`;
  
  testData.jsonData.results.forEach((r: any, i: number) => {
    const status = r.success ? '✅ 通过' : '❌ 失败';
    md += `| ${i + 1} | ${r.question.substring(0, 50)}... | ${status} | ${r.responseTime} |\n`;
  });

  return md;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const prismaClient = await getPrismaClient();

      // Parse form data
      const form = formidable({});
      const [fields, files] = await form.parse(req);

      const agentId = fields.agentId?.[0];
      const executionMode = (fields.executionMode?.[0] || 'parallel') as string;
      const rpm = parseInt(fields.rpm?.[0] || '60', 10);
      const file = files.file?.[0];

      if (!agentId || !file) {
        return res.status(400).json({ error: '缺少必填字段' });
      }

      // Get agent info
      const agent = await prismaClient.agent.findUnique({
        where: { id: parseInt(agentId, 10) },
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent 不存在' });
      }

      // Parse Excel file
      const questions = await parseExcelFile(file.filepath);

      if (questions.length === 0) {
        return res.status(400).json({ error: 'Excel文件中未找到有效的测试问题（请确保有"input"列）' });
      }

      // Execute tests
      const testResults = await executeTests(agent, questions, executionMode, rpm);

      // Generate reports
      const excelBuffer = generateExcelReport({
        agentName: agent.name,
        testDate: new Date(),
        ...testResults,
        executionMode,
        rpm,
        jsonData: { results: testResults.results },
      });

      const markdownContent = generateMarkdownReport({
        agentName: agent.name,
        testDate: new Date(),
        ...testResults,
        executionMode,
        rpm,
        jsonData: { results: testResults.results },
      });

      // Save to database
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
          },
        },
      });

      // Update agent's lastUsed timestamp
      await prismaClient.agent.update({
        where: { id: agent.id },
        data: { lastUsed: new Date() },
      });

      return res.status(201).json({
        id: testHistory.id,
        message: '测试执行完成',
        summary: {
          totalQuestions: testResults.totalQuestions,
          passedCount: testResults.passedCount,
          failedCount: testResults.failedCount,
          successRate: testResults.successRate.toFixed(2),
          durationSeconds: testResults.durationSeconds,
        },
      });
    } catch (error: any) {
      console.error('Tests API Error:', error);
      return res.status(500).json({
        error: '服务器错误',
        message: error.message,
      });
    }
  }

  return res.status(405).json({ error: '方法不允许' });
}
