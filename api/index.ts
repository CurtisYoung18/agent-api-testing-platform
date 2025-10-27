import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /api/agents
app.get('/api/agents', async (req, res) => {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: [{ lastUsed: 'desc' }, { name: 'asc' }],
    });

    const maskedAgents = agents.map((agent) => ({
      ...agent,
      apiKey: agent.apiKey.length > 14
        ? `${agent.apiKey.slice(0, 10)}***${agent.apiKey.slice(-4)}`
        : '***',
    }));

    res.json(maskedAgents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/agents
app.post('/api/agents', async (req, res) => {
  try {
    const { name, region, apiKey } = req.body;

    if (!name || !region || !apiKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['SG', 'CN'].includes(region)) {
      return res.status(400).json({ error: 'Invalid region' });
    }

    const agent = await prisma.agent.create({
      data: { name, region, apiKey, status: 'active' },
    });

    res.status(201).json({
      ...agent,
      apiKey: `${agent.apiKey.slice(0, 10)}***${agent.apiKey.slice(-4)}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/history
app.get('/api/history', async (req, res) => {
  try {
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

    res.json({
      data: history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;

