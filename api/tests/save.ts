import type { VercelRequest, VercelResponse } from '@vercel/node';
import XLSX from 'xlsx';
import { Pool } from 'pg';

const getPool = () => new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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
  markdown += `\n`;
  markdown += `## 测试汇总\n\n`;
  markdown += `| 指标 | 值 |\n|------|----|\n`;
  markdown += `| 总问题数 | ${data.totalQuestions} |\n`;
  markdown += `| 成功数 | ${data.passedCount} |\n`;
  markdown += `| 失败数 | ${data.failedCount} |\n`;
  markdown += `| 成功率 | ${data.successRate}% |\n`;
  markdown += `| 平均响应时间 | ${data.avgResponseTime}ms |\n`;
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
    markdown += `**状态**: ${r.success ? '✅ 成功' : '❌ 失败'}${retryBadge}\n\n`;
    markdown += `**响应时间**: ${r.responseTime}ms\n\n`;
    if (r.tokens) markdown += `**Token消耗**: ${r.tokens}\n\n`;
    markdown += `---\n\n`;
  });
  return markdown;
}

function generateExcelReport(data: any): Buffer {
  const rows = data.results.map((r: any, index: number) => ({
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
  }));
  const summaryRow = {
    '序号': '汇总',
    '问题': `Agent: ${data.agentName}`,
    '参考答案': `总问题数: ${data.totalQuestions}`,
    '实际输出': `成功: ${data.passedCount}, 失败: ${data.failedCount}`,
    '状态': `成功率: ${data.successRate}%`,
    '响应时间(ms)': `平均: ${data.avgResponseTime}ms`,
    'Token消耗': data.totalTokens || 0,
    '成本': (data.totalCost || 0).toFixed(4),
    '时间戳': data.testDate,
  };
  rows.unshift(summaryRow);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '测试报告');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } };

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

  try {
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
      totalTokens: totalTokens || 0,
      totalCost: totalCost || 0,
      testDate: new Date().toISOString(),
      results: results.map((r: any) => ({ ...r, retryCount: r.retryCount || 0 })),
      retriedCount,
    };

    const markdownContent = generateMarkdownReport(testData);
    const excelBuffer = generateExcelReport(testData);

    const pool = getPool();
    const insertResult = await pool.query(
      `INSERT INTO test_history (
        agent_id, agent_name, total_questions, passed_count, failed_count,
        success_rate, duration_seconds, avg_response_time, execution_mode, rpm,
        excel_blob, markdown_blob, json_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        testConfig.agentId,
        testConfig.agentName,
        results.length,
        passedCount,
        failedCount,
        successRate,
        durationSeconds || 0,
        avgResponseTime,
        testConfig.executionMode || 'sequential',
        0,
        excelBuffer,
        Buffer.from(markdownContent, 'utf-8'),
        JSON.stringify({ status: 'completed', results: testData.results, totalTokens: testData.totalTokens, totalCost: testData.totalCost }),
      ]
    );

    const historyId = insertResult.rows[0].id;
    console.log('[save] Saved test with', results.length, 'results, history #', historyId);

    return res.json({ success: true, historyId, retriedCount });
  } catch (error: any) {
    console.error('[save] Error:', error);
    return res.status(500).json({ error: error.message || '服务器错误' });
  }
}
