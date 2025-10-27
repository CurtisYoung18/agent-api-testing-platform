import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/agents - Get all agents
router.get('/', async (req, res, next) => {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: [
        { lastUsed: 'desc' },
        { name: 'asc' },
      ],
    });

    // Mask API keys for security (only show first 10 and last 4 chars)
    const maskedAgents = agents.map((agent) => ({
      ...agent,
      apiKey: agent.apiKey.length > 14
        ? `${agent.apiKey.slice(0, 10)}***${agent.apiKey.slice(-4)}`
        : '***',
      apiKeyFull: undefined, // Don't send full key
    }));

    res.json(maskedAgents);
  } catch (error) {
    next(error);
  }
});

// GET /api/agents/:id - Get single agent
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const agent = await prisma.agent.findUnique({
      where: { id: parseInt(id) },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Mask API key
    const maskedAgent = {
      ...agent,
      apiKey: agent.apiKey.length > 14
        ? `${agent.apiKey.slice(0, 10)}***${agent.apiKey.slice(-4)}`
        : '***',
    };

    res.json(maskedAgent);
  } catch (error) {
    next(error);
  }
});

// POST /api/agents - Create new agent
router.post('/', async (req, res, next) => {
  try {
    const { name, region, apiKey } = req.body;

    // Validation
    if (!name || !region || !apiKey) {
      return res.status(400).json({ error: 'Missing required fields: name, region, apiKey' });
    }

    if (!['SG', 'CN'].includes(region)) {
      return res.status(400).json({ error: 'Invalid region. Must be SG or CN' });
    }

    // Create agent
    const agent = await prisma.agent.create({
      data: {
        name,
        region,
        apiKey,
        status: 'active',
      },
    });

    // Mask API key in response
    const maskedAgent = {
      ...agent,
      apiKey: agent.apiKey.length > 14
        ? `${agent.apiKey.slice(0, 10)}***${agent.apiKey.slice(-4)}`
        : '***',
    };

    res.status(201).json(maskedAgent);
  } catch (error) {
    next(error);
  }
});

// PUT /api/agents/:id - Update agent
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, region, apiKey, status } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (region !== undefined) {
      if (!['SG', 'CN'].includes(region)) {
        return res.status(400).json({ error: 'Invalid region. Must be SG or CN' });
      }
      updateData.region = region;
    }
    if (apiKey !== undefined) updateData.apiKey = apiKey;
    if (status !== undefined) updateData.status = status;

    const agent = await prisma.agent.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    // Mask API key in response
    const maskedAgent = {
      ...agent,
      apiKey: agent.apiKey.length > 14
        ? `${agent.apiKey.slice(0, 10)}***${agent.apiKey.slice(-4)}`
        : '***',
    };

    res.json(maskedAgent);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/agents/:id - Delete agent
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.agent.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/agents/:id/test - Test agent connection
router.post('/:id/test', async (req, res, next) => {
  try {
    const { id } = req.params;

    const agent = await prisma.agent.findUnique({
      where: { id: parseInt(id) },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // TODO: Implement actual API connection test
    // For now, return mock success
    const isValid = agent.apiKey.startsWith('sk-');

    if (isValid) {
      // Update last used timestamp
      await prisma.agent.update({
        where: { id: parseInt(id) },
        data: { lastUsed: new Date() },
      });

      res.json({
        success: true,
        message: 'Connection successful',
        agentInfo: {
          name: agent.name,
          region: agent.region,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid API key format',
      });
    }
  } catch (error) {
    next(error);
  }
});

export { router as agentsRouter };

