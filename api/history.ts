import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
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

    return res.status(405).json({ error: '方法不允许' });
  } catch (error: any) {
    console.error('History API Error:', error);
    return res.status(500).json({ 
      error: '服务器错误',
      message: error.message 
    });
  }
}

