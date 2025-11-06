import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Prisma Client lazily
let prisma: any;

async function getPrismaClient() {
  if (!prisma) {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return prisma;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const prismaClient = await getPrismaClient();

    if (req.method === 'GET') {
      const agents = await prismaClient.agent.findMany({
        orderBy: [{ lastUsed: 'desc' }, { name: 'asc' }],
      });

      const maskedAgents = agents.map((agent: any) => ({
        ...agent,
        apiKey: agent.apiKey.length > 14
          ? `${agent.apiKey.slice(0, 10)}***${agent.apiKey.slice(-4)}`
          : '***',
      }));

      return res.json(maskedAgents);
    }

    if (req.method === 'POST') {
      const { name, modelName, region, apiKey } = req.body;

      console.log('Create agent request:', { name, modelName, region });

      if (!name || !region || !apiKey) {
        return res.status(400).json({ error: '缺少必填字段' });
      }

      if (!['SG', 'CN'].includes(region)) {
        return res.status(400).json({ error: '无效的区域' });
      }

      const agent = await prismaClient.agent.create({
        data: { 
          name, 
          modelName: modelName || null,
          region, 
          apiKey, 
          status: 'active' 
        },
      });

      console.log('Created agent:', { id: agent.id, name: agent.name, modelName: agent.modelName });

      return res.status(201).json({
        ...agent,
        apiKey: `${agent.apiKey.slice(0, 10)}***${agent.apiKey.slice(-4)}`,
      });
    }

    return res.status(405).json({ error: '方法不允许' });
  } catch (error: any) {
    console.error('Agents API Error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    return res.status(500).json({ 
      error: '服务器错误',
      message: error.message,
      code: error.code
    });
  }
}
