import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './db.js';

function generateMarkdownReportEn(data: any): string {
  const fmtSec = (ms: number) => (ms / 1000).toFixed(2) + 's';
  let md = `# Agent API Test Report\n\n`;
  md += `**Agent Name**: ${data.agentName}\n`;
  md += `**Test Date**: ${typeof data.testDate === 'string' ? data.testDate : new Date(data.testDate).toISOString()}\n`;
  md += `**Execution Mode**: ${data.executionMode === 'parallel' ? 'Parallel' : 'Sequential'}\n`;
  md += `**Total Questions**: ${data.totalQuestions}\n\n`;
  md += `## Summary\n\n| Metric | Value |\n|--------|-------|\n`;
  md += `| Total Questions | ${data.totalQuestions} |\n`;
  md += `| Passed | ${data.passedCount} |\n`;
  md += `| Failed | ${data.failedCount} |\n`;
  md += `| Success Rate | ${data.successRate}% |\n`;
  md += `| Avg Response Time | ${fmtSec(data.avgResponseTime || 0)} |\n`;
  md += `| Duration | ${data.durationSeconds}s |\n`;
  md += `| Token Usage | ${data.totalTokens || 0} |\n`;
  md += `| Credits | ${(data.totalCost || 0).toFixed(4)} |\n`;
  md += `| Total USD Cost | $${((data.totalCost || 0) / 100).toFixed(4)} |\n`;
  md += `| *Conversion* | *100 credits = 1 USD (GPTBots)* |\n\n`;
  md += `## Detailed Results\n\n`;
  data.results.forEach((r: any, i: number) => {
    md += `### Question ${i + 1}\n\n`;
    md += `**Question**: ${r.question}\n\n`;
    if (r.referenceOutput) md += `**Reference Answer**: ${r.referenceOutput}\n\n`;
    md += `**Actual Output**: ${r.response || r.error}\n\n`;
    md += `**Response Time**: ${fmtSec(r.responseTime || 0)}\n\n`;
    if (r.tokens) md += `**Token Usage**: ${r.tokens}\n\n`;
    if (r.cost != null) md += `**Credits**: ${r.cost.toFixed(4)}\n\n`;
    md += `---\n\n`;
  });
  return md;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  // Health check (merged to reduce function count)
  if (req.query.__health === '1') {
    return res.json({ status: 'ok', timestamp: new Date().toISOString(), message: 'API运行正常' });
  }

  const pool = getDbPool();

  try {
    const { id, format } = req.query;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: '无效的历史记录 ID' });
    }

    const historyId = parseInt(id, 10);

    if (isNaN(historyId)) {
      return res.status(400).json({ error: '无效的历史记录 ID' });
    }

    const result = await pool.query(
      'SELECT * FROM test_history WHERE id = $1',
      [historyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '历史记录不存在' });
    }

    const history = result.rows[0];

    if (!format || Array.isArray(format)) {
      return res.status(400).json({ error: '请指定下载格式' });
    }

    // Handle different download formats
    if (format === 'excel') {
      if (!history.excel_blob) {
        return res.status(404).json({ error: 'Excel 报告不存在' });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="test_report_${history.id}.xlsx"`);
      return res.send(history.excel_blob);
    }

    if (format === 'markdown') {
      if (!history.markdown_blob) {
        return res.status(404).json({ error: 'Markdown 报告不存在' });
      }

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="test_report_${history.id}.md"`);
      return res.send(history.markdown_blob);
    }

    if (format === 'markdown-en') {
      const jsonData = history.json_data as any;
      if (!jsonData || !jsonData.results) {
        return res.status(404).json({ error: 'English Markdown 报告数据不存在' });
      }
      const testData = {
        agentName: history.agent_name,
        testDate: history.test_date,
        executionMode: history.execution_mode || 'sequential',
        maxConcurrency: 2,
        requestDelay: 0,
        totalQuestions: history.total_questions,
        passedCount: history.passed_count,
        failedCount: history.failed_count,
        successRate: parseFloat(String(history.success_rate)),
        avgResponseTime: history.avg_response_time,
        durationSeconds: history.duration_seconds,
        totalTokens: jsonData.totalTokens || 0,
        totalCost: jsonData.totalCost || 0,
        results: jsonData.results,
      };
      const markdownEn = generateMarkdownReportEn(testData);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="test_report_${history.id}_en.md"`);
      return res.send(Buffer.from(markdownEn, 'utf-8'));
    }

    if (format === 'json') {
      if (!history.json_data) {
        return res.status(404).json({ error: 'JSON 数据不存在' });
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="test_report_${history.id}.json"`);
      return res.json(history.json_data);
    }

    return res.status(400).json({ error: '不支持的下载格式' });

  } catch (error: any) {
    console.error('Download API Error:', error);
    return res.status(500).json({
      error: '服务器错误',
      message: error.message,
    });
  } finally {
    await pool.end();
  }
}
