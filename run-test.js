#!/usr/bin/env node
/**
 * 独立测试脚本 - 不依赖前端连接
 * 用法: node run-test.js <excel文件路径> [rpm]
 * 例如: node run-test.js test_sample/测试集模板.xlsx 60
 */

import XLSX from 'xlsx';
import fs from 'fs';

// 配置
const AGENT = {
  id: 1,
  name: 'mzt-QA',
  model_name: 'MiniMax-M2',
  region: 'CUSTOM',
  api_key: 'app-m3goCK2a07T1FHYi9XVPnUug',
  custom_base_url: 'http://27.156.118.33:40443',
};

function getBaseUrl(region, customBaseUrl) {
  if (region === 'CUSTOM' && customBaseUrl) {
    return customBaseUrl;
  }
  return region === 'SG' ? 'https://api.gptbots.ai' : 'https://api.gptbots.cn';
}

function parseExcelFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet);

  const questions = [];
  const referenceOutputs = [];

  for (const row of data) {
    const input = row.input || row.Input || row.INPUT;
    if (input && typeof input === 'string' && input.trim()) {
      questions.push(input.trim());
      const refOutput = row.reference_output || row.Reference_Output || row.REFERENCE_OUTPUT || '';
      referenceOutputs.push(typeof refOutput === 'string' ? refOutput.trim() : '');
    }
  }

  return { questions, referenceOutputs };
}

async function callAgentAPI(apiKey, region, question, customBaseUrl) {
  const startTime = Date.now();

  try {
    const baseUrl = getBaseUrl(region, customBaseUrl);

    // Step 1: Create conversation
    const conversationResponse = await fetch(`${baseUrl}/v1/conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ user_id: 'test_user_' + Date.now() }),
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

    // Step 2: Send message
    const messageResponse = await fetch(`${baseUrl}/v2/conversation/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        response_mode: 'blocking',
        messages: [{ role: 'user', content: [{ type: 'text', text: question }] }],
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!messageResponse.ok) {
      const errorData = await messageResponse.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `发送消息失败 (${messageResponse.status})`,
        responseTime,
        conversationId,
      };
    }

    const messageData = await messageResponse.json();

    let responseText = '';
    if (messageData.output && Array.isArray(messageData.output)) {
      responseText = messageData.output
        .map((o) => o.content?.text || '')
        .filter((t) => t)
        .join('\n');
    }

    return {
      success: true,
      response: responseText,
      responseTime,
      conversationId,
      messageId: messageData.message_id,
      usage: messageData.usage,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || '网络错误',
      responseTime: Date.now() - startTime,
    };
  }
}

function generateMarkdownReport(data) {
  let markdown = `# Agent API 测试报告\n\n`;
  markdown += `**Agent名称**: ${data.agentName}\n`;
  markdown += `**测试时间**: ${data.testDate}\n`;
  markdown += `**RPM**: ${data.rpm}\n\n`;

  markdown += `## 测试汇总\n\n`;
  markdown += `| 指标 | 值 |\n`;
  markdown += `|------|----|\n`;
  markdown += `| 总问题数 | ${data.totalQuestions} |\n`;
  markdown += `| 成功数 | ${data.passedCount} |\n`;
  markdown += `| 失败数 | ${data.failedCount} |\n`;
  markdown += `| 成功率 | ${data.successRate}% |\n`;
  markdown += `| 平均响应时间 | ${data.avgResponseTime}ms |\n`;
  markdown += `| 总耗时 | ${data.durationSeconds}s |\n\n`;

  markdown += `## 详细结果\n\n`;
  data.results.forEach((r, index) => {
    markdown += `### 问题 ${index + 1}\n\n`;
    markdown += `**问题**: ${r.question}\n\n`;
    if (r.referenceOutput) {
      markdown += `**参考答案**: ${r.referenceOutput}\n\n`;
    }
    markdown += `**实际输出**: ${r.response || r.error}\n\n`;
    markdown += `**状态**: ${r.success ? '✅ 成功' : '❌ 失败'}\n\n`;
    markdown += `**响应时间**: ${r.responseTime}ms\n\n`;
    markdown += `---\n\n`;
  });

  return markdown;
}

function generateExcelReport(data) {
  const rows = data.results.map((r, index) => ({
    '序号': index + 1,
    '问题': r.question,
    '参考答案': r.referenceOutput || '',
    '实际输出': r.response || r.error,
    '状态': r.success ? '成功' : '失败',
    '响应时间(ms)': r.responseTime,
  }));

  const summaryRow = {
    '序号': '汇总',
    '问题': `Agent: ${data.agentName}`,
    '参考答案': `总问题数: ${data.totalQuestions}`,
    '实际输出': `成功: ${data.passedCount}, 失败: ${data.failedCount}`,
    '状态': `成功率: ${data.successRate}%`,
    '响应时间(ms)': `平均: ${data.avgResponseTime}ms`,
  };

  rows.unshift(summaryRow);

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '测试报告');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

async function runTest(excelPath, rpm = 60) {
  console.log('\n🚀 开始测试...\n');
  console.log(`📋 Agent: ${AGENT.name}`);
  console.log(`📁 测试文件: ${excelPath}`);
  console.log(`⏱️  RPM: ${rpm}\n`);

  // Parse Excel
  const { questions, referenceOutputs } = parseExcelFile(excelPath);
  console.log(`📊 共 ${questions.length} 个测试问题\n`);

  const startTime = Date.now();
  const delay = 60000 / rpm;
  const results = [];

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const refOutput = referenceOutputs[i] || '';

    process.stdout.write(`\r⏳ 进度: ${i + 1}/${questions.length} - ${question.slice(0, 40)}...`);

    const result = await callAgentAPI(
      AGENT.api_key,
      AGENT.region,
      question,
      AGENT.custom_base_url
    );

    results.push({
      question,
      referenceOutput: refOutput,
      response: result.response || '',
      success: result.success,
      error: result.error,
      responseTime: result.responseTime,
      conversationId: result.conversationId,
      messageId: result.messageId,
      timestamp: new Date().toISOString(),
    });

    // Rate limiting
    if (i < questions.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.log('\n\n✅ 测试完成!\n');

  // Calculate summary
  const passedCount = results.filter((r) => r.success).length;
  const failedCount = results.length - passedCount;
  const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
  const avgResponseTime = Math.round(
    results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length
  );
  const successRate = ((passedCount / results.length) * 100).toFixed(2);

  const testData = {
    agentName: AGENT.name,
    totalQuestions: results.length,
    passedCount,
    failedCount,
    successRate,
    durationSeconds,
    avgResponseTime,
    rpm,
    testDate: new Date().toISOString(),
    results,
  };

  // Generate reports
  const markdownReport = generateMarkdownReport(testData);
  const excelReport = generateExcelReport(testData);

  // Save to local directory
  const outputDir = './test_output';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const mdPath = `${outputDir}/test_report_${timestamp}.md`;
  const xlsxPath = `${outputDir}/test_report_${timestamp}.xlsx`;

  fs.writeFileSync(mdPath, markdownReport);
  fs.writeFileSync(xlsxPath, excelReport);

  console.log('📊 测试汇总:');
  console.log(`   总问题数: ${results.length}`);
  console.log(`   成功: ${passedCount}`);
  console.log(`   失败: ${failedCount}`);
  console.log(`   成功率: ${successRate}%`);
  console.log(`   总耗时: ${durationSeconds}s`);
  console.log(`   平均响应时间: ${avgResponseTime}ms\n`);

  console.log('📁 报告已保存到:');
  console.log(`   - ${mdPath}`);
  console.log(`   - ${xlsxPath}\n`);
}

// Main
const args = process.argv.slice(2);
const excelPath = args[0] || 'test_sample/测试集模板.xlsx';
const rpm = parseInt(args[1]) || 60;

if (!fs.existsSync(excelPath)) {
  console.error(`❌ 文件不存在: ${excelPath}`);
  process.exit(1);
}

runTest(excelPath, rpm).catch((err) => {
  console.error('❌ 测试失败:', err);
  process.exit(1);
});

