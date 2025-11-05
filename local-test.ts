import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Parse Excel file and extract test questions
async function parseExcelFile(filePath: string): Promise<string[]> {
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet);

  console.log('📊 Excel 数据预览:');
  console.log(JSON.stringify(data.slice(0, 3), null, 2));

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

// Mock Agent API call (replace with real API)
async function callAgentAPI(apiKey: string, region: string, question: string): Promise<{ 
  success: boolean; 
  response?: string; 
  error?: string; 
  responseTime: number;
}> {
  const startTime = Date.now();
  
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    const responseTime = Date.now() - startTime;
    
    // Simulate 80% success rate
    const success = Math.random() > 0.2;
    
    if (success) {
      return {
        success: true,
        response: `模拟回答：${question.substring(0, 50)}...`,
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

// Execute tests
async function executeTests(
  apiKey: string,
  region: string,
  questions: string[],
  executionMode: string,
  rpm: number
) {
  console.log(`\n🚀 开始执行测试...`);
  console.log(`📌 执行模式: ${executionMode === 'parallel' ? '并行' : '串行'}`);
  console.log(`⚡ RPM限制: ${rpm}`);
  console.log(`📝 问题数量: ${questions.length}\n`);

  const startTime = Date.now();
  const results = [];
  const delayBetweenRequests = (60 * 1000) / rpm;

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    
    console.log(`[${i + 1}/${questions.length}] 执行中...`);
    const result = await callAgentAPI(apiKey, region, question);
    results.push({
      question,
      ...result,
    });

    // Rate limiting
    if (i < questions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
    }
  }

  const passedCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  const totalQuestions = questions.length;
  const successRate = totalQuestions > 0 ? (passedCount / totalQuestions) * 100 : 0;
  const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

  console.log(`\n✅ 测试完成!`);
  console.log(`📊 统计: ${passedCount}/${totalQuestions} 通过 (${successRate.toFixed(2)}%)`);
  console.log(`⏱️  总耗时: ${durationSeconds}秒`);
  console.log(`📈 平均响应: ${Math.round(avgResponseTime)}ms\n`);

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

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
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
    const questionPreview = r.question.length > 50 ? r.question.substring(0, 50) + '...' : r.question;
    md += `| ${i + 1} | ${questionPreview} | ${status} | ${r.responseTime} |\n`;
  });

  return md;
}

// Main test function
async function runTest() {
  try {
    console.log('🎯 Agent API 测试平台 - 本地测试\n');
    console.log('=' .repeat(50));

    // Configuration
    const config = {
      apiKey: 'app-uwMHXO95dlUZeUKkM7C8VtTW',
      region: 'SG',
      agentName: 'Test Agent (SG)',
      excelFile: './test1.xlsx',
      executionMode: 'sequential',
      rpm: 60,
    };

    console.log('⚙️  配置信息:');
    console.log(`   Agent: ${config.agentName}`);
    console.log(`   Region: ${config.region}`);
    console.log(`   API Key: ${config.apiKey.substring(0, 15)}...`);
    console.log(`   Excel: ${config.excelFile}`);

    // Parse Excel
    console.log('\n📖 读取Excel文件...');
    const questions = await parseExcelFile(config.excelFile);
    console.log(`✅ 成功读取 ${questions.length} 个问题\n`);

    if (questions.length === 0) {
      console.error('❌ 错误: Excel文件中未找到有效的测试问题');
      return;
    }

    // Execute tests
    const testResults = await executeTests(
      config.apiKey,
      config.region,
      questions,
      config.executionMode,
      config.rpm
    );

    // Prepare test data
    const testData = {
      agentName: config.agentName,
      testDate: new Date(),
      ...testResults,
      executionMode: config.executionMode,
      rpm: config.rpm,
      jsonData: { results: testResults.results },
    };

    // Generate Excel report
    console.log('📊 生成Excel报告...');
    const excelBuffer = generateExcelReport(testData);
    const excelPath = './test_output/test_report.xlsx';
    fs.mkdirSync('./test_output', { recursive: true });
    fs.writeFileSync(excelPath, excelBuffer);
    console.log(`✅ Excel报告已保存: ${excelPath}`);

    // Generate Markdown report
    console.log('📝 生成Markdown报告...');
    const markdownContent = generateMarkdownReport(testData);
    const mdPath = './test_output/test_report.md';
    fs.writeFileSync(mdPath, markdownContent, 'utf-8');
    console.log(`✅ Markdown报告已保存: ${mdPath}`);

    // Generate JSON report
    console.log('💾 生成JSON报告...');
    const jsonPath = './test_output/test_report.json';
    fs.writeFileSync(jsonPath, JSON.stringify(testData, null, 2), 'utf-8');
    console.log(`✅ JSON报告已保存: ${jsonPath}`);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 测试完成! 所有报告已生成到 test_output/ 目录\n');

  } catch (error: any) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runTest();

