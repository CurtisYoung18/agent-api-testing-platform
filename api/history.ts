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
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const prismaClient = await getPrismaClient();

    if (req.method === 'GET') {
      // Check both query and params for id (Express vs Vercel routing)
      const id = req.query.id || (req as any).params?.id;

      // If ID is provided, get single record
      if (id && !Array.isArray(id)) {
        const historyId = parseInt(id, 10);
        
        if (isNaN(historyId)) {
          return res.status(400).json({ error: '无效的历史记录 ID' });
        }

        const record = await prismaClient.testHistory.findUnique({
          where: { id: historyId },
          include: {
            agent: {
              select: { id: true, name: true, region: true, modelName: true },
            },
          },
        });

        if (!record) {
          return res.status(404).json({ error: '历史记录不存在' });
        }

        // Convert Decimal fields to numbers for JSON serialization
        const formattedRecord = {
          ...record,
          successRate: typeof record.successRate === 'number' ? record.successRate : parseFloat(record.successRate?.toString() || '0'),
          avgResponseTime: record.avgResponseTime ? (typeof record.avgResponseTime === 'number' ? record.avgResponseTime : parseFloat(record.avgResponseTime.toString())) : null,
          // Use agentName from record, fallback to agent.name if needed
          agentName: record.agentName || record.agent?.name || 'Unknown Agent',
        };

        return res.json(formattedRecord);
      }

      // Otherwise, get list with pagination
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const total = await prismaClient.testHistory.count();
      const history = await prismaClient.testHistory.findMany({
        orderBy: { testDate: 'desc' },
        skip,
        take: limit,
        include: {
          agent: {
            select: { id: true, name: true, region: true },
          },
        },
      });

      // Convert Decimal fields to numbers for JSON serialization
      const formattedHistory = history.map((record: any) => ({
        ...record,
        successRate: typeof record.successRate === 'number' ? record.successRate : parseFloat(record.successRate?.toString() || '0'),
        avgResponseTime: record.avgResponseTime ? (typeof record.avgResponseTime === 'number' ? record.avgResponseTime : parseFloat(record.avgResponseTime.toString())) : null,
      }));

      return res.json({
        data: formattedHistory,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    if (req.method === 'DELETE') {
      // Check both query and params for id (Express vs Vercel routing)
      const id = req.query.id || (req as any).params?.id;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: '无效的历史记录 ID' });
      }

      const historyId = parseInt(id, 10);

      if (isNaN(historyId)) {
        return res.status(400).json({ error: '无效的历史记录 ID' });
      }

      const history = await prismaClient.testHistory.findUnique({
        where: { id: historyId },
      });

      if (!history) {
        return res.status(404).json({ error: '历史记录不存在' });
      }

      await prismaClient.testHistory.delete({
        where: { id: historyId },
      });

      return res.json({ message: '删除成功' });
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
