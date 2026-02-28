#!/usr/bin/env node
/**
 * 重试输出为 undefined 的题目，合并后生成完整报告
 * 用法: node scripts/retry-undefined.js <报告xlsx路径> [rpm]
 * 例如: node scripts/retry-undefined.js test_output/test_report_2026-02-27T08-39-32.xlsx 15
 * 注意: 请从项目根目录运行此脚本
 */

import XLSX from 'xlsx';
import fs from 'fs';

const AGENT = {
  name: 'totogroup',
  region: 'TH',
  api_key: 'app-0Cd6kL6RdPgric2mce6qbHLC',
  custom_base_url: null,
};

function getBaseUrl(region, customBaseUrl) {
  if (region === 'CUSTOM' && customBaseUrl) return customBaseUrl;
  if (region === 'SG') return 'https://api-sg.gptbots.ai';
  if (region === 'TH') return 'https://api-th.gptbots.ai';
  return 'https://api.gptbots.cn';
}

function extractResponseText(messageData) {
  if (!messageData.output || !Array.isArray(messageData.output)) return '';
  const parts = [];
  for (const o of messageData.output) {
    const c = o.content;
    if (!c) continue;
    if (typeof c === 'string') {
      parts.push(c);
      continue;
    }
    if (c.text && typeof c.text === 'string') parts.push(c.text);
    if (c.audio && Array.isArray(c.audio)) {
      for (const a of c.audio) {
        if (a.transcript) parts.push(a.transcript);
      }
    }
  }
  return parts.filter(Boolean).join('\n');
}

async function callAgentAPI(apiKey, region, question, customBaseUrl) {
  const startTime = Date.now();
  try {
    const baseUrl = getBaseUrl(region, customBaseUrl);
    const convRes = await fetch(`${baseUrl}/v1/conversation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ user_id: 'test_user_' + Date.now() }),
    });
    if (!convRes.ok) {
      const err = await convRes.json().catch(() => ({}));
      return { success: false, error: err.message || `创建对话失败 (${convRes.status})`, responseTime: Date.now() - startTime };
    }
    const convData = await convRes.json();
    const conversationId = convData.conversation_id;
    if (!conversationId) {
      return { success: false, error: '未获取到conversation_id', responseTime: Date.now() - startTime };
    }

    const msgRes = await fetch(`${baseUrl}/v2/conversation/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        conversation_id: conversationId,
        response_mode: 'blocking',
        messages: [{ role: 'user', content: [{ type: 'text', text: question }] }],
      }),
    });
    const responseTime = Date.now() - startTime;
    if (!msgRes.ok) {
      const err = await msgRes.json().catch(() => ({}));
      return { success: false, error: err.message || `发送消息失败 (${msgRes.status})`, responseTime, conversationId };
    }
    const msgData = await msgRes.json();
    const responseText = extractResponseText(msgData);
    return {
      success: true,
      response: responseText,
      responseTime,
      conversationId,
      messageId: msgData.message_id,
      usage: msgData.usage,
    };
  } catch (e) {
    return { success: false, error: e.message || '网络错误', responseTime: Date.now() - startTime };
  }
}

function generateMarkdownReportEn(data) {
  let md = `# Agent API Test Report\n\n`;
  md += `**Agent Name**: ${data.agentName}\n`;
  md += `**Test Date**: ${data.testDate}\n`;
  md += `**RPM**: ${data.rpm}\n\n`;
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Total Questions | ${data.totalQuestions} |\n`;
  md += `| Passed | ${data.passedCount} |\n`;
  md += `| Failed | ${data.failedCount} |\n`;
  md += `| Success Rate | ${data.successRate}% |\n`;
  md += `| Avg Response Time | ${((data.avgResponseTime || 0) / 1000).toFixed(2)}s |\n`;
  md += `| Duration | ${data.durationSeconds}s |\n`;
  md += `| Token Usage | ${data.totalTokens || 0} |\n`;
  md += `| Credits | ${(data.totalCost || 0).toFixed(4)} |\n`;
  md += `| Total USD Cost | $${((data.totalCost || 0) / 100).toFixed(4)} |\n`;
  md += `| *Conversion* | *100 credits = 1 USD (GPTBots)* |\n\n`;
  md += `## Detailed Results\n\n`;
  data.results.forEach((r, i) => {
    const output = (r.response != null && r.response !== '') ? r.response : (r.error || '(no response)');
    md += `### Question ${i + 1}\n\n`;
    md += `**Question**: ${r.question}\n\n`;
    if (r.referenceOutput) md += `**Reference Answer**: ${r.referenceOutput}\n\n`;
    md += `**Actual Output**: ${output}\n\n`;
    md += `**Response Time**: ${((r.responseTime || 0) / 1000).toFixed(2)}s\n\n`;
    if (r.tokens) md += `**Token Usage**: ${r.tokens}\n\n`;
    if (r.cost != null) md += `**Credits**: ${r.cost.toFixed(4)}\n\n`;
    md += `---\n\n`;
  });
  return md;
}

async function main() {
  const reportPath = process.argv[2] || 'test_output/test_report_2026-02-27T08-39-32.xlsx';
  const rpm = Math.min(parseInt(process.argv[3]) || 15, 20);
  const delay = 60000 / rpm;

  if (!fs.existsSync(reportPath)) {
    console.error('❌ 报告文件不存在:', reportPath);
    process.exit(1);
  }

  const wb = XLSX.read(fs.readFileSync(reportPath), { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  const results = [];
  const toRetry = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const seq = r['序号'];
    if (seq === '汇总' || seq === undefined) continue;

    const question = r['问题'] || '';
    const referenceOutput = r['参考答案'] || '';
    const actualOutput = r['实际输出'];
    const isUndefined = actualOutput === 'undefined' || actualOutput === undefined || actualOutput === null || String(actualOutput).trim() === '';

    const rec = {
      question,
      referenceOutput,
      response: isUndefined ? undefined : actualOutput,
      error: undefined,
      responseTime: r['响应时间(ms)'] || 0,
      tokens: r['Token消耗'] || 0,
      cost: r['成本'] != null ? parseFloat(r['成本']) : 0,
      success: r['状态'] === '成功',
    };

    results.push(rec);
    if (isUndefined && question) toRetry.push({ index: results.length - 1, question, referenceOutput });
  }

  console.log(`\n📋 共 ${results.length} 题，其中 ${toRetry.length} 题输出为 undefined，将重试\n`);
  if (toRetry.length === 0) {
    console.log('✅ 无需要重试的题目');
    const testData = buildTestData(results);
    const outPath = reportPath.replace(/\.xlsx$/, '_complete_en.md');
    fs.writeFileSync(outPath, generateMarkdownReportEn(testData));
    console.log('📁 完整报告已保存:', outPath);
    return;
  }

  for (let i = 0; i < toRetry.length; i++) {
    const { index, question } = toRetry[i];
    process.stdout.write(`\r⏳ 重试 ${i + 1}/${toRetry.length} - ${question.slice(0, 40)}...`);
    const r = await callAgentAPI(AGENT.api_key, AGENT.region, question, AGENT.custom_base_url);

    results[index] = {
      question,
      referenceOutput: toRetry[i].referenceOutput,
      response: r.response || '',
      error: r.error,
      responseTime: r.responseTime,
      tokens: r.usage?.tokens?.total_tokens || 0,
      cost: r.usage?.credits?.total_credits || 0,
      success: r.success,
    };

    if (i < toRetry.length - 1) await new Promise((resolve) => setTimeout(resolve, delay));
  }

  console.log('\n\n✅ 重试完成\n');

  const testData = buildTestData(results);
  const outPath = reportPath.replace(/\.xlsx$/, '_complete_en.md');
  fs.writeFileSync(outPath, generateMarkdownReportEn(testData));

  console.log('📊 汇总:');
  console.log(`   总题数: ${testData.totalQuestions}`);
  console.log(`   成功: ${testData.passedCount}`);
  console.log(`   失败: ${testData.failedCount}`);
  console.log(`   成功率: ${testData.successRate}%`);
  console.log(`   Token: ${testData.totalTokens}`);
  console.log(`   积分消耗: ${testData.totalCost.toFixed(4)}\n`);
  console.log('📁 完整英文报告已保存:', outPath);
}

function buildTestData(results) {
  const passedCount = results.filter((r) => r.success).length;
  const totalTokens = results.reduce((s, r) => s + (r.tokens || 0), 0);
  const totalCost = results.reduce((s, r) => s + (r.cost || 0), 0);
  const avgResponseTime = results.length > 0
    ? Math.round(results.reduce((s, r) => s + (r.responseTime || 0), 0) / results.length)
    : 0;
  return {
    agentName: AGENT.name,
    totalQuestions: results.length,
    passedCount,
    failedCount: results.length - passedCount,
    successRate: results.length > 0 ? ((passedCount / results.length) * 100).toFixed(2) : '0.00',
    durationSeconds: 0,
    avgResponseTime,
    totalTokens,
    totalCost,
    rpm: 15,
    testDate: new Date().toISOString(),
    results,
  };
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
