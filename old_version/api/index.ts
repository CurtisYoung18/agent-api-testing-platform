import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, method } = req;
  const path = url?.split('/api')[1] || '/';

  try {
    // GET /api/agents
    if (path === '/agents' && method === 'GET') {
      const agents = await prisma.agent.findMany({
        orderBy: [{ lastUsed: 'desc' }, { name: 'asc' }],
      });

      const maskedAgents = agents.map((agent) => ({
        ...agent,
        apiKey: agent.apiKey.length > 14
          ? `${agent.apiKey.slice(0, 10)}***${agent.apiKey.slice(-4)}`
          : '***',
      }));

      return res.json(maskedAgents);
    }

    // POST /api/agents
    if (path === '/agents' && method === 'POST') {
      const { name, region, apiKey } = req.body;

      if (!name || !region || !apiKey) {
        return res.status(400).json({ error: '缺少必填字段' });
      }

      if (!['SG', 'CN'].includes(region)) {
        return res.status(400).json({ error: '无效的区域' });
      }

      const agent = await prisma.agent.create({
        data: { name, region, apiKey, status: 'active' },
      });

      return res.status(201).json({
        ...agent,
        apiKey: `${agent.apiKey.slice(0, 10)}***${agent.apiKey.slice(-4)}`,
      });
    }

    // GET /api/history
    if (path.startsWith('/history') && method === 'GET') {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const total = await prisma.testHistory.count();
      const history = await prisma.testHistory.findMany({
        orderBy: { testDate: 'desc' },
        skip,
        take: limit,
        include: {
          agent: {
            select: { id: true, name: true, region: true },
          },
        },
      });

      return res.json({
        data: history,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Health check
    if (path === '/health' && method === 'GET') {
      return res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'API运行正常'
      });
    }

    // 404
    return res.status(404).json({ 
      error: '未找到API端点',
      path,
      method 
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: '服务器错误',
      message: error.message 
    });
  }
}
