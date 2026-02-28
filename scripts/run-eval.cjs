#!/usr/bin/env node
/**
 * Standalone script to run AI evaluation on an existing test report
 * Usage: node scripts/run-eval.cjs
 * Note: Run from project root directory
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const LOCAL_SERVER = 'http://localhost:3001';
const EVALUATOR_AGENT_ID = 4; // mzt评估
const REPORT_TIMESTAMP = '2026-02-28T03-58-31';

async function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    const req = http.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(new Error('JSON parse failed: ' + Buffer.concat(chunks).toString().slice(0, 200))); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function callEvalSSE(body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(`${LOCAL_SERVER}/api/tests/evaluate?stream=true`);
    const postData = JSON.stringify(body);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
    };
    const req = http.request(reqOptions, (res) => {
      let buffer = '';
      const evalResults = [];
      let summary = null;
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'eval_result') {
              evalResults.push(data);
              process.stdout.write(`\r  评估进度: ${evalResults.length} 题`);
            } else if (data.type === 'eval_complete') {
              summary = data;
            } else if (data.type === 'eval_progress') {
              process.stdout.write(`\r  发送中: ${data.current}/${data.total}`);
            }
          } catch (e) {}
        }
      });
      res.on('end', () => {
        console.log();
        resolve({ evalResults, summary });
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('📊 获取测试历史...');
  const historyResp = await fetchJSON(`${LOCAL_SERVER}/api/history`);
  const history = historyResp.data?.[0];
  if (!history) { console.error('未找到历史记录'); process.exit(1); }

  const results = history.jsonData?.results || [];
  console.log(`  找到测试记录 #${history.id}: ${history.agentName}, ${results.length} 个问题`);

  const withRef = results.filter(r => r.referenceOutput);
  console.log(`  其中 ${withRef.length} 个问题有参考答案，将进行评估`);

  console.log(`\n🤖 开始 AI 评估 (评估模型 ID: ${EVALUATOR_AGENT_ID})...`);
  const { evalResults, summary } = await callEvalSSE({
    evaluatorAgentId: EVALUATOR_AGENT_ID,
    results: results.map(r => ({
      question: r.question,
      referenceOutput: r.referenceOutput || '',
      response: r.response || '',
      error: r.error,
    })),
    executionMode: 'sequential',
    requestDelay: 500,
  });

  console.log(`✅ 评估完成: ${evalResults.length} 题`);
  if (summary) {
    console.log(`  平均评分: ${summary.avgScore}, 评估模型: ${summary.evaluatorName}`);
  }

  // Merge evaluation into results
  const evalMap = new Map(evalResults.map(er => [er.questionIndex, er]));
  const mergedResults = results.map((r, idx) => {
    const ev = evalMap.get(idx);
    if (ev) {
      return { ...r, evaluation: { evalText: ev.evalText, score: ev.score } };
    }
    return r;
  });

  // Build data object for report generation
  const evalSummary = summary ? {
    evaluatorAgentName: summary.evaluatorName,
    avgScore: summary.avgScore,
    evaluatedCount: summary.evaluatedCount,
  } : undefined;

  const testData = {
    agentName: history.agentName,
    testDate: history.testDate,
    executionMode: history.executionMode,
    maxConcurrency: history.maxConcurrency || 2,
    requestDelay: history.requestDelay || 0,
    retriedCount: mergedResults.filter(r => r.retryCount > 0).length,
    totalQuestions: mergedResults.length,
    passedCount: history.passedCount,
    failedCount: history.failedCount,
    successRate: history.successRate,
    avgResponseTime: history.avgResponseTime,
    durationSeconds: history.durationSeconds,
    totalTokens: history.jsonData?.totalTokens || mergedResults.reduce((s, r) => s + (r.tokens || 0), 0),
    totalCost: history.jsonData?.totalCost || mergedResults.reduce((s, r) => s + (r.cost || 0), 0),
    results: mergedResults,
    evaluation: evalSummary,
  };

  // Generate markdown (CN)
  const mdCN = generateMarkdownReport(testData);
  const mdEN = generateMarkdownReportEn(testData);

  const outputDir = './test_output';
  const mdPath = `${outputDir}/test_report_${REPORT_TIMESTAMP}.md`;
  const mdEnPath = `${outputDir}/test_report_${REPORT_TIMESTAMP}_en.md`;

  fs.writeFileSync(mdPath, mdCN);
  fs.writeFileSync(mdEnPath, mdEN);

  console.log(`\n📁 报告已更新:`);
  console.log(`   - ${mdPath}`);
  console.log(`   - ${mdEnPath}`);
}

function generateMarkdownReport(data) {
  let md = `# Agent API 测试报告\n\n`;
  md += `**Agent名称**: ${data.agentName}\n`;
  md += `**测试时间**: ${data.testDate}\n`;
  md += `**执行模式**: ${data.executionMode === 'parallel' ? '并行' : '串行'}\n`;
  if (data.executionMode === 'parallel') md += `**并发数**: ${data.maxConcurrency || 2}\n`;
  else md += `**请求间隔**: ${data.requestDelay || 0}ms\n`;
  if (data.retriedCount > 0) md += `**重试问题数**: ${data.retriedCount}\n`;
  md += `\n## 测试汇总\n\n| 指标 | 值 |\n|------|----|`;
  md += `\n| 总问题数 | ${data.totalQuestions} |`;
  md += `\n| 成功数 | ${data.passedCount} |`;
  md += `\n| 失败数 | ${data.failedCount} |`;
  md += `\n| 成功率 | ${data.successRate}% |`;
  md += `\n| 平均响应时间 | ${((data.avgResponseTime || 0) / 1000).toFixed(2)}s |`;
  md += `\n| 总耗时 | ${data.durationSeconds}s |`;
  md += `\n| Token消耗 | ${data.totalTokens || 0} |`;
  md += `\n| 积分消耗 | ${(data.totalCost || 0).toFixed(4)} |`;
  md += `\n| 总成本(USD) | $${((data.totalCost || 0) / 100).toFixed(4)} |`;
  md += `\n| *换算* | *100积分=1美元 (GPTBots)* |`;
  if (data.retriedCount > 0) md += `\n| 重试成功数 | ${data.retriedCount} |`;
  if (data.evaluation) {
    md += `\n| 评估模型 | ${data.evaluation.evaluatorAgentName} |`;
    if (data.evaluation.avgScore) md += `\n| 平均评分 | ${data.evaluation.avgScore} |`;
  }
  md += `\n\n## 详细结果\n\n`;
  data.results.forEach((r, i) => {
    const badge = r.retryCount > 0 ? ` 🔄 (重试${r.retryCount}次后成功)` : '';
    md += `### 问题 ${i + 1}${badge}\n\n`;
    md += `**问题**: ${r.question}\n\n`;
    if (r.referenceOutput) md += `**参考答案**: ${r.referenceOutput}\n\n`;
    md += `**实际输出**: ${r.response || r.error}\n\n`;
    if (r.evaluation) md += `**AI评估**:\n\n${r.evaluation.evalText || ''}\n\n`;
    md += `**响应时间**: ${((r.responseTime || 0) / 1000).toFixed(2)}s\n\n`;
    if (r.tokens) md += `**Token消耗**: ${r.tokens}\n\n`;
    if (r.cost != null) md += `**积分**: ${r.cost.toFixed(4)}\n\n`;
    md += `---\n\n`;
  });
  return md;
}

function generateMarkdownReportEn(data) {
  let md = `# Agent API Test Report\n\n`;
  md += `**Agent**: ${data.agentName}\n`;
  md += `**Test Date**: ${data.testDate}\n`;
  md += `**Mode**: ${data.executionMode === 'parallel' ? 'Parallel' : 'Sequential'}\n`;
  if (data.executionMode === 'parallel') md += `**Concurrency**: ${data.maxConcurrency || 2}\n`;
  else md += `**Request Delay**: ${data.requestDelay || 0}ms\n`;
  if (data.retriedCount > 0) md += `**Retried Questions**: ${data.retriedCount}\n`;
  md += `\n## Summary\n\n| Metric | Value |\n|--------|-------|`;
  md += `\n| Total Questions | ${data.totalQuestions} |`;
  md += `\n| Passed | ${data.passedCount} |`;
  md += `\n| Failed | ${data.failedCount} |`;
  md += `\n| Success Rate | ${data.successRate}% |`;
  md += `\n| Avg Response Time | ${((data.avgResponseTime || 0) / 1000).toFixed(2)}s |`;
  md += `\n| Duration | ${data.durationSeconds}s |`;
  md += `\n| Token Usage | ${data.totalTokens || 0} |`;
  md += `\n| Credits | ${(data.totalCost || 0).toFixed(4)} |`;
  md += `\n| Total USD Cost | $${((data.totalCost || 0) / 100).toFixed(4)} |`;
  md += `\n| *Conversion* | *100 credits = 1 USD (GPTBots)* |`;
  if (data.retriedCount > 0) md += `\n| Retried & Passed | ${data.retriedCount} |`;
  if (data.evaluation) {
    md += `\n| Evaluator | ${data.evaluation.evaluatorAgentName} |`;
    if (data.evaluation.avgScore) md += `\n| Avg Score | ${data.evaluation.avgScore} |`;
  }
  md += `\n\n## Detailed Results\n\n`;
  data.results.forEach((r, i) => {
    const badge = r.retryCount > 0 ? ` 🔄 (Passed after ${r.retryCount} retries)` : '';
    md += `### Question ${i + 1}${badge}\n\n`;
    md += `**Question**: ${r.question}\n\n`;
    if (r.referenceOutput) md += `**Reference Answer**: ${r.referenceOutput}\n\n`;
    md += `**Actual Output**: ${r.response || r.error || '(no response)'}\n\n`;
    if (r.evaluation) md += `**AI Evaluation**:\n\n${r.evaluation.evalText || ''}\n\n`;
    md += `**Response Time**: ${((r.responseTime || 0) / 1000).toFixed(2)}s\n\n`;
    if (r.tokens) md += `**Token Usage**: ${r.tokens}\n\n`;
    if (r.cost != null) md += `**Credits**: ${r.cost.toFixed(4)}\n\n`;
    md += `---\n\n`;
  });
  return md;
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
