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
  markdown += `| 积分消耗 | ${(data.totalCost || 0).toFixed(4)} |\n`;
  markdown += `| 总成本(USD) | $${((data.totalCost || 0) / 100).toFixed(4)} |\n`;
  markdown += `| *换算* | *100积分=1美元 (GPTBots)* |\n`;
  if (data.evaluation) {
    markdown += `| 评估模型 | ${data.evaluation.evaluatorAgentName} |\n`;
    if (data.evaluation.avgScore) markdown += `| 平均评分 | ${data.evaluation.avgScore} |\n`;
  }
  markdown += `\n`;
  markdown += `## 详细结果\n\n`;
  data.results.forEach((r: any, index: number) => {
    const retryBadge = r.retryCount > 0 ? ` 🔄 (重试${r.retryCount}次后成功)` : '';
    markdown += `### 问题 ${index + 1}${retryBadge}\n\n`;
    markdown += `**问题**: ${r.question}\n\n`;
    if (r.referenceOutput) markdown += `**参考答案**: ${r.referenceOutput}\n\n`;
    markdown += `**实际输出**: ${r.response || r.error}\n\n`;
    if (r.evaluation) {
      markdown += `**AI评估**:\n\n${r.evaluation.evalText || r.evaluation.analysis || ''}\n\n`;
    }
    markdown += `**响应时间**: ${((r.responseTime || 0) / 1000).toFixed(2)}s\n\n`;
    if (r.tokens) markdown += `**Token消耗**: ${r.tokens}\n\n`;
    if (r.cost != null) markdown += `**积分**: ${r.cost.toFixed(4)}\n\n`;
    markdown += `---\n\n`;
  });
  return markdown;
}

function generateExcelReport(data: any): Buffer {
  const rows = data.results.map((r: any, index: number) => {
    const row: any = {
      '序号': index + 1, '问题': r.question, '参考答案': r.referenceOutput || '',
      '实际输出': r.response || r.error, '状态': r.success ? '成功' : '失败',
      '重试次数': r.retryCount || 0, '响应时间(ms)': r.responseTime,
      'Token消耗': r.tokens || 0, '积分': r.cost ?? 0, '时间戳': r.timestamp || new Date().toISOString(),
    };
    if (r.evaluation) {
      row['AI评估'] = r.evaluation.evalText || r.evaluation.analysis || '';
    }
    return row;
  });
  const summaryRow: any = {
    '序号': '汇总', '问题': `Agent: ${data.agentName}`, '参考答案': `总问题数: ${data.totalQuestions}`,
    '实际输出': `成功: ${data.passedCount}, 失败: ${data.failedCount}`, '状态': `成功率: ${data.successRate}%`,
    '响应时间(ms)': `平均: ${data.avgResponseTime}ms`, 'Token消耗': data.totalTokens || 0,
    '积分': (data.totalCost || 0).toFixed(4), '时间戳': data.testDate,
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

async function handleSave(req: VercelRequest, res: VercelResponse) {
  const { results, testConfig, durationSeconds, totalTokens, totalCost, evaluation } = req.body || {};
  if (!results || !testConfig) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  const passedCount = results.filter((r: any) => r.success).length;
  const failedCount = results.length - passedCount;
  const avgResponseTime = results.length > 0 ? Math.round(results.reduce((sum: number, r: any) => sum + (r.responseTime || 0), 0) / results.length) : 0;
  const successRate = results.length > 0 ? (passedCount / results.length * 100).toFixed(2) : '0.00';
  const retriedCount = results.filter((r: any) => r.retryCount && r.retryCount > 0).length;
  // 从 results 汇总 tokens/cost，确保重试后的数据准确
  const computedTotalTokens = results.reduce((sum: number, r: any) => sum + (r.tokens || 0), 0);
  const computedTotalCost = results.reduce((sum: number, r: any) => sum + (r.cost || 0), 0);
  const testData = {
    agentId: testConfig.agentId, agentName: testConfig.agentName, totalQuestions: results.length,
    passedCount, failedCount, successRate, durationSeconds: durationSeconds || 0, avgResponseTime,
    executionMode: testConfig.executionMode || 'sequential', maxConcurrency: testConfig.maxConcurrency || 2,
    requestDelay: testConfig.requestDelay || 0, totalTokens: computedTotalTokens || totalTokens || 0, totalCost: computedTotalCost || totalCost || 0,
    testDate: new Date().toISOString(), results: results.map((r: any) => ({ ...r, retryCount: r.retryCount || 0 })), retriedCount,
    evaluation: evaluation || undefined,
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
      JSON.stringify({ status: 'completed', results: testData.results, totalTokens: testData.totalTokens, totalCost: testData.totalCost, ...(evaluation ? { evaluation } : {}) })],
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
    const tokens = r.success && r.usage?.tokens ? (r.usage.tokens.total_tokens || 0) : 0;
    const cost = r.success && r.usage?.credits ? (r.usage.credits.total_credits || 0) : 0;
    return { type: 'result', questionIndex: q.questionIndex, question: q.question, referenceOutput: q.referenceOutput || '', response: r.response || '', success: r.success, error: r.error, responseTime: r.responseTime, tokens, cost, conversationId: r.conversationId, messageId: r.messageId, isRetry: true, timestamp: new Date().toISOString() };
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

// --- Evaluate logic ---
const DEFAULT_EVAL_SYSTEM_PROMPT = `你是一名专业的答案评估专家。请将测试答案与参考答案进行对比，分两段简要描述：

第一段：给出语义匹配度评分（0-100分），并用一句话说明评分理由。
第二段：简要分析（不超过150字）测试答案与参考答案的异同，包括内容准确性、语气措辞是否恰当等。

直接用自然语言回复，不要使用JSON或其他格式。`;

function buildEvalUserMessage(question: string, referenceAnswer: string, testAnswer: string): string {
  return `测试问题: ${question}

参考答案: ${referenceAnswer}

测试答案: ${testAnswer}

请对比测试答案与参考答案，给出评估结果。`;
}

function extractScoreFromText(text: string): number {
  const m = text.match(/(\d{1,3})\s*[分\/]/);
  if (m) return Math.min(100, Math.max(0, parseInt(m[1])));
  const m2 = text.match(/匹配度[：:]\s*(\d{1,3})/);
  if (m2) return Math.min(100, Math.max(0, parseInt(m2[1])));
  const m3 = text.match(/(\d{1,3})%/);
  if (m3) return Math.min(100, Math.max(0, parseInt(m3[1])));
  return 0;
}

async function handleEvaluate(req: VercelRequest, res: VercelResponse) {
  const { evaluatorAgentId, results, executionMode, maxConcurrency, requestDelay, systemPrompt } = req.body || {};
  if (!evaluatorAgentId || !results?.length) {
    return res.status(400).json({ error: '缺少必要参数 (evaluatorAgentId, results)' });
  }
  const pool = getPool();
  const agentResult = await pool.query('SELECT * FROM agents WHERE id = $1', [parseInt(evaluatorAgentId, 10)]);
  if (agentResult.rows.length === 0) return res.status(404).json({ error: '评估模型不存在' });
  const agent = agentResult.rows[0];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.write(`data: ${JSON.stringify({ type: 'eval_connected', totalQuestions: results.length })}\n\n`);

  const isParallel = executionMode === 'parallel';
  const concurrency = parseInt(maxConcurrency) || 2;
  const delay = parseInt(requestDelay) || 0;
  const evalResults: any[] = [];

  const evaluateOne = async (r: any, idx: number) => {
    const question = r.question || '';
    const referenceOutput = r.referenceOutput || '';
    const testAnswer = r.response || r.error || '';
    if (!referenceOutput) return null;
    if (!testAnswer) {
      return { questionIndex: idx, evalText: '缺少测试答案', score: 0 };
    }
    const prompt = buildEvalUserMessage(question, referenceOutput, testAnswer);
    const evalPrompt = systemPrompt || DEFAULT_EVAL_SYSTEM_PROMPT;
    const fullPrompt = `${evalPrompt}\n\n${prompt}`;
    const apiResult = await callAgentAPI(agent.api_key, agent.region, fullPrompt, agent.custom_base_url);
    if (!apiResult.success || !apiResult.response) {
      return { questionIndex: idx, evalText: `评估失败: ${apiResult.error || '无响应'}`, score: 0 };
    }
    const evalText = apiResult.response.trim();
    const score = extractScoreFromText(evalText);
    return { questionIndex: idx, evalText, score };
  };

  const needsEval = results.filter((r: any) => !!(r.referenceOutput));
  const totalToEval = needsEval.length;

  if (isParallel) {
    for (let i = 0; i < results.length; i += concurrency) {
      const batch = results.slice(i, i + concurrency);
      res.write(`data: ${JSON.stringify({ type: 'eval_progress', current: evalResults.length + 1, total: totalToEval })}\n\n`);
      const batchResults = await Promise.all(batch.map((r: any, bIdx: number) => evaluateOne(r, i + bIdx)));
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
}

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });

  const action = req.query?.action as string;

  try {
    if (action === 'save') return await handleSave(req, res);
    if (action === 'retry') return await handleRetry(req, res);
    if (action === 'evaluate') return await handleEvaluate(req, res);
    return res.status(404).json({ error: '未知操作' });
  } catch (error: any) {
    console.error('[tests-actions] Error:', error);
    if (!res.headersSent) return res.status(500).json({ error: error.message || '服务器错误' });
    try { res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`); res.end(); } catch (_) {}
  }
}
