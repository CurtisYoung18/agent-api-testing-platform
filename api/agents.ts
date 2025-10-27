import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
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

    if (req.method === 'POST') {
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

    return res.status(405).json({ error: '方法不允许' });
  } catch (error: any) {
    console.error('Agents API Error:', error);
    return res.status(500).json({ 
      error: '服务器错误',
      message: error.message 
    });
  }
}

