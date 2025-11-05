import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';

// Initialize Prisma Client lazily
let prisma: any;

async function getPrismaClient() {
  if (!prisma) {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
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
      const executionMode = fields.executionMode?.[0] || 'parallel';
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

      // TODO: Process the Excel file and run tests
      // For now, create a mock test result
      const mockResult = {
        agentId: agent.id,
        agentName: agent.name,
        totalQuestions: 10,
        passedCount: 8,
        failedCount: 2,
        successRate: 80.0,
        durationSeconds: 120,
        avgResponseTime: 1.5,
        executionMode,
        rpm,
        jsonData: {
          status: 'completed',
          results: [],
        },
      };

      const testHistory = await prismaClient.testHistory.create({
        data: mockResult,
      });

      // Update agent's lastUsed timestamp
      await prismaClient.agent.update({
        where: { id: agent.id },
        data: { lastUsed: new Date() },
      });

      return res.status(201).json({
        id: testHistory.id,
        message: '测试已创建并开始执行',
        testHistory,
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

