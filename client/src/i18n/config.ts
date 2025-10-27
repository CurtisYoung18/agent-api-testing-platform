import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  zh: {
    translation: {
      // Navigation
      'nav.test': '测试',
      'nav.agents': 'Agents',
      'nav.history': '历史记录',
      'nav.platform': '测试平台',
      
      // Test Page
      'test.title': '新建测试',
      'test.selectAgent': '选择Agent',
      'test.searchAgent': '搜索或选择agent...',
      'test.noAgentPrompt': '选择一个agent开始测试。前往Agents页面添加新的agent。',
      'test.uploadData': '上传测试数据',
      'test.dragDrop': '拖拽Excel文件',
      'test.orClickBrowse': '或点击浏览',
      'test.supported': '支持: .xlsx, .xls',
      'test.template': '模板: 必须包含 \'input\' 列',
      'test.configuration': '测试配置',
      'test.executionMode': '执行模式',
      'test.parallel': '并行',
      'test.sequential': '串行',
      'test.rateLimit': '速率限制 (RPM)',
      'test.requestsPerMinute': '请求/分钟',
      'test.startTest': '开始测试',
      'test.selectAgentAndFile': '请选择agent并上传测试文件',
      
      // Agents Page
      'agents.title': 'Agent管理',
      'agents.addAgent': '添加Agent',
      'agents.search': '搜索agents...',
      'agents.active': '活跃',
      'agents.lastUsed': '最后使用',
      'agents.never': '从未',
      'agents.edit': '编辑',
      'agents.delete': '删除',
      'agents.noAgents': '未找到agents',
      'agents.addFirst': '添加你的第一个Agent',
      'agents.showing': '显示',
      'agents.count': '个agent(s)',
      
      // History Page
      'history.title': '测试历史',
      'history.search': '搜索...',
      'history.allResults': '所有结果',
      'history.successOnly': '仅成功 (>80%)',
      'history.failedTests': '失败测试 (<80%)',
      'history.newestFirst': '最新优先',
      'history.oldestFirst': '最旧优先',
      'history.successRate': '成功率 (高到低)',
      'history.excel': 'Excel',
      'history.markdown': 'MD',
      'history.json': 'JSON',
      'history.viewDetails': '查看详情',
      'history.delete': '删除',
      'history.noHistory': '暂无测试历史',
      'history.noHistoryDesc': '运行你的第一个测试以查看结果',
      'history.runFirstTest': '运行第一个测试',
      'history.previous': '上一页',
      'history.next': '下一页',
      'history.page': '第',
      'history.of': '页，共',
      'history.pages': '页',
      
      // Common
      'common.loading': '加载中...',
      'common.error': '错误',
      'common.success': '成功',
      'common.cancel': '取消',
      'common.save': '保存',
      'common.confirm': '确认',
    },
  },
  en: {
    translation: {
      // Navigation
      'nav.test': 'Test',
      'nav.agents': 'Agents',
      'nav.history': 'History',
      'nav.platform': 'Testing Platform',
      
      // Test Page
      'test.title': 'New Test',
      'test.selectAgent': 'Select Agent',
      'test.searchAgent': 'Search or select agent...',
      'test.noAgentPrompt': 'Select an agent to start testing. Go to Agents page to add new agents.',
      'test.uploadData': 'Upload Test Data',
      'test.dragDrop': 'Drag & Drop Excel File',
      'test.orClickBrowse': 'or Click to Browse',
      'test.supported': 'Supported: .xlsx, .xls',
      'test.template': 'Template: Must include \'input\' column',
      'test.configuration': 'Test Configuration',
      'test.executionMode': 'Execution Mode',
      'test.parallel': 'Parallel',
      'test.sequential': 'Sequential',
      'test.rateLimit': 'Rate Limit (RPM)',
      'test.requestsPerMinute': 'requests per minute',
      'test.startTest': 'Start Test',
      'test.selectAgentAndFile': 'Please select an agent and upload a test file',
      
      // Agents Page
      'agents.title': 'Agent Management',
      'agents.addAgent': 'Add Agent',
      'agents.search': 'Search agents...',
      'agents.active': 'Active',
      'agents.lastUsed': 'Last used',
      'agents.never': 'Never',
      'agents.edit': 'Edit',
      'agents.delete': 'Delete',
      'agents.noAgents': 'No agents found',
      'agents.addFirst': 'Add Your First Agent',
      'agents.showing': 'Showing',
      'agents.count': 'agent(s)',
      
      // History Page
      'history.title': 'Test History',
      'history.search': 'Search...',
      'history.allResults': 'All Results',
      'history.successOnly': 'Success Only (>80%)',
      'history.failedTests': 'Failed Tests (<80%)',
      'history.newestFirst': 'Newest First',
      'history.oldestFirst': 'Oldest First',
      'history.successRate': 'Success Rate (High to Low)',
      'history.excel': 'Excel',
      'history.markdown': 'MD',
      'history.json': 'JSON',
      'history.viewDetails': 'View Details',
      'history.delete': 'Delete',
      'history.noHistory': 'No test history yet',
      'history.noHistoryDesc': 'Run your first test to see results here',
      'history.runFirstTest': 'Run Your First Test',
      'history.previous': 'Previous',
      'history.next': 'Next',
      'history.page': 'Page',
      'history.of': 'of',
      'history.pages': '',
      
      // Common
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.success': 'Success',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.confirm': 'Confirm',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

