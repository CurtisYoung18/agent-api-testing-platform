import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Prisma Client lazily
let prisma: any;

async function getPrismaClient() {
  if (!prisma) {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const prismaClient = await getPrismaClient();
    const { id } = req.query;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: '无效的 agent ID' });
    }

    const agentId = parseInt(id, 10);

    if (isNaN(agentId)) {
      return res.status(400).json({ error: '无效的 agent ID' });
    }

    // GET - Get single agent
    if (req.method === 'GET') {
      const agent = await prismaClient.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent 不存在' });
      }

      return res.json({
        ...agent,
        apiKey: agent.apiKey.length > 14
          ? `${agent.apiKey.slice(0, 10)}***${agent.apiKey.slice(-4)}`
          : '***',
      });
    }

    // PUT - Update agent
    if (req.method === 'PUT') {
      const { name, region, apiKey, status } = req.body;

      const updateData: any = {};
      if (name) updateData.name = name;
      if (region) {
        if (!['SG', 'CN'].includes(region)) {
          return res.status(400).json({ error: '无效的区域' });
        }
        updateData.region = region;
      }
      if (apiKey) updateData.apiKey = apiKey;
      if (status) updateData.status = status;

      const agent = await prismaClient.agent.update({
        where: { id: agentId },
        data: updateData,
      });

      return res.json({
        ...agent,
        apiKey: agent.apiKey.length > 14
          ? `${agent.apiKey.slice(0, 10)}***${agent.apiKey.slice(-4)}`
          : '***',
      });
    }

    // DELETE - Delete agent
    if (req.method === 'DELETE') {
      await prismaClient.agent.delete({
        where: { id: agentId },
      });

      return res.json({ success: true, message: 'Agent 已删除' });
    }

    return res.status(405).json({ error: '方法不允许' });
  } catch (error: any) {
    console.error('Agent Detail API Error:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Agent 不存在' });
    }

    return res.status(500).json({
      error: '服务器错误',
      message: error.message,
    });
  }
}

