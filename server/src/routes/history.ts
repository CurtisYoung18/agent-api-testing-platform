import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/history - Get test history with pagination and filters
router.get('/', async (req, res, next) => {
  try {
    const {
      page = '1',
      limit = '20',
      agentId,
      minSuccessRate,
      maxSuccessRate,
      sortBy = 'testDate',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};
    if (agentId) where.agentId = parseInt(agentId as string);
    if (minSuccessRate || maxSuccessRate) {
      where.successRate = {};
      if (minSuccessRate) where.successRate.gte = parseFloat(minSuccessRate as string);
      if (maxSuccessRate) where.successRate.lte = parseFloat(maxSuccessRate as string);
    }

    // Build orderBy
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder;

    // Get total count
    const total = await prisma.testHistory.count({ where });

    // Get paginated results
    const history = await prisma.testHistory.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            region: true,
          },
        },
      },
    });

    res.json({
      data: history,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/history/:id - Get single test history detail
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const history = await prisma.testHistory.findUnique({
      where: { id: parseInt(id) },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            region: true,
          },
        },
      },
    });

    if (!history) {
      return res.status(404).json({ error: 'Test history not found' });
    }

    res.json(history);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/history/:id - Delete test history
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.testHistory.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Test history deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/history/:id/download/:format - Download test report
router.get('/:id/download/:format', async (req, res, next) => {
  try {
    const { id, format } = req.params;

    const history = await prisma.testHistory.findUnique({
      where: { id: parseInt(id) },
    });

    if (!history) {
      return res.status(404).json({ error: 'Test history not found' });
    }

    // Return appropriate file based on format
    switch (format) {
      case 'excel':
        if (history.excelBlob) {
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', `attachment; filename="test_report_${id}.xlsx"`);
          res.send(history.excelBlob);
        } else {
          res.status(404).json({ error: 'Excel report not available' });
        }
        break;

      case 'markdown':
      case 'md':
        if (history.markdownBlob) {
          res.setHeader('Content-Type', 'text/markdown');
          res.setHeader('Content-Disposition', `attachment; filename="test_report_${id}.md"`);
          res.send(history.markdownBlob);
        } else {
          res.status(404).json({ error: 'Markdown report not available' });
        }
        break;

      case 'json':
        if (history.jsonData) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="test_report_${id}.json"`);
          res.json(history.jsonData);
        } else {
          res.status(404).json({ error: 'JSON report not available' });
        }
        break;

      default:
        res.status(400).json({ error: 'Invalid format. Use excel, markdown, or json' });
    }
  } catch (error) {
    next(error);
  }
});

export { router as historyRouter };

