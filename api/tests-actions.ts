/**
 * Combined handler for /api/tests/save and /api/tests/retry
 * Reduces Vercel serverless function count (Hobby plan limit: 12)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import XLSX from 'xlsx';
import { Pool } from 'pg';

const getPool = () => new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function getBaseUrl(region: string, customBaseUrl?: string | null): string {
  if (region === 'CUSTOM' && customBaseUrl) return customBaseUrl;
  if (region === 'SG') return 'https://api-sg.gptbots.ai';
  if (region === 'TH') return 'https://api-th.gptbots.ai';
  return 'https://api.gptbots.cn';
}

// --- Save logic ---
function generateMarkdownReport(data: any): string {
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
  markdown += `\n## 测试汇总\n\n| 指标 | 值 |\n|------|----|\n`;
  markdown += `| 总问题数 | ${data.totalQuestions} |\n`;
  markdown += `| 成功数 | ${data.passedCount} |\n`;
  markdown += `| 失败数 | ${data.failedCount} |\n`;
  markdown += `| 成功率 | ${data.successRate}% |\n`;
  markdown += `| 平均响应时间 | ${((data.avgResponseTime || 0) / 1000).toFixed(2)}s |\n`;
  markdown += `| 总耗时 | ${data.durationSeconds}s |\n`;
  markdown += `| Token消耗 | ${data.totalTokens || 0} |\n`;
  markdown += `| 总成本 | $${(data.totalCost || 0).toFixed(4)} |\n\n`;
  markdown += `## 详细结果\n\n`;
  data.results.forEach((r: any, index: number) => {
    const retryBadge = r.retryCount > 0 ? ` 🔄 (重试${r.retryCount}次后成功)` : '';
    markdown += `### 问题 ${index + 1}${retryBadge}\n\n`;
    markdown += `**问题**: ${r.question}\n\n`;
    if (r.referenceOutput) markdown += `**参考答案**: ${r.referenceOutput}\n\n`;
    markdown += `**实际输出**: ${r.response || r.error}\n\n`;
    markdown += `**响应时间**: ${((r.responseTime || 0) / 1000).toFixed(2)}s\n\n`;
    if (r.tokens) markdown += `**Token消耗**: ${r.tokens}\n\n`;
    markdown += `---\n\n`;
  });
  return markdown;
}

function generateExcelReport(data: any): Buffer {
  const rows = data.results.map((r: any, index: number) => ({
    '序号': index + 1, '问题': r.question, '参考答案': r.referenceOutput || '',
    '实际输出': r.response || r.error, '状态': r.success ? '成功' : '失败',
    '重试次数': r.retryCount || 0, '响应时间(ms)': r.responseTime,
    'Token消耗': r.tokens || 0, '成本': r.cost || 0, '时间戳': r.timestamp || new Date().toISOString(),
  }));
  rows.unshift({
    '序号': '汇总', '问题': `Agent: ${data.agentName}`, '参考答案': `总问题数: ${data.totalQuestions}`,
    '实际输出': `成功: ${data.passedCount}, 失败: ${data.failedCount}`, '状态': `成功率: ${data.successRate}%`,
    '响应时间(ms)': `平均: ${data.avgResponseTime}ms`, 'Token消耗': data.totalTokens || 0,
    '成本': (data.totalCost || 0).toFixed(4), '时间戳': data.testDate,
  });
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '测试报告');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

async function handleSave(req: VercelRequest, res: VercelResponse) {
  const { results, testConfig, durationSeconds, totalTokens, totalCost } = req.body || {};
  if (!results || !testConfig) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  const passedCount = results.filter((r: any) => r.success).length;
  const failedCount = results.length - passedCount;
  const avgResponseTime = Math.round(results.reduce((sum: number, r: any) => sum + (r.responseTime || 0), 0) / results.length);
  const successRate = (passedCount / results.length * 100).toFixed(2);
  const retriedCount = results.filter((r: any) => r.retryCount && r.retryCount > 0).length;
  const testData = {
    agentId: testConfig.agentId, agentName: testConfig.agentName, totalQuestions: results.length,
    passedCount, failedCount, successRate, durationSeconds: durationSeconds || 0, avgResponseTime,
    executionMode: testConfig.executionMode || 'sequential', maxConcurrency: testConfig.maxConcurrency || 2,
    requestDelay: testConfig.requestDelay || 0, totalTokens: totalTokens || 0, totalCost: totalCost || 0,
    testDate: new Date().toISOString(), results: results.map((r: any) => ({ ...r, retryCount: r.retryCount || 0 })), retriedCount,
  };
  const markdownContent = generateMarkdownReport(testData);
  const excelBuffer = generateExcelReport(testData);
  const pool = getPool();
  const insertResult = await pool.query(
    `INSERT INTO test_history (agent_id, agent_name, total_questions, passed_count, failed_count,
      success_rate, duration_seconds, avg_response_time, execution_mode, rpm,
      excel_blob, markdown_blob, json_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
    [testConfig.agentId, testConfig.agentName, results.length, passedCount, failedCount, successRate,
      durationSeconds || 0, avgResponseTime, testConfig.executionMode || 'sequential', 0,
      excelBuffer, Buffer.from(markdownContent, 'utf-8'),
      JSON.stringify({ status: 'completed', results: testData.results, totalTokens: testData.totalTokens, totalCost: testData.totalCost })],
  );
  return res.json({ success: true, historyId: insertResult.rows[0].id, retriedCount });
}

// --- Retry logic ---
async function callAgentAPI(apiKey: string, region: string, question: string, customBaseUrl?: string | null, customUserId?: string) {
  const startTime = Date.now();
  const userId = customUserId || ('test_user_' + Date.now());
  try {
    const baseUrl = getBaseUrl(region, customBaseUrl);
    const convRes = await fetch(`${baseUrl}/v1/conversation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ user_id: userId }),
    });
    if (!convRes.ok) {
      const err = await convRes.json().catch(() => ({}));
      return { success: false, error: err.message || `创建对话失败`, responseTime: Date.now() - startTime };
    }
    const convData = await convRes.json();
    const conversationId = convData.conversation_id;
    if (!conversationId) return { success: false, error: '未获取到conversation_id', responseTime: Date.now() - startTime };
    const msgRes = await fetch(`${baseUrl}/v2/conversation/message`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ conversation_id: conversationId, response_mode: 'blocking', messages: [{ role: 'user', content: [{ type: 'text', text: question }] }] }),
    });
    const responseTime = Date.now() - startTime;
    if (!msgRes.ok) {
      const err = await msgRes.json().catch(() => ({}));
      return { success: false, error: err.message || 'API调用失败', responseTime, conversationId };
    }
    const msgData = await msgRes.json();
    let responseText = '';
    if (msgData.output?.[0]?.content?.text) responseText = msgData.output[0].content.text;
    if (!responseText) return { success: false, error: 'API返回了空响应', responseTime, conversationId, messageId: msgData.message_id };
    return { success: true, response: responseText, responseTime, conversationId, messageId: msgData.message_id, usage: msgData.usage };
  } catch (e: any) {
    return { success: false, error: e.message || '网络请求失败', responseTime: Date.now() - startTime };
  }
}

async function handleRetry(req: VercelRequest, res: VercelResponse) {
  const { agentId, questions, executionMode, maxConcurrency, requestDelay, userId } = req.body || {};
  if (!questions?.length || !agentId) return res.status(400).json({ error: '缺少必要参数' });
  const pool = getPool();
  const agentResult = await pool.query('SELECT * FROM agents WHERE id = $1', [parseInt(agentId, 10)]);
  if (agentResult.rows.length === 0) return res.status(404).json({ error: 'Agent 不存在' });
  const agent = agentResult.rows[0];
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.write(`data: ${JSON.stringify({ type: 'connected', totalQuestions: questions.length })}\n\n`);
  const isParallel = executionMode === 'parallel';
  const concurrency = parseInt(maxConcurrency) || 2;
  const delay = parseInt(requestDelay) || 0;
  const results: any[] = [];
  const processQuestion = async (q: any) => {
    const r = await callAgentAPI(agent.api_key, agent.region, q.question, agent.custom_base_url, userId);
    return { type: 'result', questionIndex: q.questionIndex, question: q.question, referenceOutput: q.referenceOutput || '', response: r.response || '', success: r.success, error: r.error, responseTime: r.responseTime, conversationId: r.conversationId, messageId: r.messageId, isRetry: true, timestamp: new Date().toISOString() };
  };
  if (isParallel) {
    for (let i = 0; i < questions.length; i += concurrency) {
      const batch = questions.slice(i, i + concurrency);
      res.write(`data: ${JSON.stringify({ type: 'progress', current: i + 1, message: `重试 ${batch.length} 个问题...` })}\n\n`);
      const batchResults = await Promise.all(batch.map(processQuestion));
      for (const r of batchResults) { results.push(r); res.write(`data: ${JSON.stringify(r)}\n\n`); }
      if (i + concurrency < questions.length) await new Promise(r => setTimeout(r, 1000));
    }
  } else {
    for (let i = 0; i < questions.length; i++) {
      res.write(`data: ${JSON.stringify({ type: 'progress', current: i + 1, question: questions[i].question?.slice(0, 100) })}\n\n`);
      const r = await processQuestion(questions[i]);
      results.push(r);
      res.write(`data: ${JSON.stringify(r)}\n\n`);
      if (i < questions.length - 1 && delay > 0) await new Promise(r => setTimeout(r, delay));
    }
  }
  const passedCount = results.filter(r => r.success).length;
  const failedCount = results.length - passedCount;
  const successRate = results.length > 0 ? ((passedCount / results.length) * 100).toFixed(2) : '0.00';
  res.write(`data: ${JSON.stringify({ type: 'complete', retriedCount: results.length, passedCount, failedCount, successRate, results })}\n\n`);
  res.end();
}

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });

  const action = req.query?.action as string;
  const isSave = action === 'save';
  const isRetry = action === 'retry';

  try {
    if (isSave) return await handleSave(req, res);
    if (isRetry) return await handleRetry(req, res);
    return res.status(404).json({ error: '未知操作' });
  } catch (error: any) {
    console.error('[tests-actions] Error:', error);
    if (!res.headersSent) return res.status(500).json({ error: error.message || '服务器错误' });
    try { res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`); res.end(); } catch (_) {}
  }
}
